import { PrismaClient } from "@prisma/client";
import fp from "fastify-plugin";
import type { FastifyPluginAsync } from "fastify";

export const databasePlugin: FastifyPluginAsync = fp(async (app) => {
  const database = new PrismaClient({
    log:
      app.environment.NODE_ENV === "development"
        ? ["query", "info", "warn", "error"]
        : ["warn", "error"],
  });

  await database.$connect();

  app.decorate("database", database);

  app.addHook("onClose", async () => {
    await database.$disconnect();
  });
});
