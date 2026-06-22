// kuhik-core/backend/src/modules/meter-readings/reading.service.ts

import { prisma } from '../../index.js';
import { requireTenantAdmin, assertTenantScope } from '../../lib/authz.js';
import { AppError } from '../../plugins/error-handler.js';
import type { CreateReadingInput } from './reading.schema.js';

export async function listReadingsByMeter(meterId: string, userId: string) {
  const meter = await prisma.apartmentMeter.findUnique({ where: { id: meterId } });
  if (!meter) throw new AppError(404, 'NOT_FOUND', 'Arvestit ei leitud');
  await assertTenantScope(meter.tenantId, userId);

  return prisma.apartmentMeterReading.findMany({
    where: { meterId },
    orderBy: { timestamp: 'desc' },
  });
}

export async function listReadingsByApartment(apartmentId: string, userId: string) {
  const apartment = await prisma.apartment.findUnique({ where: { id: apartmentId } });
  if (!apartment) throw new AppError(404, 'NOT_FOUND', 'Korterit ei leitud');
  await assertTenantScope(apartment.tenantId, userId);

  return prisma.apartmentMeterReading.findMany({
    where: { meter: { apartmentId } },
    include: { meter: { select: { meterType: true, unit: true, label: true } } },
    orderBy: { timestamp: 'desc' },
    take: 200,
  });
}

export async function createReading(meterId: string, input: CreateReadingInput, userId: string) {
  const meter = await prisma.apartmentMeter.findUnique({ where: { id: meterId } });
  if (!meter) throw new AppError(404, 'NOT_FOUND', 'Arvestit ei leitud');
  await requireTenantAdmin(meter.tenantId, userId);

  const reading = await prisma.apartmentMeterReading.create({
    data: {
      meterId,
      tenantId: meter.tenantId,
      value: input.value,
      timestamp: input.timestamp ? new Date(input.timestamp) : new Date(),
      source: input.source || 'manual',
    },
  });
  return reading;
}