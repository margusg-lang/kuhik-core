// kuhik-core/backend/src/plugins/error-handler.ts
// Centralized error handler with fail-safe pattern
// Wave 9: Production-safe — no stack traces leaked

import { FastifyInstance, FastifyError, FastifyRequest, FastifyReply } from 'fastify';
import { config } from '../config.js';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export async function registerErrorHandler(app: FastifyInstance): Promise<void> {
  app.setErrorHandler((error: FastifyError | AppError | Error, request: FastifyRequest, reply: FastifyReply) => {
    // Ensure every error gets a requestId for traceability
    const errorId = (request as any).requestId || 'unknown';

    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({
        success: false,
        error: error.message,
        code: error.code,
        details: error.details,
        errorId,
      });
    }

    // Fastify validation errors
    if ('validation' in error) {
      return reply.status(400).send({
        success: false,
        error: error.message,
        code: 'VALIDATION_ERROR',
        errorId,
      });
    }

    // Rate limit errors
    if ('statusCode' in error && (error as any).statusCode === 429) {
      return reply.status(429).send({
        success: false,
        error: 'Liiga palju päringuid. Palun oodake.',
        code: 'RATE_LIMITED',
        errorId,
      });
    }

    // JWT errors
    if ('code' in error && ((error as any).code === 'FST_JWT_BAD_REQUEST' || (error as any).code === 'FST_JWT_NO_AUTHORIZATION_IN_HEADER')) {
      return reply.status(401).send({
        success: false,
        error: 'Autentimine ebaõnnestus',
        code: 'UNAUTHORIZED',
        errorId,
      });
    }

    // Default 500 — NEVER leak stack traces in production
    app.log.error({
      requestId: errorId,
      error: error.message,
      stack: config.isProduction ? undefined : error.stack,
    }, `Unhandled error [${errorId}]: ${error.message}`);

    return reply.status(500).send({
      success: false,
      error: config.isProduction ? 'Sisemine serveri viga' : error.message,
      code: 'INTERNAL_ERROR',
      ...(config.isProduction ? {} : { stack: error.stack }),
      errorId,
    });
  });
}