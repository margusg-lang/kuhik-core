// kuhik-core/backend/src/modules/invoices/invoices.generator.ts
// Takes allocation results → generates invoice records per apartment

import { prisma } from '../../index.js';
import { AppError } from '../../plugins/error-handler.js';

let invoiceCounter = 1;

function generateInvoiceNumber(tenantId: string): string {
  const ts = Date.now().toString(36).toUpperCase();
  const seq = String(invoiceCounter++).padStart(4, '0');
  return `INV-${tenantId.substring(0, 4)}-${ts}-${seq}`;
}

export async function generateInvoicesFromAllocation(allocationRunId: string) {
  const run = await prisma.allocationRun.findUnique({
    where: { id: allocationRunId },
    include: {
      items: { include: { apartment: { select: { id: true, unitLabel: true, tenantId: true } } } },
      tenant: { select: { id: true } },
    },
  });

  if (!run) throw new AppError(404, 'NOT_FOUND', 'Jaotust ei leitud');
  if (run.items.length === 0) throw new AppError(400, 'NO_ITEMS', 'Jaotuses pole kirjeid');

  // Group allocation items by apartment
  const byApartment = new Map<string, typeof run.items>();
  for (const item of run.items) {
    const existing = byApartment.get(item.apartmentId) || [];
    existing.push(item);
    byApartment.set(item.apartmentId, existing);
  }

  const invoices: any[] = [];

  for (const [apartmentId, items] of byApartment) {
    const totalAmount = items.reduce((sum, i) => sum + i.amount, 0);
    const apartment = items[0].apartment;

    const invoice = await prisma.kuhikInvoice.create({
      data: {
        tenantId: run.tenantId,
        apartmentId,
        allocationRunId,
        invoiceNumber: generateInvoiceNumber(run.tenantId),
        periodStart: run.periodStart,
        periodEnd: run.periodEnd,
        totalAmount: Math.round(totalAmount * 100) / 100,
        status: 'draft',
        items: {
          create: items.map(item => ({
            costType: item.costType,
            amount: item.amount,
            source: 'allocation',
          })),
        },
      },
      include: { items: true, apartment: { select: { unitLabel: true } } },
    });

    invoices.push(invoice);
  }

  return invoices;
}