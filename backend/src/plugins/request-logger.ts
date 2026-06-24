// kuhik-core/backend/src/plugins/request-logger.ts
// Wave 9: Structured request logging with request ID + error ID
// No analytics, no metrics, no tracing

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import crypto from 'crypto';

declare module 'fastify' {
  interface FastifyRequest {
    requestId: string;
  }
}

export async function registerRequestLogger(app: FastifyInstance): Promise<void> {
  // Generate a unique request ID for every incoming request
  app.addHook('onRequest', async (request: FastifyRequest) => {
    request.requestId = crypto.randomUUID().substring(0, 8);
  });

  // Log structured request info after response is sent
  app.addHook('onResponse', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.userId || 'anonymous';
    const method = request.method;
    const url = request.url;
    const statusCode = reply.statusCode;
    const duration = reply.elapsedTime;

    app.log.info({
      requestId: request.requestId,
      userId,
      method,
      url,
      statusCode,
      durationMs: duration,
    }, `[${request.requestId}] ${method} ${url} → ${statusCode} (${duration}ms)`);
  });

  // Log request errors
  app.addHook('onError', async (request: FastifyRequest, _reply: FastifyReply, error: Error) => {
    app.log.error({
      requestId: request.requestId,
      userId: request.userId || 'anonymous',
      error: error.message,
      stack: error.stack,
    }, `[${request.requestId}] ERROR: ${error.message}`);
  });
}