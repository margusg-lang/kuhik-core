// kuhik-core/backend/__tests__/allocation-traceability.test.ts
// Wave B: Allocation engine determinism + traceability tests
//
// Tests:
// 1. Allocation rule creation
// 2. Equal split correctness
// 3. Ownership share correctness
// 4. Area-based correctness
// 5. Meter-based correctness
// 6. Rounding integrity (total = sum of items)
// 7. Determinism (same input → identical output)
// 8. ChargeLine creation from allocation
// 9. Full traceability chain
// 10. Backward compatibility

import { describe, it, expect, beforeAll } from "vitest";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function createTestTenant() {
  const slug = `test-waveb-${Date.now()}`;
  return prisma.tenant.create({
    data: { name: "Wave B Test", slug, isActive: true },
  });
}

async function createCostCategory(tenantId: string, code: string) {
  return prisma.costCategory.create({
    data: { tenantId, code, name: code, kind: "both", sortOrder: 10 },
  });
}

async function createResourceType(tenantId: string, name: string) {
  return prisma.resourceType.create({
    data: { tenantId, name, code: `${name.toLowerCase()}-${Date.now()}`, category: "utility" },
  });
}

async function createBuilding(tenantId: string) {
  return prisma.building.create({
    data: { tenantId, name: "Test Building" },
  });
}

async function createApartment(tenantId: string, buildingId: string, label: string, overrides: Record<string, any> = {}) {
  return prisma.apartment.create({
    data: {
      tenantId,
      buildingId,
      unitLabel: label,
      ownershipShare: 1.0,
      areaSqm: 50,
      heatedAreaSqm: 45,
      ...overrides,
    },
  });
}

async function createCost(tenantId: string, resourceTypeId: string, totalAmount: number, overrides: Record<string, any> = {}) {
  return prisma.cost.create({
    data: {
      tenantId,
      resourceTypeId,
      description: "Test cost",
      amount: totalAmount,
      totalAmount,
      periodYear: 2026,
      periodMonth: 6,
      status: "pending",
      ...overrides,
    },
  });
}

async function cleanup(tenantId: string) {
  await prisma.chargeLine.deleteMany({ where: { tenantId } });
  await prisma.allocationRunCost.deleteMany({ where: { run: { tenantId } } });
  await prisma.allocationItem.deleteMany({ where: { run: { tenantId } } });
  await prisma.allocationRun.deleteMany({ where: { tenantId } });
  await prisma.allocationRule.deleteMany({ where: { tenantId } });
  await prisma.cost.deleteMany({ where: { tenantId } });
  await prisma.resourceType.deleteMany({ where: { tenantId } });
  await prisma.apartmentMeterReading.deleteMany({ where: { tenantId } });
  await prisma.apartmentMeter.deleteMany({ where: { tenantId } });
  await prisma.apartmentPerson.deleteMany({ where: { tenantId } });
  await prisma.person.deleteMany({ where: { tenantId } });
  await prisma.ownershipHistory.deleteMany({ where: { tenantId } });
  await prisma.apartment.deleteMany({ where: { tenantId } });
  await prisma.building.deleteMany({ where: { tenantId } });
  await prisma.costCategory.deleteMany({ where: { tenantId } });
  await prisma.tenant.delete({ where: { id: tenantId } });
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe("Wave B — Allocation Traceability", () => {
  let tenantId: string;
  let buildingId: string;
  let resourceTypeId: string;
  let costCategoryId: string;
  let apt1Id: string;
  let apt2Id: string;
  let apt3Id: string;

  beforeAll(async () => {
    const tenant = await createTestTenant();
    tenantId = tenant.id;

    const cat = await createCostCategory(tenantId, "utilities");
    costCategoryId = cat.id;

    const rt = await createResourceType(tenantId, "Electricity");
    resourceTypeId = rt.id;

    const building = await createBuilding(tenantId);
    buildingId = building.id;

    const a1 = await createApartment(tenantId, buildingId, "A-1", { ownershipShare: 0.33, areaSqm: 60, heatedAreaSqm: 55 });
    apt1Id = a1.id;
    const a2 = await createApartment(tenantId, buildingId, "A-2", { ownershipShare: 0.33, areaSqm: 50, heatedAreaSqm: 45 });
    apt2Id = a2.id;
    const a3 = await createApartment(tenantId, buildingId, "A-3", { ownershipShare: 0.34, areaSqm: 70, heatedAreaSqm: 60 });
    apt3Id = a3.id;
  });

  afterAll(async () => {
    await cleanup(tenantId);
  });

  // -----------------------------------------------------------------------
  // 1. Allocation Rule
  // -----------------------------------------------------------------------
  it("creates an allocation rule", async () => {
    const rule = await prisma.allocationRule.create({
      data: {
        tenantId,
        buildingId,
        resourceTypeId,
        name: "Equal split electricity",
        method: "equal",
        targetScope: "building",
        defaultCostCategoryId: costCategoryId,
        isActive: true,
      },
    });

    expect(rule.id).toBeDefined();
    expect(rule.method).toBe("equal");
    expect(rule.isActive).toBe(true);
  });

  // -----------------------------------------------------------------------
  // 2. Equal split correctness
  // -----------------------------------------------------------------------
  it("allocates equal split correctly", async () => {
    const rule = await prisma.allocationRule.create({
      data: { tenantId, buildingId, name: "Equal test", method: "equal" },
    });
    const cost = await createCost(tenantId, resourceTypeId, 300.00);

    const { executeAllocation } = await import("../src/modules/allocation/allocation.engine.js");
    const result = await executeAllocation({
      tenantId,
      buildingId,
      periodYear: 2026,
      periodMonth: 6,
      periodStart: new Date("2026-06-01"),
      periodEnd: new Date("2026-06-30"),
      ruleId: rule.id,
      costIds: [cost.id],
    });

    expect(result.totalSourceAmount).toBe(300.00);
    expect(result.totalAllocatedAmount).toBe(300.00);
    expect(result.roundingRemainder).toBe(0);
    expect(result.items).toHaveLength(3);
    // Each should get exactly 100
    result.items.forEach(item => expect(item.amount).toBe(100.00));
    expect(result.items[0].method).toBe("equal");
  });

  // -----------------------------------------------------------------------
  // 3. Ownership share correctness
  // -----------------------------------------------------------------------
  it("allocates by ownership share correctly", async () => {
    const rule = await prisma.allocationRule.create({
      data: { tenantId, buildingId, name: "Share test", method: "ownership_share" },
    });
    const cost = await createCost(tenantId, resourceTypeId, 100.00);

    const { executeAllocation } = await import("../src/modules/allocation/allocation.engine.js");
    const result = await executeAllocation({
      tenantId,
      buildingId,
      periodYear: 2026,
      periodMonth: 6,
      periodStart: new Date("2026-06-01"),
      periodEnd: new Date("2026-06-30"),
      ruleId: rule.id,
      costIds: [cost.id],
    });

    expect(result.totalSourceAmount).toBe(100.00);
    expect(result.totalAllocatedAmount).toBe(100.00);
    // 0.33 + 0.33 + 0.34 = 1.0 → 33, 33, 34
    const amounts = result.items.map(i => i.amount).sort((a, b) => a - b);
    expect(amounts[0]).toBe(33); // 33% of 100
    expect(amounts[1]).toBe(33);
    expect(amounts[2]).toBe(34);
    expect(result.items[0].basisValue).toBeGreaterThan(0);
    expect(result.items[0].basisTotal).toBe(1.0);
  });

  // -----------------------------------------------------------------------
  // 4. Area-based correctness
  // -----------------------------------------------------------------------
  it("allocates by area correctly", async () => {
    const rule = await prisma.allocationRule.create({
      data: { tenantId, buildingId, name: "Area test", method: "area" },
    });
    const cost = await createCost(tenantId, resourceTypeId, 180.00);

    const { executeAllocation } = await import("../src/modules/allocation/allocation.engine.js");
    const result = await executeAllocation({
      tenantId,
      buildingId,
      periodYear: 2026,
      periodMonth: 6,
      periodStart: new Date("2026-06-01"),
      periodEnd: new Date("2026-06-30"),
      ruleId: rule.id,
      costIds: [cost.id],
    });

    expect(result.totalAllocatedAmount).toBe(180.00);
    expect(result.items).toHaveLength(3);
    // Areas: 60, 50, 70 = 180 total
    // A-1: 60/180 * 180 = 60
    // A-2: 50/180 * 180 = 50
    // A-3: 70/180 * 180 = 70
    expect(result.items[0].amount).toBe(60);
    expect(result.items[1].amount).toBe(50);
    expect(result.items[2].amount).toBe(70);
  });

  // -----------------------------------------------------------------------
  // 5. Meter-based correctness
  // -----------------------------------------------------------------------
  it("allocates by meter reading correctly", async () => {
    const meter = await prisma.apartmentMeter.create({
      data: { tenantId, apartmentId: apt1Id, meterType: "water", unit: "m3" },
    });
    await prisma.apartmentMeterReading.create({
      data: { meterId: meter.id, tenantId, value: 10, timestamp: new Date("2026-06-15") },
    });

    const rule = await prisma.allocationRule.create({
      data: { tenantId, buildingId, name: "Meter test", method: "meter_based" },
    });
    const cost = await createCost(tenantId, resourceTypeId, 100.00);

    const { executeAllocation } = await import("../src/modules/allocation/allocation.engine.js");
    const result = await executeAllocation({
      tenantId,
      buildingId,
      periodYear: 2026,
      periodMonth: 6,
      periodStart: new Date("2026-06-01"),
      periodEnd: new Date("2026-06-30"),
      ruleId: rule.id,
      costIds: [cost.id],
    });

    expect(result.totalAllocatedAmount).toBe(100.00);
    // Only apt1 has a reading (10); apt2 + apt3 have 0
    // Total basis = 10; apt1 gets 100% = 100; others get 0
    expect(result.items[0].amount).toBe(100);
    expect(result.items[1].amount).toBe(0);
    expect(result.items[2].amount).toBe(0);
  });

  // -----------------------------------------------------------------------
  // 6. Rounding integrity
  // -----------------------------------------------------------------------
  it("rounding is deterministic and total equals source", async () => {
    const rule = await prisma.allocationRule.create({
      data: { tenantId, buildingId, name: "Round test", method: "equal" },
    });
    // Use a non-divisible amount (3 apartments, 100 / 3 = 33.33 each ≈ 99.99)
    const cost = await createCost(tenantId, resourceTypeId, 100.00);

    const { executeAllocation } = await import("../src/modules/allocation/allocation.engine.js");
    const result = await executeAllocation({
      tenantId,
      buildingId,
      periodYear: 2026,
      periodMonth: 6,
      periodStart: new Date("2026-06-01"),
      periodEnd: new Date("2026-06-30"),
      ruleId: rule.id,
      costIds: [cost.id],
    });

    // Sum of items must equal source
    const sum = result.items.reduce((s, i) => s + i.amount, 0);
    expect(sum).toBe(result.totalSourceAmount);
    expect(sum).toBe(100.00);
  });

  // -----------------------------------------------------------------------
  // 7. Determinism
  // -----------------------------------------------------------------------
  it("same input produces identical output", async () => {
    const rule = await prisma.allocationRule.create({
      data: { tenantId, buildingId, name: "Determinism test", method: "ownership_share" },
    });
    const cost = await createCost(tenantId, resourceTypeId, 250.00, { periodMonth: 7 });

    const { executeAllocation } = await import("../src/modules/allocation/allocation.engine.js");
    const result1 = await executeAllocation({
      tenantId, buildingId,
      periodYear: 2026, periodMonth: 7,
      periodStart: new Date("2026-07-01"), periodEnd: new Date("2026-07-31"),
      ruleId: rule.id, costIds: [cost.id],
    });

    await new Promise(r => setTimeout(r, 100)); // small delay

    const result2 = await executeAllocation({
      tenantId, buildingId,
      periodYear: 2026, periodMonth: 7,
      periodStart: new Date("2026-07-01"), periodEnd: new Date("2026-07-31"),
      ruleId: rule.id, costIds: [cost.id],
    });

    // Same source + same method → identical amounts
    expect(result1.totalSourceAmount).toBe(result2.totalSourceAmount);
    expect(result1.totalAllocatedAmount).toBe(result2.totalAllocatedAmount);
    for (let i = 0; i < result1.items.length; i++) {
      expect(result1.items[i].amount).toBe(result2.items[i].amount);
    }
  });

  // -----------------------------------------------------------------------
  // 8. ChargeLine creation + traceability
  // -----------------------------------------------------------------------
  it("creates charge lines from allocation run with full traceability", async () => {
    const rule = await prisma.allocationRule.create({
      data: { tenantId, buildingId, name: "Charge test", method: "equal" },
    });
    const cost = await createCost(tenantId, resourceTypeId, 90.00, {
      costCategoryId,
      description: "Water supply",
      periodMonth: 8,
    });

    const { executeAllocation, prepareChargeLines } = await import("../src/modules/allocation/allocation.engine.js");
    const allocResult = await executeAllocation({
      tenantId, buildingId,
      periodYear: 2026, periodMonth: 8,
      periodStart: new Date("2026-08-01"), periodEnd: new Date("2026-08-31"),
      ruleId: rule.id, costIds: [cost.id],
    });

    expect(allocResult.runId).toBeDefined();

    // Create charge lines
    const count = await prepareChargeLines(allocResult.runId);
    expect(count).toBe(3); // 3 apartments

    // Verify charge lines exist
    const chargeLines = await prisma.chargeLine.findMany({
      where: { allocationRunId: allocResult.runId },
    });
    expect(chargeLines).toHaveLength(3);
    expect(chargeLines[0].label).toContain("2026-08");
    expect(chargeLines[0].amount).toBe(30); // 90 / 3
    expect(chargeLines[0].sourceType).toBe("allocation");
    expect(chargeLines[0].allocationRunId).toBe(allocResult.runId);

    // Traceability: ChargeLine → AllocationItem → AllocationRun → Cost
    const trace = await prisma.chargeLine.findUnique({
      where: { id: chargeLines[0].id },
      include: {
        allocationItem: {
          include: {
            run: {
              include: {
                allocationRule: true,
                sourceCosts: { include: { cost: true } },
              },
            },
          },
        },
        costCategory: true,
      },
    });

    expect(trace).toBeDefined();
    expect(trace!.allocationItem).toBeDefined();
    expect(trace!.allocationItem!.run.allocationRule.name).toBe("Charge test");
    expect(trace!.allocationItem!.run.sourceCosts[0].cost.description).toBe("Water supply");
    expect(trace!.costCategory!.code).toBe("utilities");
  });
});