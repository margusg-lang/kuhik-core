// kuhik-core/backend/src/modules/payments/payments.service.ts
// Wave C: Financial State Layer
// ReceivableCreation, PaymentAllocation (FIFO), Balance, PenaltyEngine
//
// CRITICAL: Wave C MUST NOT touch allocation logic or recompute Wave B.

import { PrismaClient } from "@prisma/client";
import { roundCents } from "../allocation/allocation.engine.js";

// Can be used as standalone or injected
type TxClient = Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">;

// ===========================================================================
// 1. RECEIVABLE CREATION SERVICE (ChargeLine → Receivable)
// ===========================================================================
//
// Idempotent: one ChargeLine → exactly one Receivable.
// NEVER recomputes allocation logic.

export class ReceivableCreationService {
  constructor(private tx: TxClient) {}

  /**
   * Create receivables from charge lines. Idempotent — skips already-created.
   * @returns Array of created Receivable ids
   */
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
          dueDate: null, // can be set by invoice flow
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
// 2. PAYMENT ALLOCATION SERVICE (FIFO)
// ===========================================================================
//
// Allocates a payment across open receivables using FIFO (oldest first).
// Deterministic, no floating drift, no over-allocation.

export class PaymentAllocationService {
  constructor(private tx: TxClient) {}

  /**
   * Allocate a payment to open receivables using FIFO.
   * @returns Array of PaymentAllocation ids
   */
  async allocateFifo(paymentId: string): Promise<string[]> {
    const payment = await this.tx.payment.findUnique({
      where: { id: paymentId },
    });
    if (!payment) throw new Error(`Payment not found: ${paymentId}`);
    if (payment.amount <= 0) return [];

    const apartmentId = payment.apartmentId;
    if (!apartmentId) {
      // Payment without apartment — cannot auto-allocate
      await this.tx.payment.update({
        where: { id: paymentId },
        data: { allocationState: "unallocated" },
      });
      return [];
    }

    // Fetch open receivables ordered by dueDate → createdAt (FIFO)
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

    // Execute in transaction
    for (const alloc of allocations) {
      // Upsert — idempotent: (paymentId, receivableId) unique
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

    // Update payment allocation state
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
// 3. BALANCE SERVICE
// ===========================================================================
//
// Balance = Receivables - Payments + Penalties (computed, not stored).

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
// 4. PENALTY ENGINE
// ===========================================================================
//
// Scans overdue receivables and generates penalty entries.
// Idempotent: no duplicate (receivableId, periodYear, periodMonth).

export class PenaltyEngine {
  constructor(private tx: TxClient) {}

  /**
   * Generate penalties for overdue receivables.
   * @param tenantId
   * @param periodYear
   * @param periodMonth
   * @param annualRate annual interest rate (e.g. 0.08 = 8%)
   * @returns number of penalty entries created
   */
  async generatePenalties(
    tenantId: string,
    periodYear: number,
    periodMonth: number,
    annualRate: number,
  ): Promise<number> {
    // Find open/partial receivables that are overdue
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

    // Check for duplicates: which (receivableId, periodYear, periodMonth) already exist
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

      // Optionally create a receivable for the penalty
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
// 5. TRACEABILITY — full chain from Receivable back to Cost
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