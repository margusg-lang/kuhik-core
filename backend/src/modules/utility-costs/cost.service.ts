// kuhik-core/backend/src/modules/utility-costs/cost.service.ts

import { prisma } from '../../index.js';
import { requireTenantAccess, requireTenantAdmin } from '../../lib/authz.js';
import { AppError } from '../../plugins/error-handler.js';
import type { CreateCostInput, UpdateCostInput } from './cost.schema.js';

export async function listCosts(tenantId: string, userId: string) {
  await requireTenantAccess(tenantId, userId);
  return prisma.utilityCost.findMany({
    where: { tenantId },
    orderBy: { periodStart: 'desc' },
  });
}

export async function getCost(id: string, userId: string) {
  const cost = await prisma.utilityCost.findUnique({ where: { id } });
  if (!cost) throw new AppError(404, 'NOT_FOUND', 'Kulu ei leitud');
  await requireTenantAccess(cost.tenantId, userId);
  return cost;
}

export async function createCost(tenantId: string, input: CreateCostInput, userId: string) {
  await requireTenantAdmin(tenantId, userId);
  const cost = await prisma.utilityCost.create({
    data: {
      tenantId,
      type: input.type,
      periodStart: new Date(input.periodStart),
      periodEnd: new Date(input.periodEnd),
      totalAmount: input.totalAmount,
      currency: input.currency || 'EUR',
      supplierName: input.supplierName || null,
      description: input.description || null,
    },
  });
  return cost;
}

export async function updateCost(id: string, input: UpdateCostInput, userId: string) {
  const cost = await prisma.utilityCost.findUnique({ where: { id } });
  if (!cost) throw new AppError(404, 'NOT_FOUND', 'Kulu ei leitud');
  await requireTenantAdmin(cost.tenantId, userId);

  const updated = await prisma.utilityCost.update({
    where: { id },
    data: {
      type: input.type,
      periodStart: input.periodStart ? new Date(input.periodStart) : undefined,
      periodEnd: input.periodEnd ? new Date(input.periodEnd) : undefined,
      totalAmount: input.totalAmount,
      currency: input.currency,
      supplierName: input.supplierName,
      description: input.description,
    },
  });
  return updated;
}

export async function deleteCost(id: string, userId: string) {
  const cost = await prisma.utilityCost.findUnique({ where: { id } });
  if (!cost) throw new AppError(404, 'NOT_FOUND', 'Kulu ei leitud');
  await requireTenantAdmin(cost.tenantId, userId);
  await prisma.utilityCost.delete({ where: { id } });
  return { success: true };
}