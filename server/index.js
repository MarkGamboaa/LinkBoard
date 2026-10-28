import 'dotenv/config';
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
});

app.addHook('onRequest', async (request, reply) => {
  if (request.method === 'OPTIONS' || request.url === '/' || request.url === '/api/test' || request.url === '/api/health' || request.url === '/api/boards/public') {
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

function serializeBoard(board) {
  return {
    ...board,
    _id: board.id,
    userId: board.ownerUid,
    userEmail: board.ownerEmail,
    order: board.sortOrder,
    links: (board.links || []).map(serializeLink),
  };
}

function normalizeLinks(links) {
  if (!Array.isArray(links)) return null;
  return links.map((link, position) => ({
    title: String(link?.title || '').trim(),
    url: String(link?.url || '').trim(),
    color: typeof link?.color === 'string' ? link.color : null,
    position,
  }));
}

async function getBoard(id, ownerUid) {
  const board = await prisma.board.findFirst({
    where: { id, ownerUid },
    include: { links: { orderBy: { position: 'asc' } } },
  });
  return board ? serializeBoard(board) : null;
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
    where: { ownerUid: request.user.uid },
    include: { links: { orderBy: { position: 'asc' } } },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
  });
  return boards.map(serializeBoard);
});

app.get('/api/boards/public', async () => {
  const boards = await prisma.board.findMany({
    where: { isPublic: true },
    include: { links: { orderBy: { position: 'asc' } } },
    orderBy: { createdAt: 'desc' },
  });
  return boards.map(serializeBoard);
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
  return reply.code(201).send(serializeBoard(board));
});

app.put('/api/boards/:id', async (request, reply) => {
  const { id } = request.params;
  const existing = await prisma.board.findFirst({ where: { id, ownerUid: request.user.uid } });
  if (!existing) return reply.code(404).send({ error: 'Board not found' });

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
    await tx.board.update({ where: { id }, data });
    if (links) {
      await tx.link.deleteMany({ where: { boardId: id } });
      if (links.length) {
        await tx.link.createMany({ data: links.map((link) => ({ ...link, boardId: id })) });
      }
    }
    return tx.board.findUnique({
      where: { id },
      include: { links: { orderBy: { position: 'asc' } } },
    });
  });
  return serializeBoard(updated);
});

app.delete('/api/boards/:id', async (request, reply) => {
  const result = await prisma.board.deleteMany({
    where: { id: request.params.id, ownerUid: request.user.uid },
  });
  if (!result.count) return reply.code(404).send({ error: 'Board not found' });
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
