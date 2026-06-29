import { randomUUID } from "node:crypto";
import fp from "fastify-plugin";
import type { FastifyPluginCallback } from "fastify";

export const requestContextPlugin: FastifyPluginCallback = fp(
  (app, _options, done) => {
    app.addHook("onRequest", (request, reply, hookDone) => {
      const requestId =
        readHeader(request.headers["x-request-id"]) ?? randomUUID();
      const correlationId =
        readHeader(request.headers["x-correlation-id"]) ?? requestId;

      request.requestId = requestId;
      request.correlationId = correlationId;

      reply.header("x-request-id", requestId);
      reply.header("x-correlation-id", correlationId);

      hookDone();
    });

    done();
  },
);

function readHeader(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}
