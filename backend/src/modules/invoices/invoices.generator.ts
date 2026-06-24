// kuhik-core/backend/src/modules/invoices/invoices.generator.ts
// Takes allocation results → generates invoice records per apartment
// Wave 9: Transaction-safe, validated, invariant-checked

import { prisma } from '../../index.js';
import { AppError } from '../../plugins/error-handler.js';

let invoiceCounter = 1;

function generateInvoiceNumber(tenantId: string): string {
  const ts = Date.now().toString(36).toUpperCase();
  const seq = String(invoiceCounter++).padStart(4, '0');
  return `INV-${tenantId.substring(0, 4)}-${ts}-${seq}`;
}

interface AllocationItemWithApartment {
  id: string;
  apartmentId: string;
  costType: string;
  method: string;
  amount: number;
  consumptionPct: number | null;
  apartment: { id: string; unitLabel: string; tenantId: string };
}

interface AllocationRunWithItems {
  id: string;
  tenantId: string;
  periodStart: Date;
  periodEnd: Date;
  status: string;
  items: AllocationItemWithApartment[];
}

export async function generateInvoicesFromAllocation(allocationRunId: string) {
  // ================================================================
  // PHASE 1 — LOAD WITH VALIDATION
  // ================================================================
  const run = await prisma.allocationRun.findUnique({
    where: { id: allocationRunId },
    include: {
      items: { include: { apartment: { select: { id: true, unitLabel: true, tenantId: true } } } },
      tenant: { select: { id: true } },
    },
  }) as AllocationRunWithItems | null;

  if (!run) throw new AppError(404, 'NOT_FOUND', 'Jaotust ei leitud');
  if (run.items.length === 0) throw new AppError(400, 'NO_ITEMS', 'Jaotuses pole kirjeid');

  // ================================================================
  // PHASE 2 — INVARIANT CHECKS
  // ================================================================

  // I1: All items must have apartmentId
  const itemsMissingApt = run.items.filter(i => !i.apartmentId);
  if (itemsMissingApt.length > 0) {
    throw new AppError(400, 'INVALID_ALLOCATION', `${itemsMissingApt.length} jaotuse kirjet puudub korteri viide`);
  }

  // I2: All items must have a valid amount
  const invalidAmounts = run.items.filter(i => i.amount === null || i.amount === undefined || isNaN(i.amount));
  if (invalidAmounts.length > 0) {
    throw new AppError(400, 'INVALID_ALLOCATION', `${invalidAmounts.length} jaotuse kirjet ei oma kehtivat summat`);
  }

  // I3: Sum of allocations must be > 0
  const totalAllocated = run.items.reduce((sum, i) => sum + i.amount, 0);
  if (totalAllocated <= 0) {
    throw new AppError(400, 'ZERO_ALLOCATION', 'Jaotuste summa on null — ei saa arveid genereerida');
  }

  // Group allocation items by apartment
  const byApartment = new Map<string, AllocationItemWithApartment[]>();
  for (const item of run.items) {
    const existing = byApartment.get(item.apartmentId) || [];
    existing.push(item);
    byApartment.set(item.apartmentId, existing);
  }

  const invoices: any[] = [];

  // ================================================================
  // PHASE 3 — TRANSACTIONAL INVOICE CREATION
  // ================================================================

  await prisma.$transaction(async (tx) => {
    for (const [apartmentId, items] of byApartment) {
      const totalAmount = items.reduce((sum, i) => sum + i.amount, 0);
      const roundedTotal = Math.round(totalAmount * 100) / 100;
      const apartment = items[0].apartment;

      // Check: each item amount must be non-negative
      for (const item of items) {
        if (item.amount < 0) {
          throw new AppError(400, 'NEGATIVE_AMOUNT', `Negatiivne summa korterile ${apartment.unitLabel}: ${item.amount}`);
        }
      }

      const invoice = await tx.kuhikInvoice.create({
        data: {
          tenantId: run.tenantId,
          apartmentId,
          allocationRunId,
          invoiceNumber: generateInvoiceNumber(run.tenantId),
          periodStart: run.periodStart,
          periodEnd: run.periodEnd,
          totalAmount: roundedTotal,
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

    // ================================================================
    // PHASE 4 — POST-CREATION INVARIANT CHECK
    // ================================================================

    // I4: Every invoice must have at least 1 line item
    for (const inv of invoices) {
      if (!inv.items || inv.items.length === 0) {
        throw new AppError(500, 'INVOICE_LINE_MISSING', `Arvel ${inv.invoiceNumber} puuduvad read`);
      }
    }

    // I5: Total sum of invoice totals must match total allocated
    const totalInvoiced = invoices.reduce((sum: number, inv: any) => sum + inv.totalAmount, 0);
    if (Math.abs(totalInvoiced - totalAllocated) > 0.02) {
      throw new AppError(500, 'TOTAL_MISMATCH', `Arvete summa (${totalInvoiced}) ei ühti jaotuste summaga (${totalAllocated})`);
    }
  });

  return invoices;
}