import 'dotenv/config';
import { createHash, randomBytes } from 'node:crypto';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from './generated/prisma/client.ts';

const port = Number(process.env.PORT || 3001);
const databaseUrl = process.env.DATABASE_URL;
const firebaseProjectId = process.env.FIREBASE_PROJECT_ID || 'linkboard-5af54';

if (!databaseUrl) throw new Error('DATABASE_URL is required.');
const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_JSON
  ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)
  : null;
const firebaseApp = getApps()[0] || initializeApp({
  credential: serviceAccount ? cert(serviceAccount) : applicationDefault(),
  projectId: firebaseProjectId,
});

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl }),
});

// Render sits behind a proxy; without this every visitor shares the proxy's IP and one rate-limit bucket.
// shortcut: trusting all hops lets a client spoof X-Forwarded-For to dodge the limit; set the exact hop count if abuse shows up.
const app = Fastify({ logger: true, trustProxy: true });

await app.register(cors, {
  origin: process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map((origin) => origin.trim())
    : true,
  methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE'],
});

// Per-IP cap, well above what a person clicking around the dashboard sends.
await app.register(rateLimit, { max: 300, timeWindow: '1 minute' });

// Public boards change rarely but are the heaviest read; any write clears the copy so owners see changes at once.
const PUBLIC_CACHE_MS = 30_000;
let publicBoardsCache = null;
app.addHook('onResponse', async (request) => {
  if (request.method !== 'GET' && request.method !== 'HEAD' && request.method !== 'OPTIONS') publicBoardsCache = null;
});

app.addHook('onRequest', async (request, reply) => {
  const isPublicBoardList = request.method === 'GET' && request.url.split('?')[0] === '/api/boards/public';
  if (request.method === 'OPTIONS' || request.url === '/' || request.url === '/api/test' || request.url === '/api/health' || (request.method === 'GET' && request.url.startsWith('/api/invites/'))) {
    return;
  }

  const authorization = request.headers.authorization;
  if (isPublicBoardList && !authorization) return;
  if (!authorization?.startsWith('Bearer ')) {
    return reply.code(401).send({ error: 'A Firebase sign-in token is required' });
  }

  try {
    const decodedToken = await getAuth(firebaseApp).verifyIdToken(authorization.slice(7));
    request.user = {
      uid: decodedToken.uid,
      email: decodedToken.email || null,
    };
  } catch (error) {
    request.log.warn({ err: error }, 'Firebase token verification failed');
    return reply.code(401).send({ error: 'Invalid or expired sign-in token' });
  }
});

function serializeLink(link) {
  return { ...link, _id: link.id };
}

function serializeBoard(board, userUid = null) {
  return {
    ...board,
    _id: board.id,
    userId: board.ownerUid,
    userEmail: board.ownerEmail,
    order: board.sortOrder,
    isOwner: userUid ? board.ownerUid === userUid : false,
    links: (board.links || []).map(serializeLink),
  };
}

function safeMetadataUrl(value) {
  if (typeof value !== 'string' || !value.trim()) return null;
  try {
    const url = new URL(value.trim());
    return ['http:', 'https:'].includes(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
}

const MAX_BOARD_TITLE_LENGTH = 100;
const MAX_LINKS_PER_BOARD = 200;
const PUBLIC_BOARD_LIMIT = 50;

function linksError(links) {
  if (!links) return 'Links must be an array';
  if (links.length > MAX_LINKS_PER_BOARD) return `A board can have at most ${MAX_LINKS_PER_BOARD} links`;
  return null;
}

const optionalText = (value, max) => (typeof value === 'string' ? value.trim().slice(0, max) || null : null);

const LINK_FIELDS = {
  title: (link) => String(link?.title || '').trim().slice(0, 300),
  url: (link) => safeMetadataUrl(link?.url) || '',
  tags: (link) => (Array.isArray(link?.tags)
    ? [...new Set(link.tags.map((tag) => String(tag).trim().toLowerCase()).filter(Boolean))].slice(0, 20)
    : []),
  note: (link) => optionalText(link?.note, 2000),
  siteTitle: (link) => optionalText(link?.siteTitle, 300),
  description: (link) => optionalText(link?.description, 1000),
  previewImageUrl: (link) => safeMetadataUrl(link?.previewImageUrl),
  faviconUrl: (link) => safeMetadataUrl(link?.faviconUrl),
};

// partial: only fields present in the input are returned (PATCH). Per-link colors are retired and never saved.
function linkFields(link, { partial = false } = {}) {
  const data = {};
  for (const [key, normalize] of Object.entries(LINK_FIELDS)) {
    if (!partial || Object.hasOwn(link ?? {}, key)) data[key] = normalize(link);
  }
  return data;
}

function normalizeLinks(links) {
  if (!Array.isArray(links)) return null;
  return links.map((link, position) => ({ ...linkFields(link), position }));
}

// Owners and invited collaborators can edit a board's links.
async function findEditableBoard(boardId, userUid) {
  const board = await prisma.board.findUnique({
    where: { id: boardId },
    select: { id: true, ownerUid: true, members: { where: { userUid }, select: { userUid: true } } },
  });
  if (!board || (board.ownerUid !== userUid && board.members.length === 0)) return null;
  return board;
}

const isPlainObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

app.get('/', async () => ({ message: 'LinkBoard API is running', status: 'healthy' }));

app.get('/api/test', async () => ({ message: 'Server is running', timestamp: new Date().toISOString() }));

app.get('/api/health', async (_request, reply) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { status: 'healthy', database: 'connected' };
  } catch (error) {
    reply.code(503);
    return { status: 'unavailable', database: 'disconnected' };
  }
});

app.get('/api/boards', async (request) => {
  const boards = await prisma.board.findMany({
    where: {
      OR: [
        { ownerUid: request.user.uid },
        { members: { some: { userUid: request.user.uid } } },
      ],
    },
    include: {
      links: { orderBy: { position: 'asc' } },
      members: { select: { userUid: true, email: true, createdAt: true } },
    },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
  });
  const ownerProfiles = await prisma.userProfile.findMany({
    where: { firebaseUid: { in: [...new Set(boards.map((board) => board.ownerUid))] } },
    select: { firebaseUid: true, nickname: true },
  });
  const ownerNicknames = new Map(ownerProfiles.map((profile) => [profile.firebaseUid, profile.nickname?.trim()]));
  const memberUids = [...new Set(boards.flatMap((board) => board.members.map((member) => member.userUid)))];
  const memberProfiles = await prisma.userProfile.findMany({
    where: { firebaseUid: { in: memberUids } },
    select: { firebaseUid: true, nickname: true },
  });
  const memberNicknames = new Map(memberProfiles.map((profile) => [profile.firebaseUid, profile.nickname?.trim()]));
  return boards.map((board) => ({
    ...serializeBoard(board, request.user.uid),
    members: board.members.map((member) => ({
      ...member,
      nickname: memberNicknames.get(member.userUid) || null,
    })),
    ownerName: ownerNicknames.get(board.ownerUid) || 'Board owner',
  }));
});

app.get('/api/boards/public', async (request) => {
  if (!publicBoardsCache || Date.now() - publicBoardsCache.at > PUBLIC_CACHE_MS) {
    publicBoardsCache = { at: Date.now(), boards: await loadPublicBoards() };
  }
  // isOwner depends on the viewer, so it is added per request on top of the shared copy.
  return publicBoardsCache.boards.map(({ ownerUid, ...board }) => ({ ...board, isOwner: request.user?.uid === ownerUid }));
});

async function loadPublicBoards() {
  const boards = await prisma.board.findMany({
    where: { isPublic: true },
    include: { links: { orderBy: { position: 'asc' } } },
    orderBy: { createdAt: 'desc' },
    take: PUBLIC_BOARD_LIMIT,
  });
  const ownerProfiles = await prisma.userProfile.findMany({
    where: { firebaseUid: { in: [...new Set(boards.map((board) => board.ownerUid))] } },
    select: { firebaseUid: true, nickname: true },
  });
  const ownerNicknames = new Map(ownerProfiles.map((profile) => [profile.firebaseUid, profile.nickname?.trim()]));
  return boards.map((board) => ({
    _id: board.id,
    title: board.title,
    ownerNickname: ownerNicknames.get(board.ownerUid) || 'LinkBoards user',
    ownerUid: board.ownerUid,
    links: (board.links || []).map(serializeLink),
  }));
}

app.post('/api/boards/:id/copy', async (request, reply) => {
  const sourceBoard = await prisma.board.findFirst({
    where: { id: request.params.id, isPublic: true },
    include: { links: { orderBy: { position: 'asc' } } },
  });
  if (!sourceBoard) return reply.code(404).send({ error: 'This public board is no longer available' });
  if (sourceBoard.ownerUid === request.user.uid) {
    return reply.code(403).send({ error: 'You cannot copy your own public board' });
  }

  const copiedBoard = await prisma.board.create({
    data: {
      title: sourceBoard.title,
      ownerUid: request.user.uid,
      ownerEmail: request.user.email,
      isPublic: false,
      links: {
        create: sourceBoard.links.map((link) => ({
          title: link.title,
          url: link.url,
          color: link.color,
          position: link.position,
          tags: link.tags,
          note: link.note,
          siteTitle: link.siteTitle,
          description: link.description,
          previewImageUrl: link.previewImageUrl,
          faviconUrl: link.faviconUrl,
        })),
      },
    },
    include: {
      links: { orderBy: { position: 'asc' } },
      members: { select: { userUid: true, email: true, createdAt: true } },
    },
  });
  return reply.code(201).send(serializeBoard(copiedBoard, request.user.uid));
});

app.post('/api/boards', async (request, reply) => {
  const title = String(request.body?.title || '').trim();
  if (!title) return reply.code(400).send({ error: 'Board title is required' });
  if (title.length > MAX_BOARD_TITLE_LENGTH) return reply.code(400).send({ error: `Board title must be ${MAX_BOARD_TITLE_LENGTH} characters or fewer` });

  const links = normalizeLinks(request.body?.links || []);
  const linkProblem = linksError(links);
  if (linkProblem) return reply.code(400).send({ error: linkProblem });

  const board = await prisma.board.create({
    data: {
      title,
      ownerUid: request.user.uid,
      ownerEmail: request.user.email,
      links: { create: links },
    },
    include: { links: { orderBy: { position: 'asc' } } },
  });
  return reply.code(201).send(serializeBoard(board, request.user.uid));
});

app.put('/api/boards/:id', async (request, reply) => {
  const { id } = request.params;
  const existing = await prisma.board.findUnique({ where: { id }, include: { members: true } });
  const isOwner = existing?.ownerUid === request.user.uid;
  const isMember = existing?.members.some((member) => member.userUid === request.user.uid);
  if (!existing || (!isOwner && !isMember)) return reply.code(404).send({ error: 'Board not found' });
  if (!isOwner && (typeof request.body?.title === 'string' || typeof request.body?.isPublic === 'boolean' || Number.isInteger(request.body?.order))) {
    return reply.code(403).send({ error: 'Only the board owner can change board settings' });
  }

  const data = {};
  if (typeof request.body?.title === 'string') {
    const title = request.body.title.trim();
    if (!title) return reply.code(400).send({ error: 'Board title cannot be empty' });
    if (title.length > MAX_BOARD_TITLE_LENGTH) return reply.code(400).send({ error: `Board title must be ${MAX_BOARD_TITLE_LENGTH} characters or fewer` });
    data.title = title;
  }
  if (typeof request.body?.isPublic === 'boolean') data.isPublic = request.body.isPublic;
  if (Number.isInteger(request.body?.order)) data.sortOrder = request.body.order;

  const links = request.body?.links === undefined ? undefined : normalizeLinks(request.body.links);
  if (request.body?.links !== undefined) {
    const linkProblem = linksError(links);
    if (linkProblem) return reply.code(400).send({ error: linkProblem });
  }
  if (links?.some((link) => !link.title || !link.url)) {
    return reply.code(400).send({ error: 'Each link needs a title and URL' });
  }

  const updated = await prisma.$transaction(async (tx) => {
    if (Object.keys(data).length > 0) await tx.board.update({ where: { id }, data });
    if (links) {
      await tx.link.deleteMany({ where: { boardId: id } });
      if (links.length) {
        await tx.link.createMany({ data: links.map((link) => ({ ...link, boardId: id })) });
      }
    }
    return tx.board.findUnique({
      where: { id },
      include: { links: { orderBy: { position: 'asc' } }, members: true },
    });
  });
  return serializeBoard(updated, request.user.uid);
});

app.post('/api/boards/:id/links', async (request, reply) => {
  if (!isPlainObject(request.body)) return reply.code(400).send({ error: 'Send the link as a JSON object' });
  const board = await findEditableBoard(request.params.id, request.user.uid);
  if (!board) return reply.code(404).send({ error: 'Board not found' });

  const data = linkFields(request.body);
  if (!data.title || !data.url) return reply.code(400).send({ error: 'Each link needs a title and an http(s) URL' });

  const link = await prisma.$transaction(async (tx) => {
    const { _count, _max } = await tx.link.aggregate({ where: { boardId: board.id }, _count: true, _max: { position: true } });
    if (_count >= MAX_LINKS_PER_BOARD) return null;
    return tx.link.create({ data: { ...data, boardId: board.id, position: (_max.position ?? -1) + 1 } });
  });
  if (!link) return reply.code(400).send({ error: `A board can have at most ${MAX_LINKS_PER_BOARD} links` });
  return reply.code(201).send(serializeLink(link));
});

app.patch('/api/boards/:id/links/:linkId', async (request, reply) => {
  if (!isPlainObject(request.body)) return reply.code(400).send({ error: 'Send the changes as a JSON object' });
  const board = await findEditableBoard(request.params.id, request.user.uid);
  if (!board) return reply.code(404).send({ error: 'Board not found' });

  const data = linkFields(request.body, { partial: true });
  if (('title' in data && !data.title) || ('url' in data && !data.url)) {
    return reply.code(400).send({ error: 'Each link needs a title and an http(s) URL' });
  }
  // updateMany scopes the write to this board, so a link id from another board is a 404, not an edit.
  const result = await prisma.link.updateMany({ where: { id: request.params.linkId, boardId: board.id }, data });
  if (!result.count) return reply.code(404).send({ error: 'This link no longer exists. Refresh to see the latest board.' });
  return serializeLink(await prisma.link.findUnique({ where: { id: request.params.linkId } }));
});

app.delete('/api/boards/:id/links/:linkId', async (request, reply) => {
  const board = await findEditableBoard(request.params.id, request.user.uid);
  if (!board) return reply.code(404).send({ error: 'Board not found' });
  // Deleting a link someone else already removed is not an error for the user.
  await prisma.link.deleteMany({ where: { id: request.params.linkId, boardId: board.id } });
  return { success: true };
});

app.put('/api/boards/:id/links/order', async (request, reply) => {
  const ids = request.body?.ids;
  if (!Array.isArray(ids) || ids.some((id) => typeof id !== 'string')) {
    return reply.code(400).send({ error: 'Send the new order as { ids: [...] }' });
  }
  const board = await findEditableBoard(request.params.id, request.user.uid);
  if (!board) return reply.code(404).send({ error: 'Board not found' });

  const saved = await prisma.$transaction(async (tx) => {
    const current = await tx.link.findMany({ where: { boardId: board.id }, select: { id: true } });
    const currentIds = new Set(current.map((link) => link.id));
    // A collaborator added or removed a link since this list was loaded: refuse rather than guess.
    if (ids.length !== currentIds.size || new Set(ids).size !== ids.length || ids.some((id) => !currentIds.has(id))) return false;
    await Promise.all(ids.map((id, position) => tx.link.update({ where: { id }, data: { position } })));
    return true;
  });
  if (!saved) return reply.code(409).send({ error: 'This board changed while you were reordering. Refresh and try again.' });
  return { success: true };
});

app.delete('/api/boards/:id', async (request, reply) => {
  const result = await prisma.board.deleteMany({
    where: { id: request.params.id, ownerUid: request.user.uid },
  });
  if (!result.count) return reply.code(404).send({ error: 'Board not found' });
  return { success: true };
});

app.delete('/api/boards/:id/leave', async (request, reply) => {
  const membership = await prisma.boardMember.findUnique({
    where: { boardId_userUid: { boardId: request.params.id, userUid: request.user.uid } },
    select: { boardId: true },
  });
  if (!membership) return reply.code(404).send({ error: 'Board membership not found' });
  await prisma.boardMember.delete({
    where: { boardId_userUid: { boardId: request.params.id, userUid: request.user.uid } },
  });
  return { success: true };
});

app.post('/api/boards/:id/invites', async (request, reply) => {
  const board = await prisma.board.findUnique({ where: { id: request.params.id } });
  if (!board || board.ownerUid !== request.user.uid) {
    return reply.code(404).send({ error: 'Board not found' });
  }

  const token = randomBytes(32).toString('base64url');
  const tokenHash = createHash('sha256').update(token).digest('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await prisma.boardInvite.create({
    data: { boardId: board.id, tokenHash, invitedByUid: request.user.uid, expiresAt },
  });

  return reply.code(201).send({ token, expiresAt });
});

app.get('/api/invites/:token', async (request, reply) => {
  const tokenHash = createHash('sha256').update(request.params.token).digest('hex');
  const invite = await prisma.boardInvite.findUnique({
    where: { tokenHash },
    include: { board: { select: { title: true, ownerUid: true } } },
  });
  if (!invite || invite.acceptedAt || invite.expiresAt <= new Date()) {
    return reply.code(404).send({ error: 'This invite is invalid, expired, or already used' });
  }
  const ownerProfile = await prisma.userProfile.findUnique({
    where: { firebaseUid: invite.board.ownerUid },
    select: { nickname: true },
  });
  return {
    boardTitle: invite.board.title,
    ownerName: ownerProfile?.nickname?.trim() || 'Board owner',
    expiresAt: invite.expiresAt,
  };
});

app.post('/api/invites/:token/accept', async (request, reply) => {
  const tokenHash = createHash('sha256').update(request.params.token).digest('hex');
  const invite = await prisma.boardInvite.findUnique({
    where: { tokenHash },
    include: { board: { select: { ownerUid: true } } },
  });
  if (!invite || invite.acceptedAt || invite.expiresAt <= new Date()) {
    return reply.code(404).send({ error: 'This invite is invalid, expired, or already used' });
  }
  if (invite.board.ownerUid === request.user.uid) {
    return reply.code(400).send({ error: 'You already own this board' });
  }

  const userEmail = String(request.user.email || '').trim().toLowerCase();

  const accepted = await prisma.$transaction(async (tx) => {
    // Claim the invite atomically so two people can't both use one link.
    const claim = await tx.boardInvite.updateMany({
      where: { id: invite.id, acceptedAt: null },
      data: { acceptedAt: new Date() },
    });
    if (!claim.count) return false;
    await tx.boardMember.upsert({
      where: { boardId_userUid: { boardId: invite.boardId, userUid: request.user.uid } },
      create: { boardId: invite.boardId, userUid: request.user.uid, email: userEmail },
      update: { email: userEmail },
    });
    return true;
  });
  if (!accepted) return reply.code(404).send({ error: 'This invite is invalid, expired, or already used' });
  return { success: true, boardId: invite.boardId };
});

app.delete('/api/boards/:id/members/:userUid', async (request, reply) => {
  const board = await prisma.board.findUnique({ where: { id: request.params.id } });
  if (!board || board.ownerUid !== request.user.uid) {
    return reply.code(404).send({ error: 'Board not found' });
  }
  if (request.params.userUid === board.ownerUid) {
    return reply.code(400).send({ error: 'The board owner cannot be removed' });
  }
  await prisma.boardMember.deleteMany({
    where: { boardId: board.id, userUid: request.params.userUid },
  });
  return { success: true };
});

app.delete('/api/boards', async (request) => {
  const result = await prisma.board.deleteMany({ where: { ownerUid: request.user.uid } });
  return { success: true, deletedCount: result.count };
});

app.get('/api/profile', async (request, reply) => {
  const profile = await prisma.userProfile.findUnique({ where: { firebaseUid: request.user.uid } });
  if (!profile) return reply.code(404).send({ error: 'Profile not found' });
  return { ...profile, userId: profile.firebaseUid };
});

app.post('/api/profile', async (request, reply) => {
  const firstName = String(request.body?.firstName || '').trim();
  const lastName = String(request.body?.lastName || '').trim();
  const nickname = request.body?.nickname === undefined
    ? undefined
    : String(request.body.nickname || '').trim();
  if (!firstName || !lastName) {
    return reply.code(400).send({ error: 'First name and last name are required' });
  }
  if (nickname !== undefined && (nickname.length < 2 || nickname.length > 24)) {
    return reply.code(400).send({ error: 'Nickname must be between 2 and 24 characters' });
  }

  const displayName = `${firstName} ${lastName}`;
  const profile = await prisma.userProfile.upsert({
    where: { firebaseUid: request.user.uid },
    create: {
      firebaseUid: request.user.uid,
      email: request.user.email,
      firstName,
      lastName,
      nickname: nickname ?? null,
      displayName,
    },
    update: {
      email: request.user.email,
      firstName,
      lastName,
      ...(nickname !== undefined ? { nickname } : {}),
      displayName,
      updatedAt: new Date(),
    },
  });
  return { ...profile, userId: profile.firebaseUid };
});

app.delete('/api/profile', async (request) => {
  await prisma.boardMember.deleteMany({ where: { userUid: request.user.uid } });
  await prisma.userProfile.deleteMany({ where: { firebaseUid: request.user.uid } });
  return { success: true, message: 'Profile deleted successfully' };
});

app.setErrorHandler((error, request, reply) => {
  request.log.error({ err: error }, 'API request failed');
  reply.code(error.statusCode && error.statusCode < 500 ? error.statusCode : 500).send({
    error: error.statusCode && error.statusCode < 500 ? error.message : 'Internal server error',
  });
});

try {
  await prisma.$connect();
  await app.listen({ port, host: '0.0.0.0' });
  app.log.info(`LinkBoard API listening on port ${port}`);
} catch (error) {
  app.log.error(error);
  await prisma.$disconnect();
  process.exit(1);
}

const shutdown = async () => {
  await app.close();
  await prisma.$disconnect();
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
