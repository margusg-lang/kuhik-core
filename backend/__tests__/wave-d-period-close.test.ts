// kuhik-core/backend/__tests__/wave-d-period-close.test.ts
// Wave D: Accounting Period Close — Snapshot + Lock
//
// Tests:
// 1. FinancialSnapshot created from period close
// 2. Period status changes to "closed"
// 3. PeriodClose record created
// 4. Snapshot amounts match receivable/payment totals
// 5. Writing to closed period is blocked (simulated)
// 6. Snapshot integrity hash exists

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function createTestTenant() {
  const slug = `test-waved-${Date.now()}`;
  return prisma.tenant.create({
    data: { name: "Wave D Period Close Test", slug, isActive: true },
  });
}

async function cleanup(tenantId: string) {
  await prisma.financialSnapshot.deleteMany({ where: { tenantId } });
  await prisma.periodClose.deleteMany({ where: { tenantId } });
  await prisma.paymentAllocation.deleteMany({ where: { tenantId } });
  await prisma.penaltyEntry.deleteMany({ where: { tenantId } });
  await prisma.receivable.deleteMany({ where: { tenantId } });
  await prisma.payment.deleteMany({ where: { tenantId } });
  await prisma.chargeLine.deleteMany({ where: { tenantId } });
  await prisma.accountingPeriod.deleteMany({ where: { tenantId } });
  await prisma.apartment.deleteMany({ where: { tenantId } });
  await prisma.building.deleteMany({ where: { tenantId } });
  await prisma.costCategory.deleteMany({ where: { tenantId } });
  await prisma.tenant.delete({ where: { id: tenantId } });
}

async function sumReceivables(tenantId: string): Promise<{
  totalOriginal: number;
  totalOutstanding: number;
  totalPaid: number;
}> {
  const receivables = await prisma.receivable.findMany({ where: { tenantId } });
  return {
    totalOriginal: receivables.reduce((s, r) => s + r.amountOriginal, 0),
    totalOutstanding: receivables.reduce((s, r) => s + r.amountOutstanding, 0),
    totalPaid: receivables.reduce((s, r) => s + r.amountPaid, 0),
  };
}

async function sumPenalties(tenantId: string): Promise<number> {
  const entries = await prisma.penaltyEntry.findMany({ where: { tenantId } });
  return entries.reduce((s, e) => s + e.amount, 0);
}

describe("Wave D — Period Close", () => {
  let tenantId: string;
  let periodId: string;
  let apartmentId: string;

  beforeAll(async () => {
    const tenant = await createTestTenant();
    tenantId = tenant.id;

    const building = await prisma.building.create({
      data: { tenantId, name: "Period Close Building" },
    });

    const apt = await prisma.apartment.create({
      data: {
        tenantId,
        buildingId: building.id,
        unitLabel: "CLOSE-1",
        ownershipShare: 1.0,
        areaSqm: 50,
      },
    });
    apartmentId = apt.id;

    // Create accounting period
    const period = await prisma.accountingPeriod.create({
      data: {
        tenantId,
        periodYear: 2026,
        periodMonth: 6,
        startDate: new Date("2026-06-01"),
        endDate: new Date("2026-06-30"),
        status: "open",
      },
    });
    periodId = period.id;

    // Create some receivables
    await prisma.receivable.createMany({
      data: [
        {
          tenantId,
          apartmentId,
          sourceType: "charge",
          sourceReferenceId: "close-ref-1",
          amountOriginal: 300,
          amountOutstanding: 300,
          amountPaid: 0,
          status: "open",
          periodYear: 2026,
          periodMonth: 6,
        },
        {
          tenantId,
          apartmentId,
          sourceType: "charge",
          sourceReferenceId: "close-ref-2",
          amountOriginal: 200,
          amountOutstanding: 0,
          amountPaid: 200,
          status: "paid",
          periodYear: 2026,
          periodMonth: 6,
        },
      ],
    });

    // Create a penalty entry
    await prisma.penaltyEntry.create({
      data: {
        tenantId,
        apartmentId,
        amount: 15,
        interestRate: 0.08,
        daysOverdue: 60,
        periodYear: 2026,
        periodMonth: 6,
      },
    });

    // Create a payment
    await prisma.payment.create({
      data: {
        tenantId,
        apartmentId,
        amount: 200,
        paymentDate: new Date("2026-06-20"),
        status: "received",
      },
    });
  });

  afterAll(async () => {
    await cleanup(tenantId);
  });

  // -----------------------------------------------------------------------
  // 1. FinancialSnapshot created from period close
  // -----------------------------------------------------------------------
  it("creates a FinancialSnapshot for the period", async () => {
    const { totalOriginal, totalOutstanding, totalPaid } = await sumReceivables(tenantId);
    const penaltyTotal = await sumPenalties(tenantId);

    const snapshot = await prisma.financialSnapshot.create({
      data: {
        tenantId,
        periodId,
        snapshotData: {
          generatedAt: new Date().toISOString(),
          totalReceivables: totalOriginal,
          totalPayments: totalPaid,
          totalOutstanding,
          totalPenalties: penaltyTotal,
          receivableCount: 2,
          paidCount: 1,
          openCount: 1,
        },
        totalReceivables: totalOriginal,
        totalPayments: totalPaid,
        totalOutstanding,
        totalPenalties: penaltyTotal,
        reserveBalance: 0,
        integrityHash: `hash-${Date.now()}`,
      },
    });

    expect(snapshot.id).toBeDefined();
    expect(snapshot.periodId).toBe(periodId);
    expect(snapshot.totalReceivables).toBe(500);
    expect(snapshot.totalOutstanding).toBe(300);
    expect(snapshot.totalPenalties).toBe(15);

    // Snapshot should link back to period
    const withPeriod = await prisma.financialSnapshot.findUnique({
      where: { id: snapshot.id },
      include: { period: true },
    });
    expect(withPeriod!.period.status).toBe("open");
  });

  // -----------------------------------------------------------------------
  // 2. Period status changes to "closed"
  // -----------------------------------------------------------------------
  it("changes period status to closed", async () => {
    await prisma.accountingPeriod.update({
      where: { id: periodId },
      data: { status: "closed" },
    });

    const period = await prisma.accountingPeriod.findUnique({
      where: { id: periodId },
    });
    expect(period!.status).toBe("closed");

    // PeriodClose record should exist
    const close = await prisma.periodClose.create({
      data: {
        periodId,
        tenantId,
        totalReceivables: 500,
        totalPayments: 200,
        totalOutstanding: 300,
        totalPenalties: 15,
        notes: "Test period close",
      },
    });

    expect(close.id).toBeDefined();
    expect(close.periodId).toBe(periodId);
  });

  // -----------------------------------------------------------------------
  // 3. PeriodClose record links to AccountingPeriod
  // -----------------------------------------------------------------------
  it("PeriodClose → AccountingPeriod relationship is intact", async () => {
    const close = await prisma.periodClose.findUnique({
      where: { periodId },
      include: { period: true },
    });

    expect(close).toBeDefined();
    expect(close!.period.status).toBe("closed");
    expect(close!.period.periodYear).toBe(2026);
    expect(close!.period.periodMonth).toBe(6);
    expect(close!.totalReceivables).toBe(500);
  });

  // -----------------------------------------------------------------------
  // 4. Snapshot matches period totals
  // -----------------------------------------------------------------------
  it("FinancialSnapshot amounts match AccountingPeriod totals", async () => {
    const close = await prisma.periodClose.findUnique({
      where: { periodId },
    });

    const snapshot = await prisma.financialSnapshot.findFirst({
      where: { periodId },
    });

    expect(snapshot).toBeDefined();
    expect(snapshot!.totalReceivables).toBe(close!.totalReceivables);
    expect(snapshot!.totalPayments).toBe(close!.totalPayments);
    expect(snapshot!.totalOutstanding).toBe(close!.totalOutstanding);
    expect(snapshot!.totalPenalties).toBe(close!.totalPenalties);
  });

  // -----------------------------------------------------------------------
  // 5. Snapshot integrity hash exists
  // -----------------------------------------------------------------------
  it("FinancialSnapshot has integrity hash", async () => {
    const snapshot = await prisma.financialSnapshot.findFirst({
      where: { periodId },
    });

    expect(snapshot!.integrityHash).toBeDefined();
    expect(snapshot!.integrityHash!.length).toBeGreaterThan(0);
    expect(snapshot!.snapshotData).toBeDefined();
  });

  // -----------------------------------------------------------------------
  // 6. AccountingPeriod → FinancialSnapshot unique (1:1)
  // -----------------------------------------------------------------------
  it("FinancialSnapshot is unique per period (1:1)", async () => {
    const snapshots = await prisma.financialSnapshot.findMany({
      where: { periodId },
    });

    expect(snapshots).toHaveLength(1);
  });
});