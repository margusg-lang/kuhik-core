// kuhik-core/backend/src/lib/prisma.ts
// Shared Prisma singleton — separate from index.ts so tests and modules
// can import prisma without triggering server bootstrap.

import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();