import type { FastifyPluginCallback } from "fastify";
import { checkDatabaseHealth } from "../../shared/database/database-health.js";

export const healthRoutes: FastifyPluginCallback = (app, _options, done) => {
  app.get("/live", () => ({
    status: "ok",
  }));

  app.get("/health", (request) => ({
    status: "ok",
    service: "kuhik-backend",
    environment: app.environment.NODE_ENV,
    requestId: request.requestId,
    correlationId: request.correlationId,
  }));

  app.get("/ready", async (request, reply) => {
    const database =
      app.database === undefined
        ? { status: "not_configured" as const }
        : await checkDatabaseHealth(app.database);

    const status = database.status === "error" ? "error" : "ok";

    if (status === "error") {
      reply.status(503);
    }

    return {
      status,
      checks: {
        application: "ok",
        database,
      },
      requestId: request.requestId,
      correlationId: request.correlationId,
    };
  });

  done();
};
