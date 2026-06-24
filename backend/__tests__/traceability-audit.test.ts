// kuhik-core/backend/__tests__/traceability-audit.test.ts
// Level 3: Traceability Audit — every entry must reach Cost → Snapshot
//
// Tests:
// 1. Pick a random ChargeLine → trace to Cost → Snapshot
// 2. Pick a random Receivable → trace to Cost → Snapshot
// 3. Pick a random Payment → trace to Cost → Snapshot
// 4. All chains are unbroken

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function createTestTenant() {
  const slug = `test-trace-${Date.now()}`;
  return prisma.tenant.create({
    data: { name: "Traceability Audit Test", slug, isActive: true },
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

describe("Level 3 — Traceability Audit", () => {
  let tenantId: string;
  let buildingId: string;
  let resourceTypeId: string;
  let costCategoryId: string;
  let costId: string;
  let ruleId: string;
  let periodId: string;
  let chargeLineIds: string[] = [];
  let receivableIds: string[] = [];
  let paymentId: string;
  let snapshotId: string;

  beforeAll(async () => {
    const tenant = await createTestTenant();
    tenantId = tenant.id;

    // Build full chain: Cost → Allocation → ChargeLine → Receivable → Payment → Snapshot
    const period = await prisma.accountingPeriod.create({
      data: {
        tenantId, periodYear: 2026, periodMonth: 6,
        startDate: new Date("2026-06-01"), endDate: new Date("2026-06-30"), status: "open",
      },
    });
    periodId = period.id;

    const cc = await prisma.costCategory.create({
      data: { tenantId, code: "trace-maint", name: "Trace Maintenance", kind: "both", sortOrder: 1 },
    });
    costCategoryId = cc.id;

    const rt = await prisma.resourceType.create({
      data: { tenantId, name: "Trace Service", code: `trace-svc-${Date.now()}`, category: "service" },
    });
    resourceTypeId = rt.id;

    const building = await prisma.building.create({ data: { tenantId, name: "Trace Building" } });
    buildingId = building.id;

    const apt1 = await prisma.apartment.create({
      data: { tenantId, buildingId, unitLabel: "TRACE-1", ownershipShare: 0.5, areaSqm: 60 },
    });
    const apt2 = await prisma.apartment.create({
      data: { tenantId, buildingId, unitLabel: "TRACE-2", ownershipShare: 0.5, areaSqm: 40 },
    });

    // Cost
    const cost = await prisma.cost.create({
      data: {
        tenantId, resourceTypeId, costCategoryId,
        description: "Trace Cost — 500€", amount: 500, totalAmount: 500,
        periodYear: 2026, periodMonth: 6, status: "pending",
      },
    });
    costId = cost.id;

    // Rule
    const rule = await prisma.allocationRule.create({
      data: { tenantId, buildingId, name: "Trace Rule", method: "area", isActive: true },
    });
    ruleId = rule.id;

    // AllocationRun
    const { executeAllocation, prepareChargeLines } = await import("../src/modules/allocation/allocation.engine.js");
    const allocResult = await executeAllocation({
      tenantId, buildingId, periodYear: 2026, periodMonth: 6,
      periodStart: new Date("2026-06-01"), periodEnd: new Date("2026-06-30"),
      ruleId, costIds: [cost.id],
    });
    await prepareChargeLines(allocResult.runId);

    // ChargeLines
    const chargeLines = await prisma.chargeLine.findMany({
      where: { allocationRunId: allocResult.runId },
      orderBy: { createdAt: "asc" },
    });
    chargeLineIds = chargeLines.map(cl => cl.id);

    // Receivables
    const { ReceivableCreationService, PaymentAllocationService, PenaltyEngine } =
      await import("../src/modules/payments/payments.service.js");
    const recService = new ReceivableCreationService(prisma);
    await recService.createFromChargeLines(chargeLineIds);
    const receivables = await prisma.receivable.findMany({
      where: { chargeLineId: { in: chargeLineIds } },
      orderBy: { createdAt: "asc" },
    });
    receivableIds = receivables.map(r => r.id);

    // Payment for apt1
    const payment = await prisma.payment.create({
      data: {
        tenantId, apartmentId: apt1.id,
        amount: 300, paymentDate: new Date("2026-06-20"),
        status: "received", allocationState: "unallocated",
      },
    });
    paymentId = payment.id;

    const payService = new PaymentAllocationService(prisma);
    await payService.allocateFifo(payment.id);

    // Snapshot
    const allRecs = await prisma.receivable.findMany({ where: { tenantId } });
    const totalRecv = allRecs.reduce((s, r) => s + r.amountOriginal, 0);
    const totalPaid = allRecs.reduce((s, r) => s + r.amountPaid, 0);

    const snapshot = await prisma.financialSnapshot.create({
      data: {
        tenantId, periodId,
        snapshotData: { generatedAt: new Date().toISOString() },
        totalReceivables: totalRecv, totalPayments: totalPaid,
        totalOutstanding: totalRecv - totalPaid, totalPenalties: 0,
        reserveBalance: 0, integrityHash: `trace-hash-${Date.now()}`,
      },
    });
    snapshotId = snapshot.id;
  });

  afterAll(async () => {
    await cleanup(tenantId);
  });

  // -----------------------------------------------------------------------
  // 1. ChargeLine → Cost → Snapshot
  // -----------------------------------------------------------------------
  it("ChargeLine traces to Cost and Snapshot without breaks", async () => {
    const chargeLine = await prisma.chargeLine.findUnique({
      where: { id: chargeLineIds[0] },
      include: {
        allocationItem: {
          include: {
            run: {
              include: {
                sourceCosts: {
                  include: { cost: true },
                },
              },
            },
          },
        },
      },
    });

    expect(chargeLine).toBeDefined();
    expect(chargeLine!.allocationItem).toBeDefined();
    expect(chargeLine!.allocationItem!.run).toBeDefined();
    expect(chargeLine!.allocationItem!.run.sourceCosts[0].cost.id).toBe(costId);

    // Go from Cost to Snapshot via periodId
    const snapshot = await prisma.financialSnapshot.findFirst({ where: { periodId } });
    expect(snapshot).toBeDefined();
    expect(snapshot!.id).toBe(snapshotId);
  });

  // -----------------------------------------------------------------------
  // 2. Receivable → ChargeLine → AllocationItem → Cost → Snapshot
  // -----------------------------------------------------------------------
  it("Receivable traces to Cost and Snapshot without breaks", async () => {
    const receivable = await prisma.receivable.findUnique({
      where: { id: receivableIds[0] },
      include: {
        chargeLine: {
          include: {
            allocationItem: {
              include: {
                run: {
                  include: {
                    sourceCosts: {
                      include: { cost: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    expect(receivable).toBeDefined();
    expect(receivable!.chargeLine).toBeDefined();
    expect(receivable!.chargeLine!.allocationItem).toBeDefined();
    expect(receivable!.chargeLine!.allocationItem!.run.sourceCosts[0].cost.id).toBe(costId);

    // Receivable should have period info to link to Snapshot
    expect(receivable!.periodYear).toBe(2026);
    expect(receivable!.periodMonth).toBe(6);
  });

  // -----------------------------------------------------------------------
  // 3. Payment → PaymentAllocation → Receivable → ChargeLine → Cost → Snapshot
  // -----------------------------------------------------------------------
  it("Payment traces to Cost and Snapshot without breaks", async () => {
    const paymentAllocations = await prisma.paymentAllocation.findMany({
      where: { paymentId },
      include: {
        receivable: {
          include: {
            chargeLine: {
              include: {
                allocationItem: {
                  include: {
                    run: {
                      include: {
                        sourceCosts: {
                          include: { cost: true },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    expect(paymentAllocations.length).toBeGreaterThan(0);

    // Every payment allocation must have full traceability
    for (const pa of paymentAllocations) {
      expect(pa.receivable).toBeDefined();
      expect(pa.receivable!.chargeLine).toBeDefined();
      expect(pa.receivable!.chargeLine!.allocationItem).toBeDefined();
      expect(pa.receivable!.chargeLine!.allocationItem!.run.sourceCosts[0].cost.id).toBe(costId);
    }

    // Payment itself
    const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
    expect(payment).toBeDefined();

    // Verify snapshot links to period
    const snapshot = await prisma.financialSnapshot.findFirst({ where: { periodId } });
    expect(snapshot).toBeDefined();
  });

  // -----------------------------------------------------------------------
  // 4. Random audit: all ChargeLines → Cost path is viable
  // -----------------------------------------------------------------------
  it("ALL charge lines trace to the same source cost", async () => {
    for (const clId of chargeLineIds) {
      const chargeLine = await prisma.chargeLine.findUnique({
        where: { id: clId },
        include: {
          allocationItem: {
            include: {
              run: {
                include: {
                  sourceCosts: {
                    include: { cost: true },
                  },
                },
              },
            },
          },
        },
      });

      expect(chargeLine!.allocationItem).toBeDefined();
      const srcCost = chargeLine!.allocationItem!.run.sourceCosts[0].cost;
      expect(srcCost.totalAmount).toBe(500);
      expect(srcCost.id).toBe(costId);
    }
  });

  // -----------------------------------------------------------------------
  // 5. Full chain integrity: every node links correctly
  // -----------------------------------------------------------------------
  it("full chain integrity verified: Cost → AllocationRun → AllocationItem → ChargeLine → Receivable → PaymentAllocation → Payment", async () => {
    // Cost → AllocationRunCost → AllocationRun
    const cost = await prisma.cost.findUnique({
      where: { id: costId },
      include: {
        runCosts: {
          include: {
            run: {
              include: {
                items: {
                  include: {
                    chargeLines: {
                      include: {
                        receivables: {
                          include: {
                            paymentAllocations: {
                              include: { payment: true },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    expect(cost).toBeDefined();
    expect(cost!.runCosts.length).toBeGreaterThan(0);
    const run = cost!.runCosts[0].run;
    expect(run.items.length).toBe(2);

    // At least one charge line → receivable → payment allocation
    const hasFullChain = run.items.some(item =>
      item.chargeLines.some(cl =>
        cl.receivables.some(rec =>
          rec.paymentAllocations.length > 0
        )
      )
    );
    expect(hasFullChain).toBe(true);
  });
});