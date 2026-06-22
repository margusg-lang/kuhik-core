// kuhik-core/backend/src/modules/apartment-meters/meter.service.ts

import { prisma } from '../../index.js';
import { requireTenantAdmin, assertTenantScope } from '../../lib/authz.js';
import { AppError } from '../../plugins/error-handler.js';
import type { CreateMeterInput, UpdateMeterInput } from './meter.schema.js';

export async function listApartmentMeters(apartmentId: string, userId: string) {
  const apartment = await prisma.apartment.findUnique({ where: { id: apartmentId } });
  if (!apartment) throw new AppError(404, 'NOT_FOUND', 'Korterit ei leitud');
  await assertTenantScope(apartment.tenantId, userId);

  return prisma.apartmentMeter.findMany({
    where: { apartmentId, isActive: true },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getMeter(id: string, userId: string) {
  const meter = await prisma.apartmentMeter.findUnique({
    where: { id },
    include: { apartment: true },
  });
  if (!meter) throw new AppError(404, 'NOT_FOUND', 'Arvestit ei leitud');
  await assertTenantScope(meter.tenantId, userId);
  return meter;
}

export async function createMeter(apartmentId: string, input: CreateMeterInput, userId: string) {
  const apartment = await prisma.apartment.findUnique({ where: { id: apartmentId } });
  if (!apartment) throw new AppError(404, 'NOT_FOUND', 'Korterit ei leitud');
  await requireTenantAdmin(apartment.tenantId, userId);

  const meter = await prisma.apartmentMeter.create({
    data: {
      tenantId: apartment.tenantId,
      apartmentId,
      meterType: input.meterType,
      unit: input.unit || 'm3',
      serialNumber: input.serialNumber || null,
      label: input.label || null,
    },
  });
  return meter;
}

export async function updateMeter(id: string, input: UpdateMeterInput, userId: string) {
  const meter = await prisma.apartmentMeter.findUnique({ where: { id } });
  if (!meter) throw new AppError(404, 'NOT_FOUND', 'Arvestit ei leitud');
  await requireTenantAdmin(meter.tenantId, userId);

  const updated = await prisma.apartmentMeter.update({
    where: { id },
    data: {
      meterType: input.meterType,
      unit: input.unit,
      serialNumber: input.serialNumber,
      label: input.label,
      isActive: input.isActive,
    },
  });
  return updated;
}