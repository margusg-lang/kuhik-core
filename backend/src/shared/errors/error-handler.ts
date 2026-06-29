import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { ZodError } from "zod";
import { AppError } from "./app-error.js";

export function registerErrorHandler(app: FastifyInstance): void {
  app.setErrorHandler(
    async (error: Error, request: FastifyRequest, reply: FastifyReply) => {
      if (error instanceof AppError) {
        request.log.warn(
          {
            error,
            code: error.code,
            requestId: request.requestId,
            correlationId: request.correlationId,
          },
          "application error",
        );

        return reply.status(error.statusCode).send({
          error: {
            code: error.code,
            message: error.message,
            details: error.details,
            requestId: request.requestId,
            correlationId: request.correlationId,
          },
        });
      }

      if (error instanceof ZodError) {
        return reply.status(400).send({
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid request data",
            details: error.flatten(),
            requestId: request.requestId,
            correlationId: request.correlationId,
          },
        });
      }

      request.log.error(
        {
          error,
          requestId: request.requestId,
          correlationId: request.correlationId,
        },
        "unhandled error",
      );

      return reply.status(500).send({
        error: {
          code: "INTERNAL_ERROR",
          message: "Internal server error",
          requestId: request.requestId,
          correlationId: request.correlationId,
        },
      });
    },
  );
}
