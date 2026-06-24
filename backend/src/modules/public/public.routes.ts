// kuhik-core/backend/src/modules/public/public.routes.ts
// Public routes — no JWT auth required
// MUST be registered before any addHook('preHandler', app.authenticate) calls

import { FastifyInstance } from 'fastify';

export async function registerPublicRoutes(app: FastifyInstance): Promise<void> {
  // GET /api/health — health check
  app.get('/api/health', async () => ({
    status: 'ok',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  }));
}