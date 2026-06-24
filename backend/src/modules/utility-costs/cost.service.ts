// kuhik-core/backend/src/modules/utility-costs/cost.service.ts

import { prisma } from '../../lib/prisma.js';
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
  // Write to UtilityCost (new model) and Cost (legacy model) for backward compatibility
  const utilityCost = await prisma.utilityCost.create({
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

  // Also create legacy Cost record for allocation engine compatibility
  try {
    const periodStart = new Date(input.periodStart);
    // Find or create a default resource type for the tenant
    let rt = await prisma.resourceType.findFirst({
      where: { tenantId, code: 'default' },
    });
    if (!rt) {
      rt = await prisma.resourceType.create({
        data: { tenantId, name: 'Default', code: 'default', category: 'utility' },
      });
    }
    await prisma.cost.create({
      data: {
        tenantId,
        resourceTypeId: rt.id,
        description: input.description || `${input.type} cost`,
        amount: input.totalAmount,
        totalAmount: input.totalAmount,
        periodYear: periodStart.getFullYear(),
        periodMonth: periodStart.getMonth() + 1,
        status: 'pending',
      },
    });
  } catch (e) {
    // Non-blocking: legacy cost record is optional
    console.warn(`[Cost] Warning: could not create legacy Cost record:`, (e as Error).message);
  }

  return utilityCost;
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