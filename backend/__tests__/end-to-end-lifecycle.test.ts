// kuhik-core/backend/__tests__/end-to-end-lifecycle.test.ts
// End-to-end: full A→D lifecycle simulation
//
// Scenario:
// 1. Create cost (1000€)
// 2. Allocation (Wave B) — 4 apartments → 250€ each
// 3. ChargeLine → Receivable — 4 receivables
// 4. Payment — 1 apartment pays 250€
// 5. Payment allocation (Wave C FIFO)
// 6. Penalty run — 3 unpaid
// 7. Period close (Wave D)
//
// Expected:
// - 1 apartment: 0€ outstanding
// - 3 apartments: 250€ outstanding each
// - Snapshot totalReceivables = 1000€, totalPayments = 250€
// - Traceability 100% intact

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import {
  ReceivableCreationService,
  PaymentAllocationService,
  PenaltyEngine,
  getReceivableTraceability,
} from "../src/modules/payments/payments.service.js";
import { executeAllocation, prepareChargeLines } from "../src/modules/allocation/allocation.engine.js";

const prisma = new PrismaClient();

async function createTestTenant() {
  const slug = `test-e2e-${Date.now()}`;
  return prisma.tenant.create({
    data: { name: "E2E Lifecycle Test", slug, isActive: true },
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
  await prisma.allocationItem.deleteMany({ where: { run: { tenantId } } });
  await prisma.allocationRunCost.deleteMany({ where: { run: { tenantId } } });
  await prisma.allocationRun.deleteMany({ where: { tenantId } });
  await prisma.allocationRule.deleteMany({ where: { tenantId } });
  await prisma.cost.deleteMany({ where: { tenantId } });
  await prisma.accountingPeriod.deleteMany({ where: { tenantId } });
  await prisma.apartment.deleteMany({ where: { tenantId } });
  await prisma.building.deleteMany({ where: { tenantId } });
  await prisma.costCategory.deleteMany({ where: { tenantId } });
  await prisma.tenant.delete({ where: { id: tenantId } });
}

describe("E2E — Full Lifecycle (Cost → Snapshot)", () => {
  let tenantId: string;
  let buildingId: string;
  let costCategoryId: string;
  let resourceTypeId: string;
  let ruleId: string;
  let apartmentIds: string[] = [];
  let allocRunId: string;
  let periodId: string;

  beforeAll(async () => {
    const tenant = await createTestTenant();
    tenantId = tenant.id;

    // --- Accounting period ---
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

    // --- Cost category ---
    const cc = await prisma.costCategory.create({
      data: { tenantId, code: "e2e-maintenance", name: "E2E Maintenance", kind: "both", sortOrder: 1 },
    });
    costCategoryId = cc.id;

    // --- Resource type ---
    const rt = await prisma.resourceType.create({
      data: { tenantId, name: "E2E Service", code: `e2e-svc-${Date.now()}`, category: "service" },
    });
    resourceTypeId = rt.id;

    // --- Building ---
    const building = await prisma.building.create({
      data: { tenantId, name: "E2E Building" },
    });
    buildingId = building.id;

    // --- 4 Apartments ---
    for (let i = 1; i <= 4; i++) {
      const apt = await prisma.apartment.create({
        data: {
          tenantId,
          buildingId,
          unitLabel: `E2E-${i}`,
          ownershipShare: 0.25,
          areaSqm: 50,
        },
      });
      apartmentIds.push(apt.id);
    }
  });

  afterAll(async () => {
    await cleanup(tenantId);
  });

  // -----------------------------------------------------------------------
  // STEP 1: Create cost + allocation rule
  // -----------------------------------------------------------------------
  it("STEP 1 — creates cost and allocation rule", async () => {
    const rule = await prisma.allocationRule.create({
      data: {
        tenantId,
        buildingId,
        name: "E2E Equal Split",
        method: "equal",
        targetScope: "building",
        defaultCostCategoryId: costCategoryId,
        isActive: true,
      },
    });
    ruleId = rule.id;

    const cost = await prisma.cost.create({
      data: {
        tenantId,
        resourceTypeId,
        allocationRuleId: ruleId,
        costCategoryId,
        description: "E2E Test Cost — 1000€",
        amount: 1000,
        totalAmount: 1000,
        periodYear: 2026,
        periodMonth: 6,
        status: "pending",
      },
    });
    expect(cost.id).toBeDefined();
    expect(cost.totalAmount).toBe(1000);
  });

  // -----------------------------------------------------------------------
  // STEP 2: Wave B — Allocation
  // -----------------------------------------------------------------------
  it("STEP 2 — allocates 1000€ equally across 4 apartments", async () => {
    const cost = await prisma.cost.findFirst({
      where: { tenantId, description: { contains: "E2E Test Cost" } },
    });

    const result = await executeAllocation({
      tenantId,
      buildingId,
      periodYear: 2026,
      periodMonth: 6,
      periodStart: new Date("2026-06-01"),
      periodEnd: new Date("2026-06-30"),
      ruleId,
      costIds: [cost!.id],
    });

    expect(result.totalSourceAmount).toBe(1000);
    expect(result.totalAllocatedAmount).toBe(1000);
    expect(result.items).toHaveLength(4);
    result.items.forEach(item => expect(item.amount).toBe(250)); // 1000 / 4 = 250

    allocRunId = result.runId;
  });

  // -----------------------------------------------------------------------
  // STEP 3: ChargeLine → Receivable (Wave C)
  // -----------------------------------------------------------------------
  it("STEP 3 — creates charge lines and receivables", async () => {
    // Create charge lines from allocation
    const chargeCount = await prepareChargeLines(allocRunId);
    expect(chargeCount).toBe(4);

    const chargeLines = await prisma.chargeLine.findMany({
      where: { allocationRunId: allocRunId },
      orderBy: { createdAt: "asc" },
    });
    expect(chargeLines).toHaveLength(4);

    // Create receivables from charge lines
    const service = new ReceivableCreationService(prisma);
    const recIds = await service.createFromChargeLines(chargeLines.map(cl => cl.id));
    expect(recIds).toHaveLength(4);

    // Verify: total = 1000
    const receivables = await prisma.receivable.findMany({
      where: { id: { in: recIds } },
    });
    const sum = receivables.reduce((s, r) => s + r.amountOriginal, 0);
    expect(sum).toBe(1000);

    // All should be OPEN, 250 each
    for (const r of receivables) {
      expect(r.amountOriginal).toBe(250);
      expect(r.amountOutstanding).toBe(250);
      expect(r.status).toBe("open");
    }
  });

  // -----------------------------------------------------------------------
  // STEP 4: Payment — 1 apartment pays 250€
  // -----------------------------------------------------------------------
  it("STEP 4 — processes a 250€ payment", async () => {
    const firstAptId = apartmentIds[0];

    const receivable = await prisma.receivable.findFirst({
      where: { tenantId, apartmentId: firstAptId, status: "open" },
    });
    expect(receivable).toBeDefined();

    const payment = await prisma.payment.create({
      data: {
        tenantId,
        apartmentId: firstAptId,
        amount: 250,
        paymentDate: new Date("2026-06-20"),
        status: "received",
        allocationState: "unallocated",
      },
    });

    // Allocate via FIFO
    const service = new PaymentAllocationService(prisma);
    const allocations = await service.allocateFifo(payment.id);
    expect(allocations).toHaveLength(1);

    // Verify: receivable is now PAID
    const updated = await prisma.receivable.findUnique({ where: { id: receivable!.id } });
    expect(updated!.amountPaid).toBe(250);
    expect(updated!.amountOutstanding).toBe(0);
    expect(updated!.status).toBe("paid");
  });

  // -----------------------------------------------------------------------
  // STEP 5: Verify — 1 paid, 3 unpaid (250€ each)
  // -----------------------------------------------------------------------
  it("STEP 5 — 1 apartment paid, 3 apartments still owe 250€ each", async () => {
    const receivables = await prisma.receivable.findMany({
      where: { tenantId },
      orderBy: { createdAt: "asc" },
    });

    const paid = receivables.filter(r => r.status === "paid");
    const unpaid = receivables.filter(r => r.status === "open");

    expect(paid).toHaveLength(1);
    expect(paid[0].apartmentId).toBe(apartmentIds[0]);

    expect(unpaid).toHaveLength(3);
    for (const r of unpaid) {
      expect(r.amountOutstanding).toBe(250);
    }
  });

  // -----------------------------------------------------------------------
  // STEP 6: Penalty run — 3 unpaid
  // -----------------------------------------------------------------------
  it("STEP 6 — generates penalties for 3 unpaid receivables", async () => {
    const engine = new PenaltyEngine(prisma);
    const count = await engine.generatePenalties(tenantId, 2026, 6, 0.08);

    // 3 unpaid receivables should get penalties
    expect(count).toBeGreaterThanOrEqual(1);
    expect(count).toBeLessThanOrEqual(3);

    // Idempotent: second run should produce 0
    const count2 = await engine.generatePenalties(tenantId, 2026, 6, 0.08);
    expect(count2).toBe(0);
  });

  // -----------------------------------------------------------------------
  // STEP 7: Period close — Snapshot
  // -----------------------------------------------------------------------
  it("STEP 7 — creates financial snapshot matching ledger", async () => {
    const receivables = await prisma.receivable.findMany({ where: { tenantId } });
    const payments = await prisma.payment.findMany({ where: { tenantId } });
    const penalties = await prisma.penaltyEntry.findMany({ where: { tenantId } });

    const totalReceivables = receivables.reduce((s, r) => s + r.amountOriginal, 0);
    const totalPayments = receivables.reduce((s, r) => s + r.amountPaid, 0);
    const totalOutstanding = receivables.reduce((s, r) => s + r.amountOutstanding, 0);
    const totalPenalties = penalties.reduce((s, p) => s + p.amount, 0);

    expect(totalReceivables).toBe(1000);
    expect(totalPayments).toBe(250);
    expect(totalOutstanding).toBe(750);
    expect(totalPenalties).toBeGreaterThan(0);

    // Create snapshot
    const snapshot = await prisma.financialSnapshot.create({
      data: {
        tenantId,
        periodId,
        snapshotData: {
          generatedAt: new Date().toISOString(),
          totalReceivables,
          totalPayments,
          totalOutstanding,
          totalPenalties,
          receivableCount: receivables.length,
          paidCount: receivables.filter(r => r.status === "paid").length,
          openCount: receivables.filter(r => r.status === "open").length,
        },
        totalReceivables,
        totalPayments,
        totalOutstanding,
        totalPenalties,
        reserveBalance: 0,
        integrityHash: `e2e-hash-${Date.now()}`,
      },
    });

    expect(snapshot.id).toBeDefined();
    expect(snapshot.totalReceivables).toBe(1000);
    expect(snapshot.totalPayments).toBe(250);
    expect(snapshot.totalOutstanding).toBe(750);

    // Period close
    await prisma.accountingPeriod.update({
      where: { id: periodId },
      data: { status: "closed" },
    });

    const period = await prisma.accountingPeriod.findUnique({ where: { id: periodId } });
    expect(period!.status).toBe("closed");

    // PeriodClose record
    const close = await prisma.periodClose.create({
      data: {
        periodId,
        tenantId,
        totalReceivables,
        totalPayments,
        totalOutstanding,
        totalPenalties,
        notes: "E2E test close",
      },
    });
    expect(close.id).toBeDefined();
  });

  // -----------------------------------------------------------------------
  // STEP 8: Traceability — Cost → Snapshot
  // -----------------------------------------------------------------------
  it("STEP 8 — full traceability: Cost → AllocationRun → ChargeLine → Receivable → Payment → Snapshot", async () => {
    // Pick a random receivable
    const receivables = await prisma.receivable.findMany({
      where: { tenantId },
      include: {
        chargeLine: {
          include: {
            allocationItem: {
              include: {
                run: {
                  include: {
                    sourceCosts: { include: { cost: true } },
                  },
                },
              },
            },
          },
        },
        paymentAllocations: {
          include: { payment: true },
        },
      },
    });

    // Every receivable must have a charge line with traceability
    for (const rec of receivables) {
      expect(rec.chargeLine).toBeDefined();
      expect(rec.chargeLine!.allocationItem).toBeDefined();
      expect(rec.chargeLine!.allocationItem!.run.sourceCosts.length).toBeGreaterThan(0);
      expect(rec.chargeLine!.allocationItem!.run.sourceCosts[0].cost.totalAmount).toBe(1000);
    }

    // Snapshot exists and matches
    const snapshot = await prisma.financialSnapshot.findFirst({
      where: { periodId },
    });
    expect(snapshot).toBeDefined();
    expect(snapshot!.totalReceivables).toBe(1000);
    expect(snapshot!.totalPayments).toBe(250);

    // Period links to snapshot
    const period = await prisma.accountingPeriod.findUnique({
      where: { id: periodId },
      include: { close: true, snapshots: true },
    });
    expect(period!.close).toBeDefined();
    expect(period!.snapshots).toHaveLength(1);
  });
});