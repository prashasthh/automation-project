// Load .env BEFORE any other import. ES module imports are hoisted and evaluated
// first, so service modules (apify, kie-*) that read process.env at their top level
// must not be imported until dotenv has populated it. A side-effect import runs in
// source order, guaranteeing .env is loaded before the imports below evaluate.
import 'dotenv/config';

import Fastify from 'fastify';
import cors from '@fastify/cors';
import staticPlugin from '@fastify/static';
import path from 'path';
import fs from 'fs';

import searchesRoutes from './routes/searches.js';
import generateRoutes from './routes/generate.js';
import iterateRoutes from './routes/iterate.js';
import callbackRoutes from './routes/callback.js';
import insightsRoutes from './routes/insights.js';
import exportRoutes from './routes/export.js';

const PORT = parseInt(process.env.PORT ?? '3001', 10);

// Ensure uploads directory exists
const uploadsDir = path.join(import.meta.dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const server = Fastify({
  logger: {
    transport: {
      target: 'pino-pretty',
      options: { colorize: true, translateTime: 'SYS:HH:MM:ss', ignore: 'pid,hostname' },
    },
  },
});

async function bootstrap() {
  // CORS — allow frontend dev server
  await server.register(cors, {
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  });

  // Serve generated images
  await server.register(staticPlugin, {
    root: uploadsDir,
    prefix: '/uploads/',
  });

  // Health check
  server.get('/api/health', async () => ({ ok: true, ts: Date.now() }));

  // Routes
  await server.register(searchesRoutes, { prefix: '/api' });
  await server.register(generateRoutes, { prefix: '/api' });
  await server.register(iterateRoutes, { prefix: '/api' });
  await server.register(callbackRoutes, { prefix: '/api' });
  await server.register(insightsRoutes, { prefix: '/api' });
  await server.register(exportRoutes, { prefix: '/api' });

  await server.listen({ port: PORT, host: '0.0.0.0' });
  console.log(`\n🔥 AdForge backend running at http://localhost:${PORT}\n`);
}

bootstrap().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
