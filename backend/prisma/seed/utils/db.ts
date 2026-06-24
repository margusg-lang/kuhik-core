// kuhik-core/backend/prisma/seed/utils/db.ts
// Prisma client singleton with safe connect/disconnect

import { PrismaClient } from "@prisma/client";

let prisma: PrismaClient | null = null;

export function getPrisma(): PrismaClient {
  if (!prisma) {
    prisma = new PrismaClient();
  }
  return prisma;
}

export async function connect(): Promise<PrismaClient> {
  const client = getPrisma();
  await client.$connect();
  return client;
}

export async function disconnect(): Promise<void> {
  if (prisma) {
    await prisma.$disconnect();
    prisma = null;
  }
}