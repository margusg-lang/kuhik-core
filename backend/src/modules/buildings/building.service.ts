// kuhik-core/backend/src/modules/buildings/building.service.ts

import { prisma } from '../../index.js';
import type { CreateBuildingInput, UpdateBuildingInput } from './building.schema.js';
import { AppError } from '../../plugins/error-handler.js';

export async function listBuildings(tenantId: string, userId: string) {
  // Verify user has access to this tenant
  const membership = await prisma.tenantUser.findFirst({
    where: { tenantId, userId, isActive: true },
  });
  if (!membership) throw new AppError(404, 'NOT_FOUND', 'Ühistut ei leitud');

  return prisma.building.findMany({
    where: { tenantId, isActive: true },
    orderBy: { name: 'asc' },
  });
}

export async function getBuilding(id: string, userId: string) {
  const building = await prisma.building.findUnique({
    where: { id },
    include: { tenant: true },
  });
  if (!building) throw new AppError(404, 'NOT_FOUND', 'Hoonet ei leitud');

  // Verify access
  const membership = await prisma.tenantUser.findFirst({
    where: { tenantId: building.tenantId, userId, isActive: true },
  });
  if (!membership) throw new AppError(404, 'NOT_FOUND', 'Hoonet ei leitud');

  return building;
}

export async function createBuilding(tenantId: string, input: CreateBuildingInput, userId: string) {
  // Verify admin access
  const membership = await prisma.tenantUser.findFirst({
    where: { tenantId, userId, isActive: true, role: { in: ['system_admin', 'admin', 'board_member'] } },
  });
  if (!membership) throw new AppError(403, 'FORBIDDEN', 'Ainult haldur saab hooneid lisada');

  const building = await prisma.building.create({
    data: {
      tenantId,
      name: input.name,
      address: input.address || null,
      type: input.type || 'apartment_building',
    },
  });

  return building;
}

export async function updateBuilding(id: string, input: UpdateBuildingInput, userId: string) {
  const building = await prisma.building.findUnique({ where: { id } });
  if (!building) throw new AppError(404, 'NOT_FOUND', 'Hoonet ei leitud');

  // Verify admin access
  const membership = await prisma.tenantUser.findFirst({
    where: { tenantId: building.tenantId, userId, isActive: true, role: { in: ['system_admin', 'admin', 'board_member'] } },
  });
  if (!membership) throw new AppError(403, 'FORBIDDEN', 'Ainult haldur saab hoonet muuta');

  const updated = await prisma.building.update({
    where: { id },
    data: {
      name: input.name,
      address: input.address,
      type: input.type,
      isActive: input.isActive,
    },
  });

  return updated;
}