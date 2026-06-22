// kuhik-core/backend/src/modules/allocation/allocation.service.ts

import { prisma } from '../../index.js';
import { requireTenantAdmin, requireTenantAccess } from '../../lib/authz.js';
import { AppError } from '../../plugins/error-handler.js';
import { computeAllocation } from './allocation.engine.js';
import type { RunAllocationInput } from './allocation.schema.js';

export async function runAllocation(tenantId: string, input: RunAllocationInput, userId: string) {
  await requireTenantAdmin(tenantId, userId);

  const periodStart = new Date(input.periodStart);
  const periodEnd = new Date(input.periodEnd);

  // Compute
  const result = await computeAllocation(tenantId, periodStart, periodEnd);

  // Store run
  const run = await prisma.allocationRun.create({
    data: {
      tenantId,
      periodStart,
      periodEnd,
      status: 'draft',
      meta: { summary: result.summary },
      items: {
        create: result.items.map(item => ({
          apartmentId: item.apartmentId,
          costType: item.costType,
          method: item.method,
          amount: item.amount,
          consumptionPct: item.consumptionPct,
        })),
      },
    },
    include: { items: { include: { apartment: { select: { unitLabel: true } } } } },
  });

  return run;
}

export async function listAllocationRuns(tenantId: string, userId: string) {
  await requireTenantAccess(tenantId, userId);
  return prisma.allocationRun.findMany({
    where: { tenantId },
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { items: true } } },
  });
}

export async function getAllocationRun(id: string, userId: string) {
  const run = await prisma.allocationRun.findUnique({
    where: { id },
    include: {
      items: {
        include: { apartment: { select: { id: true, unitLabel: true } } },
        orderBy: { createdAt: 'asc' },
      },
    },
  });
  if (!run) throw new AppError(404, 'NOT_FOUND', 'Jaotust ei leitud');
  await requireTenantAccess(run.tenantId, userId);
  return run;
}