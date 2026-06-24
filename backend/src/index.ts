// kuhik-core/backend/src/index.ts
// Kuhik — Fastify Backend Server
// API-first, modular monolith, domain-driven modules
// Wave 9: Environment validation, structured logging, production hardening

import Fastify, { FastifyInstance } from 'fastify';
import fjwt from '@fastify/jwt';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { PrismaClient } from '@prisma/client';

// Load env FIRST — fails fast if misconfigured
import './lib/env.js';

import { config } from './config.js';
import { registerAuthPlugin } from './plugins/auth.js';
import { registerErrorHandler } from './plugins/error-handler.js';
import { registerRequestLogger } from './plugins/request-logger.js';
import { registerQueuePlugin } from './plugins/queues.js';
import { registerAuthRoutes } from './modules/auth/auth.routes.js';
import { registerOrganizationRoutes } from './modules/organizations/organization.routes.js';
import { registerPublicRoutes } from './modules/public/public.routes.js';
import { registerBuildingRoutes } from './modules/buildings/building.routes.js';
import { registerApartmentRoutes } from './modules/apartments/apartment.routes.js';
import { registerPersonRoutes } from './modules/people/person.routes.js';
import { registerMeterRoutes } from './modules/apartment-meters/meter.routes.js';
import { registerReadingRoutes } from './modules/meter-readings/reading.routes.js';
import { registerCostRoutes } from './modules/utility-costs/cost.routes.js';
import { registerAllocationRoutes } from './modules/allocation/allocation.routes.js';
import { registerInvoiceRoutes } from './modules/invoices/invoices.routes.js';
import { registerPaymentRoutes } from './modules/payments/payments.routes.js';
import { registerMeRoutes } from './modules/me/me.routes.js';

// Initialize Prisma
export const prisma = new PrismaClient();

// Build Fastify instance — production logger is JSON, dev is pretty
const app = Fastify({
  logger: config.isProduction
    ? { level: 'info' }
    : {
        transport: {
          target: 'pino-pretty',
          options: { colorize: true, translateTime: 'HH:MM:ss' },
        },
      },
});

async function bootstrap(): Promise<void> {
  // ============================================================
  // PLUGINS (order matters)
  // ============================================================

  // 1. Request logger — capture all requests
  await registerRequestLogger(app);

  // 2. CORS
  await app.register(cors, {
    origin: config.corsOrigins,
    credentials: true,
  });

  // 3. Rate limiting
  await app.register(rateLimit, {
    max: config.rateLimitMax,
    timeWindow: config.rateLimitWindow,
  });

  // 4. JWT authentication
  await app.register(fjwt, {
    secret: config.jwtSecret,
    sign: { expiresIn: config.jwtExpiresIn },
  });

  // 5. Auth plugin (decorators + hooks)
  await registerAuthPlugin(app);

  // 6. Custom error handler
  await registerErrorHandler(app);

  // 7. Queue plugin (BullMQ) — graceful if Redis unavailable
  await registerQueuePlugin(app);

  // ============================================================
  // PUBLIC ROUTES (no auth required)
  // ============================================================
  await registerPublicRoutes(app);

  // ============================================================
  // WAVE 0 — AUTH ROUTES
  // ============================================================
  await registerAuthRoutes(app);

  // ============================================================
  // PROTECTED ROUTES (require JWT auth)
  // Registered inside a scoped plugin to isolate the auth hook
  // from leaking to public routes above.
  // ============================================================
  await app.register(async function protectedRoutes(scopedApp: FastifyInstance) {
    // Custom JSON parser for scoped routes — Fastify's default JSON parser throws
    // "Body cannot be empty when content-type is set to 'application/json'" for empty body POST
    // requests. Some endpoints (e.g., invoice generation) take params from URL, not body.
    // This parser tolerates empty bodies by returning an empty object instead of crashing.
    scopedApp.addContentTypeParser('application/json', { parseAs: 'string' }, (req, body: string, done) => {
      if (!body || body.trim().length === 0) {
        done(null, {});
      } else {
        try { done(null, JSON.parse(body)); }
        catch (err: any) { done(err, undefined); }
      }
    });

    scopedApp.addHook('preHandler', scopedApp.authenticate);

    // WAVE 1 — PROPERTY HIERARCHY
    await registerOrganizationRoutes(scopedApp);
    await registerBuildingRoutes(scopedApp);
    await registerApartmentRoutes(scopedApp);

    // WAVE 2 — PEOPLE & ACCESS
    await registerPersonRoutes(scopedApp);

    // WAVE 3 — METERS & READINGS
    await registerMeterRoutes(scopedApp);
    await registerReadingRoutes(scopedApp);

    // WAVE 4 — UTILITY COST LEDGER
    await registerCostRoutes(scopedApp);

    // WAVE 5 — ALLOCATION ENGINE
    await registerAllocationRoutes(scopedApp);

    // WAVE 6 — INVOICE GENERATION
    await registerInvoiceRoutes(scopedApp);

    // WAVE 7 — PAYMENT TRACKING
    await registerPaymentRoutes(scopedApp);

    // WAVE 8 — RESIDENT SELF-SERVICE (read-only)
    await registerMeRoutes(scopedApp);
  });

  // ============================================================
  // START
  // ============================================================
  const port = config.port;
  const host = config.host;

  try {
    await app.listen({ port, host });
    app.log.info(`\u{1F680} Kuhik API running on http://${host}:${port}`);
    app.log.info(`   Environment: ${config.nodeEnv}`);
    app.log.info('   PostgreSQL: connected via Prisma');
    app.log.info('   JWT auth: enabled');
    app.log.info('   Structured logging: active');
    app.log.info('   Wave 0: auth + health endpoints ready');
    app.log.info('   Wave 1: org/building/apartment routes active');
    app.log.info('   Wave 2: people/apartment-relations routes active');
    app.log.info('   Wave 3: meters/readings routes active');
    app.log.info('   Wave 4: utility cost ledger routes active');
    app.log.info('   Wave 5: allocation engine routes active');
    app.log.info('   Wave 6: invoice generation routes active');
    app.log.info('   Wave 7: payment tracking routes active');
    app.log.info('   Wave 8: resident self-service routes active');
    app.log.info('   Wave 9: production hardening active');
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