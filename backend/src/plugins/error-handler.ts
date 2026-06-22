// kuhik-core/backend/src/plugins/error-handler.ts
// Centralized error handler with fail-safe pattern

import { FastifyInstance, FastifyError, FastifyRequest, FastifyReply } from 'fastify';

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
  app.setErrorHandler((error: FastifyError | AppError | Error, _request: FastifyRequest, reply: FastifyReply) => {
    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({
        error: error.message,
        code: error.code,
        details: error.details,
      });
    }

    // Fastify validation errors
    if ('validation' in error) {
      return reply.status(400).send({
        error: error.message,
        code: 'VALIDATION_ERROR',
      });
    }

    // Rate limit errors
    if (error.statusCode === 429) {
      return reply.status(429).send({
        error: 'Liiga palju päringuid. Palun oodake.',
        code: 'RATE_LIMITED',
      });
    }

    // Default 500
    app.log.error(error);
    return reply.status(500).send({
      error: 'Sisemine serveri viga',
      code: 'INTERNAL_ERROR',
    });
  });
}