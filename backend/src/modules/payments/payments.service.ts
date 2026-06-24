// kuhik-core/backend/src/modules/payments/payments.service.ts
// Wave 7 + Wave C: Payment tracking + Financial State Layer
//
// This module provides both the simple CRUD operations for payments (Wave 7)
// and the advanced financial state management (Wave C):
// - Receivable creation from charge lines
// - Payment allocation (FIFO)
// - Balance computation
// - Penalty engine
// - Traceability chain
//
// CRITICAL: Wave C MUST NOT touch allocation logic or recompute Wave B.

import { prisma } from '../../lib/prisma.js';
import { requireTenantAccess } from '../../lib/authz.js';
import { AppError } from '../../plugins/error-handler.js';
import { PrismaClient } from "@prisma/client";
import { roundCents } from "../allocation/allocation.engine.js";
import { createJournalService } from '../accounting/journal.service.js';

type TxClient = Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">;

// ===========================================================================
// WAVE 7 — SIMPLE PAYMENT CRUD
// ===========================================================================

export async function addPayment(invoiceId: string, data: { amount: number; method?: string; reference?: string | null }, userId: string) {
  const invoice = await prisma.kuhikInvoice.findUnique({
    where: { id: invoiceId },
    select: { tenantId: true, apartmentId: true, totalAmount: true, status: true },
  });
  if (!invoice) throw new AppError(404, 'NOT_FOUND', 'Arvet ei leitud');
  await requireTenantAccess(invoice.tenantId, userId);

  // Calculate total paid so far from existing payments
  const existingPayments = await prisma.kuhikPayment.findMany({
    where: { invoiceId },
    select: { amount: true },
  });
  const paidSoFar = existingPayments.reduce((s, p) => s + p.amount, 0);
  const newPaid = paidSoFar + data.amount;

  // Validate no overpayment
  if (newPaid > invoice.totalAmount + 0.01) {
    throw new AppError(400, 'OVERPAYMENT', 'Makse summa ületab arve saldot');
  }

  const payment = await prisma.kuhikPayment.create({
    data: {
      invoiceId,
      amount: data.amount,
      method: data.method || 'bank_transfer',
      reference: data.reference || null,
    },
  });

  // Recalc invoice status (stored in new Payment model, update invoice status)
  const newStatus = newPaid >= invoice.totalAmount - 0.01 ? 'paid' : (newPaid > 0 ? 'partially_paid' : 'issued');
  await prisma.kuhikInvoice.update({
    where: { id: invoiceId },
    data: { status: newStatus },
  });

  // Also create legacy Payment record for backward compatibility (FIFO uses this model)
  let legacyPaymentId: string | null = null;
  try {
    const legacyPayment = await prisma.payment.create({
      data: {
        tenantId: invoice.tenantId,
        apartmentId: invoice.apartmentId,
        invoiceId,
        amount: data.amount,
        method: data.method || 'bank_transfer',
        reference: data.reference || null,
        paymentDate: new Date(),
        status: 'received',
        allocationState: 'unallocated',
      },
    });
    legacyPaymentId = legacyPayment.id;
  } catch (e) {
    // Non-blocking
    console.warn(`[Payment] Warning: legacy payment record:`, (e as Error).message);
  }

  // Post double-entry journal entry for this payment
  try {
    const cashAccount = await prisma.chartAccount.findFirst({
      where: { tenantId: invoice.tenantId, accountClass: { code: { contains: 'cash' } }, isActive: true },
      orderBy: { accountNumber: 'asc' },
    });
    const receivableAccount = await prisma.chartAccount.findFirst({
      where: { tenantId: invoice.tenantId, accountClass: { code: { contains: 'receivable' } }, isActive: true },
      orderBy: { accountNumber: 'asc' },
    });
    if (cashAccount && receivableAccount) {
      const journalService = createJournalService(prisma as any);
      await journalService.postPayment({
        tenantId: invoice.tenantId,
        paymentId: payment.id,
        apartmentId: invoice.apartmentId || '',
        amount: data.amount,
        cashAccountId: cashAccount.id,
        receivableAccountId: receivableAccount.id,
      });
    }
  } catch (e) {
    // Non-blocking: payment recorded, journal can be fixed manually
    console.warn(`[Journal] Warning for payment ${payment.id}:`, (e as Error).message);
  }

  // Run FIFO allocation using Wave C service (via legacy Payment model)
  try {
    if (legacyPaymentId) {
      const allocService = new PaymentAllocationService(prisma as any);
      await allocService.allocateFifo(legacyPaymentId);
    }
  } catch (e) {
    // Non-blocking: payment recorded, allocation can be retried
    console.warn(`[Payment] FIFO allocation warning for ${payment.id}:`, (e as Error).message);
  }

  return payment;
}

export async function listInvoicePayments(invoiceId: string, userId: string) {
  const invoice = await prisma.kuhikInvoice.findUnique({ where: { id: invoiceId } });
  if (!invoice) throw new AppError(404, 'NOT_FOUND', 'Arvet ei leitud');
  await requireTenantAccess(invoice.tenantId, userId);

  return prisma.kuhikPayment.findMany({
    where: { invoiceId },
    orderBy: { paidAt: 'desc' },
  });
}

export async function listAllPayments(orgId: string, userId: string) {
  await requireTenantAccess(orgId, userId);

  return prisma.payment.findMany({
    where: { tenantId: orgId },
    orderBy: { paymentDate: 'desc' },
    include: {
      invoice: { select: { invoiceNumber: true } },
      apartment: { select: { unitLabel: true } },
    },
  });
}

// ===========================================================================
// WAVE C — RECEIVABLE CREATION SERVICE
// ===========================================================================

export class ReceivableCreationService {
  constructor(private tx: TxClient) {}

  async createFromChargeLines(chargeLineIds: string[]): Promise<string[]> {
    if (chargeLineIds.length === 0) return [];

    const chargeLines = await this.findChargeLinesWithCategory(chargeLineIds);
    if (chargeLines.length === 0) return [];

    const existingReceivables = await this.tx.receivable.findMany({
      where: { chargeLineId: { in: chargeLineIds } },
      select: { chargeLineId: true },
    });
    const existingIds = new Set(existingReceivables.map(r => r.chargeLineId));

    const created: string[] = [];

    for (const cl of chargeLines) {
      if (existingIds.has(cl.id)) continue;

      const receivable = await this.tx.receivable.create({
        data: {
          tenantId: cl.tenantId,
          apartmentId: cl.apartmentId,
          chargeLineId: cl.id,
          costCategoryId: cl.costCategoryId,
          sourceType: "charge",
          sourceReferenceId: cl.id,
          amountOriginal: cl.amount,
          amountOutstanding: cl.amount,
          amountPaid: 0,
          status: "open",
          periodYear: cl.periodYear,
          periodMonth: cl.periodMonth,
          dueDate: null,
        },
      });

      created.push(receivable.id);
    }

    return created;
  }

  private async findChargeLinesWithCategory(ids: string[]) {
    return this.tx.chargeLine.findMany({
      where: { id: { in: ids }, status: "active" },
      orderBy: { createdAt: "asc" },
    });
  }
}

// ===========================================================================
// WAVE C — PAYMENT ALLOCATION SERVICE (FIFO)
// ===========================================================================

export class PaymentAllocationService {
  constructor(private tx: TxClient) {}

  async allocateFifo(paymentId: string): Promise<string[]> {
    const payment = await this.tx.payment.findUnique({
      where: { id: paymentId },
    });
    if (!payment) throw new Error(`Payment not found: ${paymentId}`);
    if (payment.amount <= 0) return [];

    const apartmentId = payment.apartmentId;
    if (!apartmentId) {
      await this.tx.payment.update({
        where: { id: paymentId },
        data: { allocationState: "unallocated" },
      });
      return [];
    }

    const receivables = await this.tx.receivable.findMany({
      where: {
        tenantId: payment.tenantId,
        apartmentId,
        status: { in: ["open", "partial"] },
        amountOutstanding: { gt: 0 },
      },
      orderBy: [
        { dueDate: "asc" },
        { createdAt: "asc" },
      ],
    });

    if (receivables.length === 0) {
      await this.tx.payment.update({
        where: { id: paymentId },
        data: { allocationState: "unallocated" },
      });
      return [];
    }

    let remaining = payment.amount;
    const allocations: Array<{
      tenantId: string;
      paymentId: string;
      receivableId: string;
      apartmentId: string;
      amountAllocated: number;
      method: string;
    }> = [];
    const receivableUpdates: Array<{
      id: string;
      amountPaid: number;
      amountOutstanding: number;
      status: string;
    }> = [];

    for (const rec of receivables) {
      if (remaining <= 0) break;

      const allocAmount = roundCents(Math.min(remaining, rec.amountOutstanding));
      remaining = roundCents(remaining - allocAmount);

      const newPaid = roundCents(rec.amountPaid + allocAmount);
      const newOutstanding = roundCents(rec.amountOutstanding - allocAmount);
      const newStatus = newOutstanding <= 0 ? "paid" : (newPaid > 0 ? "partial" : "open");

      allocations.push({
        tenantId: payment.tenantId,
        paymentId: payment.id,
        receivableId: rec.id,
        apartmentId,
        amountAllocated: allocAmount,
        method: "fifo",
      });

      receivableUpdates.push({
        id: rec.id,
        amountPaid: newPaid,
        amountOutstanding: newOutstanding,
        status: newStatus,
      });
    }

    for (const alloc of allocations) {
      await this.tx.paymentAllocation.upsert({
        where: {
          paymentId_receivableId: {
            paymentId: alloc.paymentId,
            receivableId: alloc.receivableId,
          },
        },
        create: alloc,
        update: { amountAllocated: alloc.amountAllocated },
      });
    }

    for (const update of receivableUpdates) {
      await this.tx.receivable.update({
        where: { id: update.id },
        data: {
          amountPaid: update.amountPaid,
          amountOutstanding: update.amountOutstanding,
          status: update.status,
        },
      });
    }

    const totalAllocated = allocations.reduce((s, a) => s + a.amountAllocated, 0);
    const allocState = totalAllocated >= payment.amount ? "allocated" : "partial";
    await this.tx.payment.update({
      where: { id: paymentId },
      data: { allocationState: allocState, apartmentId },
    });

    return allocations.map(a => `${a.paymentId}:${a.receivableId}`);
  }
}

// ===========================================================================
// WAVE C — BALANCE SERVICE
// ===========================================================================

export class BalanceService {
  constructor(private tx: TxClient) {}

  async getApartmentBalance(tenantId: string, apartmentId: string) {
    const receivables = await this.tx.receivable.findMany({
      where: { tenantId, apartmentId },
    });

    const totalOriginal = receivables.reduce((s, r) => s + r.amountOriginal, 0);
    const totalPaid = receivables.reduce((s, r) => s + r.amountPaid, 0);
    const totalOutstanding = receivables.reduce((s, r) => s + r.amountOutstanding, 0);

    const penalties = await this.tx.penaltyEntry.findMany({
      where: { tenantId, apartmentId },
    });
    const totalPenalties = penalties.reduce((s, p) => s + p.amount, 0);

    return {
      apartmentId,
      totalOriginal: roundCents(totalOriginal),
      totalPaid: roundCents(totalPaid),
      totalPenalties: roundCents(totalPenalties),
      totalOutstanding: roundCents(totalOutstanding + totalPenalties),
      receivableCount: receivables.length,
      penaltyCount: penalties.length,
      openCount: receivables.filter(r => r.status === "open" || r.status === "partial").length,
    };
  }

  async getApartmentBalanceByPeriod(tenantId: string, apartmentId: string, periodYear: number, periodMonth: number) {
    const receivables = await this.tx.receivable.findMany({
      where: {
        tenantId,
        apartmentId,
        periodYear,
        periodMonth,
      },
    });

    const totalOriginal = receivables.reduce((s, r) => s + r.amountOriginal, 0);
    const totalPaid = receivables.reduce((s, r) => s + r.amountPaid, 0);
    const totalOutstanding = receivables.reduce((s, r) => s + r.amountOutstanding, 0);

    return {
      apartmentId,
      periodYear,
      periodMonth,
      totalOriginal: roundCents(totalOriginal),
      totalPaid: roundCents(totalPaid),
      totalOutstanding: roundCents(totalOutstanding),
      receivableCount: receivables.length,
      openCount: receivables.filter(r => r.status === "open" || r.status === "partial").length,
    };
  }
}

// ===========================================================================
// WAVE C — PENALTY ENGINE
// ===========================================================================

export class PenaltyEngine {
  constructor(private tx: TxClient) {}

  async generatePenalties(
    tenantId: string,
    periodYear: number,
    periodMonth: number,
    annualRate: number,
  ): Promise<number> {
    const overdueReceivables = await this.tx.receivable.findMany({
      where: {
        tenantId,
        status: { in: ["open", "partial"] },
        amountOutstanding: { gt: 0 },
        dueDate: { lt: new Date(`${periodYear}-${periodMonth}-01`) },
      },
      orderBy: { createdAt: "asc" },
    });

    if (overdueReceivables.length === 0) return 0;

    const existingPenalties = await this.tx.penaltyEntry.findMany({
      where: {
        tenantId,
        periodYear,
        periodMonth,
        sourceReceivableId: { in: overdueReceivables.map(r => r.id) },
      },
      select: { sourceReceivableId: true },
    });
    const existingIds = new Set(existingPenalties.map(p => p.sourceReceivableId));

    let created = 0;

    for (const rec of overdueReceivables) {
      if (existingIds.has(rec.id)) continue;

      const daysOverdue = rec.dueDate
        ? Math.floor((Date.now() - rec.dueDate.getTime()) / (1000 * 60 * 60 * 24))
        : 30;
      const monthlyRate = annualRate / 12;
      const penaltyAmount = roundCents(rec.amountOutstanding * monthlyRate * Math.max(daysOverdue / 30, 1));

      if (penaltyAmount <= 0) continue;

      await this.tx.penaltyEntry.create({
        data: {
          tenantId,
          apartmentId: rec.apartmentId,
          sourceReceivableId: rec.id,
          amount: penaltyAmount,
          interestRate: annualRate,
          daysOverdue: Math.max(daysOverdue, 1),
          periodYear,
          periodMonth,
        },
      });

      await this.tx.receivable.create({
        data: {
          tenantId,
          apartmentId: rec.apartmentId,
          costCategoryId: rec.costCategoryId,
          sourceType: "penalty",
          sourceReferenceId: rec.id,
          amountOriginal: penaltyAmount,
          amountOutstanding: penaltyAmount,
          amountPaid: 0,
          status: "open",
          periodYear,
          periodMonth,
        },
      });

      created++;
    }

    return created;
  }
}

// ===========================================================================
// WAVE C — TRACEABILITY
// ===========================================================================

export async function getReceivableTraceability(
  tx: TxClient,
  receivableId: string,
) {
  const receivable = await tx.receivable.findUnique({
    where: { id: receivableId },
    include: {
      chargeLine: {
        include: {
          allocationItem: {
            include: {
              run: {
                include: {
                  allocationRule: true,
                  sourceCosts: {
                    include: { cost: true },
                    orderBy: { createdAt: "asc" },
                  },
                },
              },
            },
          },
        },
      },
      costCategory: true,
      paymentAllocations: {
        include: { payment: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  return receivable;
}