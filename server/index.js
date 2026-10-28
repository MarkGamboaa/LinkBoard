import 'dotenv/config';
import { createHash, randomBytes } from 'node:crypto';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from './generated/prisma/client.ts';

const port = Number(process.env.PORT || 3001);
const databaseUrl = process.env.DATABASE_URL;
const projectId = process.env.FIREBASE_PROJECT_ID || 'linkboard-5af54';

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required. Copy server/.env.example to server/.env and set your PostgreSQL connection URL.');
}

const firebaseServiceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_JSON
  ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)
  : null;

const firebaseApp = getApps()[0] || initializeApp({
  credential: firebaseServiceAccount ? cert(firebaseServiceAccount) : applicationDefault(),
  projectId,
});

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl }),
});

const app = Fastify({ logger: true });

await app.register(cors, {
  origin: process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map((origin) => origin.trim())
    : true,
  methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE'],
});

app.addHook('onRequest', async (request, reply) => {
  if (request.method === 'OPTIONS' || request.url === '/' || request.url === '/api/test' || request.url === '/api/health' || request.url === '/api/boards/public' || (request.method === 'GET' && request.url.startsWith('/api/invites/'))) {
    return;
  }

  const authorization = request.headers.authorization;
  if (!authorization?.startsWith('Bearer ')) {
    return reply.code(401).send({ error: 'A Firebase sign-in token is required' });
  }

  try {
    const decodedToken = await getAuth(firebaseApp).verifyIdToken(authorization.slice(7));
    request.user = { uid: decodedToken.uid, email: decodedToken.email || null };
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

function normalizeLinks(links) {
  if (!Array.isArray(links)) return null;
  return links.map((link, position) => ({
    title: String(link?.title || '').trim(),
    url: safeMetadataUrl(link?.url) || '',
    color: typeof link?.color === 'string' ? link.color : null,
    position,
    tags: Array.isArray(link?.tags)
      ? [...new Set(link.tags.map((tag) => String(tag).trim().toLowerCase()).filter(Boolean))].slice(0, 20)
      : [],
    note: typeof link?.note === 'string' && link.note.trim() ? link.note.trim().slice(0, 2000) : null,
    siteTitle: typeof link?.siteTitle === 'string' ? link.siteTitle.trim().slice(0, 300) || null : null,
    description: typeof link?.description === 'string' ? link.description.trim().slice(0, 1000) || null : null,
    previewImageUrl: safeMetadataUrl(link?.previewImageUrl),
    faviconUrl: safeMetadataUrl(link?.faviconUrl),
  }));
}

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
  return boards.map((board) => serializeBoard(board, request.user.uid));
});

app.get('/api/boards/public', async () => {
  const boards = await prisma.board.findMany({
    where: { isPublic: true },
    include: { links: { orderBy: { position: 'asc' } } },
    orderBy: { createdAt: 'desc' },
  });
  return boards.map((board) => serializeBoard(board));
});

app.post('/api/boards', async (request, reply) => {
  const title = String(request.body?.title || '').trim();
  if (!title) return reply.code(400).send({ error: 'Board title is required' });

  const links = normalizeLinks(request.body?.links || []);
  if (!links) return reply.code(400).send({ error: 'Links must be an array' });

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
    data.title = title;
  }
  if (typeof request.body?.isPublic === 'boolean') data.isPublic = request.body.isPublic;
  if (Number.isInteger(request.body?.order)) data.sortOrder = request.body.order;

  const links = request.body?.links === undefined ? undefined : normalizeLinks(request.body.links);
  if (request.body?.links !== undefined && !links) {
    return reply.code(400).send({ error: 'Links must be an array' });
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

app.delete('/api/boards/:id', async (request, reply) => {
  const result = await prisma.board.deleteMany({
    where: { id: request.params.id, ownerUid: request.user.uid },
  });
  if (!result.count) return reply.code(404).send({ error: 'Board not found' });
  return { success: true };
});

app.post('/api/boards/:id/invites', async (request, reply) => {
  const board = await prisma.board.findUnique({ where: { id: request.params.id } });
  if (!board || board.ownerUid !== request.user.uid) {
    return reply.code(404).send({ error: 'Board not found' });
  }

  const email = String(request.body?.email || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return reply.code(400).send({ error: 'Enter a valid email address' });
  }
  if (email === String(board.ownerEmail || '').toLowerCase()) {
    return reply.code(400).send({ error: 'You already own this board' });
  }
  const existingMember = await prisma.boardMember.findFirst({ where: { boardId: board.id, email } });
  if (existingMember) return reply.code(409).send({ error: 'This person already has access' });

  await prisma.boardInvite.deleteMany({ where: { boardId: board.id, email, acceptedAt: null } });
  const token = randomBytes(32).toString('base64url');
  const tokenHash = createHash('sha256').update(token).digest('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await prisma.boardInvite.create({
    data: { boardId: board.id, email, tokenHash, invitedByUid: request.user.uid, expiresAt },
  });
  return reply.code(201).send({ token, expiresAt, boardTitle: board.title });
});

app.get('/api/invites/:token', async (request, reply) => {
  const tokenHash = createHash('sha256').update(request.params.token).digest('hex');
  const invite = await prisma.boardInvite.findUnique({
    where: { tokenHash },
    include: { board: { select: { title: true } } },
  });
  if (!invite || invite.acceptedAt || invite.expiresAt <= new Date()) {
    return reply.code(404).send({ error: 'This invite is invalid, expired, or already used' });
  }
  return { boardTitle: invite.board.title, expiresAt: invite.expiresAt };
});

app.post('/api/invites/:token/accept', async (request, reply) => {
  const tokenHash = createHash('sha256').update(request.params.token).digest('hex');
  const invite = await prisma.boardInvite.findUnique({ where: { tokenHash } });
  if (!invite || invite.acceptedAt || invite.expiresAt <= new Date()) {
    return reply.code(404).send({ error: 'This invite is invalid, expired, or already used' });
  }

  const userEmail = String(request.user.email || '').trim().toLowerCase();
  if (!userEmail || userEmail !== invite.email) {
    return reply.code(403).send({ error: 'Sign in with the email address this invite was sent to' });
  }

  await prisma.$transaction([
    prisma.boardMember.upsert({
      where: { boardId_userUid: { boardId: invite.boardId, userUid: request.user.uid } },
      create: { boardId: invite.boardId, userUid: request.user.uid, email: userEmail },
      update: { email: userEmail },
    }),
    prisma.boardInvite.update({ where: { id: invite.id }, data: { acceptedAt: new Date() } }),
  ]);
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
  if (!firstName || !lastName) {
    return reply.code(400).send({ error: 'First name and last name are required' });
  }

  const displayName = `${firstName} ${lastName}`;
  const profile = await prisma.userProfile.upsert({
    where: { firebaseUid: request.user.uid },
    create: {
      firebaseUid: request.user.uid,
      email: request.user.email,
      firstName,
      lastName,
      displayName,
    },
    update: {
      email: request.user.email,
      firstName,
      lastName,
      displayName,
      updatedAt: new Date(),
    },
  });
  return { ...profile, userId: profile.firebaseUid };
});

app.delete('/api/profile', async (request) => {
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
