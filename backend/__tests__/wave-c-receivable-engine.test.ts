// kuhik-core/backend/__tests__/wave-c-receivable-engine.test.ts
// Wave C: ReceivableCreationService — ChargeLine → Receivable
//
// Tests:
// 1. One ChargeLine → exactly one Receivable
// 2. No duplicates (idempotent)
// 3. Status = OPEN
// 4. Outstanding = Original
// 5. Multiple ChargeLines → multiple Receivables
// 6. Traceability: Receivable → ChargeLine → AllocationItem → AllocationRun → Cost

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import { ReceivableCreationService } from "../src/modules/payments/payments.service.js";

const prisma = new PrismaClient();

async function createTestTenant() {
  const slug = `test-wavec-rec-${Date.now()}`;
  return prisma.tenant.create({
    data: { name: "Wave C Receivable Test", slug, isActive: true },
  });
}

async function cleanup(tenantId: string) {
  await prisma.paymentAllocation.deleteMany({ where: { tenantId } });
  await prisma.penaltyEntry.deleteMany({ where: { tenantId } });
  await prisma.receivable.deleteMany({ where: { tenantId } });
  await prisma.chargeLine.deleteMany({ where: { tenantId } });
  await prisma.allocationItem.deleteMany({ where: { run: { tenantId } } });
  await prisma.allocationRunCost.deleteMany({ where: { run: { tenantId } } });
  await prisma.allocationRun.deleteMany({ where: { tenantId } });
  await prisma.cost.deleteMany({ where: { tenantId } });
  await prisma.apartment.deleteMany({ where: { tenantId } });
  await prisma.building.deleteMany({ where: { tenantId } });
  await prisma.costCategory.deleteMany({ where: { tenantId } });
  await prisma.tenant.delete({ where: { id: tenantId } });
}

describe("Wave C — Receivable Engine (ChargeLine → Receivable)", () => {
  let tenantId: string;
  let buildingId: string;
  let aptIds: string[] = [];
  let chargeLineIds: string[] = [];

  beforeAll(async () => {
    const tenant = await createTestTenant();
    tenantId = tenant.id;

    const building = await prisma.building.create({
      data: { tenantId, name: "Receivable Test Building" },
    });
    buildingId = building.id;

    // Create 4 apartments
    for (let i = 1; i <= 4; i++) {
      const apt = await prisma.apartment.create({
        data: {
          tenantId,
          buildingId,
          unitLabel: `RECV-${i}`,
          ownershipShare: 0.25,
          areaSqm: 50,
        },
      });
      aptIds.push(apt.id);
    }

    // Create charge lines for each apartment
    for (let i = 0; i < aptIds.length; i++) {
      const cl = await prisma.chargeLine.create({
        data: {
          tenantId,
          apartmentId: aptIds[i],
          label: `2026-06 Maintenance #${i + 1}`,
          amount: 250,
          sourceType: "allocation",
          status: "active",
          periodYear: 2026,
          periodMonth: 6,
        },
      });
      chargeLineIds.push(cl.id);
    }
  });

  afterAll(async () => {
    await cleanup(tenantId);
  });

  // -----------------------------------------------------------------------
  // 1. One ChargeLine → exactly one Receivable
  // -----------------------------------------------------------------------
  it("creates one receivable per charge line", async () => {
    const service = new ReceivableCreationService(prisma);
    const created = await service.createFromChargeLines([chargeLineIds[0]]);

    expect(created).toHaveLength(1);

    const rec = await prisma.receivable.findUnique({ where: { id: created[0] } });
    expect(rec).toBeDefined();
    expect(rec!.chargeLineId).toBe(chargeLineIds[0]);
    expect(rec!.amountOriginal).toBe(250);
    expect(rec!.amountOutstanding).toBe(250);
    expect(rec!.status).toBe("open");
    expect(rec!.sourceType).toBe("charge");
    expect(rec!.sourceReferenceId).toBe(chargeLineIds[0]);
  });

  // -----------------------------------------------------------------------
  // 2. No duplicates (idempotent)
  // -----------------------------------------------------------------------
  it("does not create duplicate receivables", async () => {
    const service = new ReceivableCreationService(prisma);
    const chargeIds = [chargeLineIds[0]]; // already created above

    // Run twice
    const firstRun = await service.createFromChargeLines(chargeIds);
    const secondRun = await service.createFromChargeLines(chargeIds);

    // Second run should return empty (no new receivables)
    expect(secondRun).toHaveLength(0);

    // Still only 1 receivable for that charge line
    const count = await prisma.receivable.count({
      where: { chargeLineId: chargeIds[0] },
    });
    expect(count).toBe(1);
  });

  // -----------------------------------------------------------------------
  // 3. Multiple ChargeLines → multiple Receivables
  // -----------------------------------------------------------------------
  it("creates receivables for all charge lines", async () => {
    const service = new ReceivableCreationService(prisma);
    const created = await service.createFromChargeLines(chargeLineIds.slice(1));

    expect(created).toHaveLength(3);

    // Verify all are OPEN with correct amounts
    const receivables = await prisma.receivable.findMany({
      where: { id: { in: created } },
      orderBy: { createdAt: "asc" },
    });

    expect(receivables).toHaveLength(3);
    for (const r of receivables) {
      expect(r.amountOriginal).toBe(250);
      expect(r.amountOutstanding).toBe(250);
      expect(r.amountPaid).toBe(0);
      expect(r.status).toBe("open");
    }
  });

  // -----------------------------------------------------------------------
  // 4. Total receivable sum matches total ChargeLine sum
  // -----------------------------------------------------------------------
  it("total receivable sum equals total charge line amount", async () => {
    const receivables = await prisma.receivable.findMany({
      where: { tenantId },
    });

    const chargeLines = await prisma.chargeLine.findMany({
      where: { tenantId },
    });

    const recSum = receivables.reduce((s, r) => s + r.amountOriginal, 0);
    const clSum = chargeLines.reduce((s, c) => s + c.amount, 0);

    expect(recSum).toBe(clSum);
    expect(recSum).toBe(1000); // 4 × 250
  });

  // -----------------------------------------------------------------------
  // 5. Traceability: Receivable → ChargeLine
  // -----------------------------------------------------------------------
  it("traceability chain: Receivable → ChargeLine is intact", async () => {
    const receivable = await prisma.receivable.findFirst({
      where: { tenantId },
      include: {
        chargeLine: {
          include: {
            apartment: true,
          },
        },
        costCategory: true,
      },
    });

    expect(receivable).toBeDefined();
    expect(receivable!.chargeLine).toBeDefined();
    expect(receivable!.chargeLine!.amount).toBe(250);
    expect(receivable!.chargeLine!.apartment.unitLabel).toMatch(/^RECV-/);
  });

  // -----------------------------------------------------------------------
  // 6. Receivable status transitions: OPEN only initially
  // -----------------------------------------------------------------------
  it("all receivables start with status OPEN, not PAID or PARTIAL", async () => {
    const receivables = await prisma.receivable.findMany({
      where: { tenantId },
    });

    for (const r of receivables) {
      expect(r.status).toBe("open");
      expect(r.amountPaid).toBe(0);
      expect(r.amountOutstanding).toBe(r.amountOriginal);
    }
  });
});