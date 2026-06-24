// kuhik-core/backend/src/modules/apartments/apartment.service.ts

import { prisma } from '../../lib/prisma.js';
import type { CreateApartmentInput, UpdateApartmentInput } from './apartment.schema.js';
import { AppError } from '../../plugins/error-handler.js';

export async function listApartments(buildingId: string, userId: string) {
  const building = await prisma.building.findUnique({
    where: { id: buildingId },
    include: { tenant: true },
  });
  if (!building) throw new AppError(404, 'NOT_FOUND', 'Hoonet ei leitud');

  // Verify access
  const membership = await prisma.tenantUser.findFirst({
    where: { tenantId: building.tenantId, userId, isActive: true },
  });
  if (!membership) throw new AppError(404, 'NOT_FOUND', 'Hoonet ei leitud');

  return prisma.apartment.findMany({
    where: { buildingId, isActive: true },
    orderBy: { unitLabel: 'asc' },
  });
}

export async function getApartment(id: string, userId: string) {
  const apartment = await prisma.apartment.findUnique({
    where: { id },
    include: { building: { include: { tenant: true } } },
  });
  if (!apartment) throw new AppError(404, 'NOT_FOUND', 'Korterit ei leitud');

  // Verify access
  const membership = await prisma.tenantUser.findFirst({
    where: { tenantId: apartment.building.tenantId, userId, isActive: true },
  });
  if (!membership) throw new AppError(404, 'NOT_FOUND', 'Korterit ei leitud');

  return apartment;
}

export async function createApartment(buildingId: string, input: CreateApartmentInput, userId: string) {
  const building = await prisma.building.findUnique({ where: { id: buildingId } });
  if (!building) throw new AppError(404, 'NOT_FOUND', 'Hoonet ei leitud');

  // Verify admin access
  const membership = await prisma.tenantUser.findFirst({
    where: { tenantId: building.tenantId, userId, isActive: true, role: { in: ['system_admin', 'admin', 'board_member'] } },
  });
  if (!membership) throw new AppError(403, 'FORBIDDEN', 'Ainult haldur saab kortereid lisada');

  const apartment = await prisma.apartment.create({
    data: {
      tenantId: building.tenantId,
      buildingId,
      unitLabel: input.unitLabel,
      floor: input.floor || null,
      areaSqm: input.areaSqm || null,
      heatedAreaSqm: input.heatedAreaSqm || null,
      occupancy: input.occupancy || 1,
    },
  });

  return apartment;
}

export async function updateApartment(id: string, input: UpdateApartmentInput, userId: string) {
  const apartment = await prisma.apartment.findUnique({
    where: { id },
    include: { building: true },
  });
  if (!apartment) throw new AppError(404, 'NOT_FOUND', 'Korterit ei leitud');

  // Verify admin access
  const membership = await prisma.tenantUser.findFirst({
    where: { tenantId: apartment.building.tenantId, userId, isActive: true, role: { in: ['system_admin', 'admin', 'board_member'] } },
  });
  if (!membership) throw new AppError(403, 'FORBIDDEN', 'Ainult haldur saab korterit muuta');

  const updated = await prisma.apartment.update({
    where: { id },
    data: {
      unitLabel: input.unitLabel,
      floor: input.floor,
      areaSqm: input.areaSqm,
      heatedAreaSqm: input.heatedAreaSqm,
      occupancy: input.occupancy,
      isActive: input.isActive,
    },
  });

  return updated;
}