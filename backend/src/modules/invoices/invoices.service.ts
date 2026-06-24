// kuhik-core/backend/src/modules/invoices/invoices.service.ts

import { prisma } from '../../lib/prisma.js';
import { requireTenantAccess } from '../../lib/authz.js';
import { AppError } from '../../plugins/error-handler.js';
import { generateInvoicesFromAllocation } from './invoices.generator.js';

export async function generateInvoices(allocationRunId: string, userId: string) {
  const run = await prisma.allocationRun.findUnique({ where: { id: allocationRunId } });
  if (!run) throw new AppError(404, 'NOT_FOUND', 'Jaotust ei leitud');
  await requireTenantAccess(run.tenantId, userId);
  return generateInvoicesFromAllocation(allocationRunId);
}

export async function listInvoices(tenantId: string, userId: string) {
  await requireTenantAccess(tenantId, userId);
  return prisma.kuhikInvoice.findMany({
    where: { tenantId },
    orderBy: { createdAt: 'desc' },
    include: {
      apartment: { select: { unitLabel: true } },
      _count: { select: { items: true } },
    },
  });
}

export async function getInvoice(id: string, userId: string) {
  const invoice = await prisma.kuhikInvoice.findUnique({
    where: { id },
    include: {
      items: true,
      payments: { orderBy: { paidAt: 'desc' } },
      apartment: { select: { unitLabel: true, building: { select: { name: true } } } },
    },
  });
  if (!invoice) throw new AppError(404, 'NOT_FOUND', 'Arvet ei leitud');
  await requireTenantAccess(invoice.tenantId, userId);
  return invoice;
}

export async function listApartmentInvoices(apartmentId: string, userId: string) {
  const apartment = await prisma.apartment.findUnique({ where: { id: apartmentId } });
  if (!apartment) throw new AppError(404, 'NOT_FOUND', 'Korterit ei leitud');
  await requireTenantAccess(apartment.tenantId, userId);

  return prisma.kuhikInvoice.findMany({
    where: { apartmentId },
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { items: true } } },
  });
}