import cors from "@fastify/cors";
import Fastify, { type FastifyInstance } from "fastify";
import { registerErrorHandler } from "../shared/errors/error-handler.js";
import { databasePlugin } from "../plugins/database.plugin.js";
import { requestContextPlugin } from "../plugins/request-context.plugin.js";
import { authPlugin } from "../modules/auth/auth.plugin.js";
import { healthRoutes } from "../modules/health/health.routes.js";
import { buildLoggerOptions } from "../shared/logger/logger.js";
import type { Environment } from "../config/environment.js";

export interface BuildAppOptions {
  environment: Environment;
}

export async function buildApp(
  options: BuildAppOptions,
): Promise<FastifyInstance> {
  const app = Fastify({
    logger: buildLoggerOptions(options.environment),
  });

  app.decorate("environment", options.environment);

  registerErrorHandler(app);

  await app.register(cors, {
    origin: options.environment.CORS_ORIGIN,
    credentials: true,
  });

  await app.register(requestContextPlugin);

  if (options.environment.DATABASE_URL) {
    await app.register(databasePlugin);
  }

  await app.register(authPlugin);
  await app.register(healthRoutes);

  return app;
}
