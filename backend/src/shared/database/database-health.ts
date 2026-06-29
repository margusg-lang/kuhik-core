import type { PrismaClient } from "@prisma/client";

export interface DatabaseHealth {
  status: "ok" | "error";
  latencyMs?: number;
}

export async function checkDatabaseHealth(
  database: PrismaClient,
): Promise<DatabaseHealth> {
  const startedAt = performance.now();

  try {
    await database.$queryRaw`SELECT 1`;

    return {
      status: "ok",
      latencyMs: Math.round(performance.now() - startedAt),
    };
  } catch {
    return {
      status: "error",
    };
  }
}
