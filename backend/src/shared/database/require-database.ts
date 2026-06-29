import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@prisma/client";
import { AppError } from "../errors/app-error.js";

export function requireDatabase(app: FastifyInstance): PrismaClient {
  if (!app.database) {
    throw new AppError({
      code: "SERVICE_UNAVAILABLE",
      message: "Database is not configured",
      statusCode: 503,
    });
  }

  return app.database;
}
