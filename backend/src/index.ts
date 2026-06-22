// kuhik-core/backend/src/index.ts
// Kuhik — Fastify Backend Server
// API-first, modular monolith, domain-driven modules

import Fastify from 'fastify';
import fjwt from '@fastify/jwt';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { PrismaClient } from '@prisma/client';
import { config } from './config.js';
import { registerAuthPlugin } from './plugins/auth.js';
import { registerErrorHandler } from './plugins/error-handler.js';
import { registerQueuePlugin } from './plugins/queues.js';
import { registerAuthRoutes } from './modules/auth/auth.routes.js';
import { registerOrganizationRoutes } from './modules/organizations/organization.routes.js';
import { registerBuildingRoutes } from './modules/buildings/building.routes.js';
import { registerApartmentRoutes } from './modules/apartments/apartment.routes.js';
import { registerPersonRoutes } from './modules/people/person.routes.js';
import { registerMeterRoutes } from './modules/apartment-meters/meter.routes.js';
import { registerReadingRoutes } from './modules/meter-readings/reading.routes.js';
import { registerCostRoutes } from './modules/utility-costs/cost.routes.js';
import { registerAllocationRoutes } from './modules/allocation/allocation.routes.js';
import { registerInvoiceRoutes } from './modules/invoices/invoices.routes.js';

// Initialize Prisma
export const prisma = new PrismaClient();

// Build Fastify instance
const app = Fastify({
  logger: {
    transport: {
      target: 'pino-pretty',
      options: { colorize: true, translateTime: 'HH:MM:ss' },
    },
  },
});

async function bootstrap(): Promise<void> {
  // ============================================================
  // PLUGINS
  // ============================================================

  // CORS
  await app.register(cors, {
    origin: config.corsOrigins,
    credentials: true,
  });

  // Rate limiting
  await app.register(rateLimit, {
    max: config.rateLimitMax,
    timeWindow: config.rateLimitWindow,
  });

  // JWT authentication
  await app.register(fjwt, {
    secret: config.jwtSecret,
    sign: { expiresIn: '15m' },
  });

  // Auth plugin (decorators + hooks)
  await registerAuthPlugin(app);

  // Custom error handler
  await registerErrorHandler(app);

  // Queue plugin (BullMQ) — graceful if Redis unavailable
  await registerQueuePlugin(app);

  // ============================================================
  // HEALTH CHECK
  // ============================================================
  app.get('/api/health', async () => ({
    status: 'ok',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  }));

  // ============================================================
  // WAVE 0 — AUTH ROUTES
  // ============================================================
  await registerAuthRoutes(app);

  // ============================================================
  // WAVE 1 — PROPERTY HIERARCHY
  // ============================================================
  await registerOrganizationRoutes(app);
  await registerBuildingRoutes(app);
  await registerApartmentRoutes(app);

  // ============================================================
  // WAVE 2 — PEOPLE & ACCESS
  // ============================================================
  await registerPersonRoutes(app);

  // ============================================================
  // WAVE 3 — METERS & READINGS
  // ============================================================
  await registerMeterRoutes(app);
  await registerReadingRoutes(app);

  // ============================================================
  // WAVE 4 — UTILITY COST LEDGER
  // ============================================================
  await registerCostRoutes(app);

  // ============================================================
  // WAVE 5 — ALLOCATION ENGINE
  // ============================================================
  await registerAllocationRoutes(app);

  // ============================================================
  // WAVE 6 — INVOICE GENERATION
  // ============================================================
  await registerInvoiceRoutes(app);

  // ============================================================
  // START
  // ============================================================
  const port = config.port;
  const host = config.host;

  try {
    await app.listen({ port, host });
    app.log.info(`🚀 Kuhik API running on http://${host}:${port}`);
    app.log.info('   PostgreSQL: connected via Prisma');
    app.log.info('   JWT auth: enabled');
    app.log.info('   Wave 0: auth + health endpoints ready');
    app.log.info('   Wave 1: org/building/apartment routes active');
    app.log.info('   Wave 2: people/apartment-relations routes active');
    app.log.info('   Wave 3: meters/readings routes active');
    app.log.info('   Wave 4: utility cost ledger routes active');
    app.log.info('   Wave 5: allocation engine routes active');
    app.log.info('   Wave 6: invoice generation routes active');
  } catch (err) {
    app.log.error(err);
    await prisma.$disconnect();
    process.exit(1);
  }
}

// Handle graceful shutdown
const shutdown = async () => {
  app.log.info('Shutting down...');
  await app.close();
  await prisma.$disconnect();
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

bootstrap();