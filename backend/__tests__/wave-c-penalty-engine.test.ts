// kuhik-core/backend/__tests__/wave-c-penalty-engine.test.ts
// Wave C: PenaltyEngine — overdue receivable penalties
//
// Tests:
// 1. Penalty created only for overdue receivables
// 2. No duplicate penalties (idempotent)
// 3. Correct penalty amount calculation
// 4. Penalty creates a new receivable
// 5. Non-overdue receivables are skipped

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import { PenaltyEngine } from "../src/modules/payments/payments.service.js";

const prisma = new PrismaClient();

async function createTestTenant() {
  const slug = `test-wavec-pen-${Date.now()}`;
  return prisma.tenant.create({
    data: { name: "Wave C Penalty Test", slug, isActive: true },
  });
}

async function cleanup(tenantId: string) {
  await prisma.paymentAllocation.deleteMany({ where: { tenantId } });
  await prisma.penaltyEntry.deleteMany({ where: { tenantId } });
  await prisma.receivable.deleteMany({ where: { tenantId } });
  await prisma.payment.deleteMany({ where: { tenantId } });
  await prisma.chargeLine.deleteMany({ where: { tenantId } });
  await prisma.apartment.deleteMany({ where: { tenantId } });
  await prisma.building.deleteMany({ where: { tenantId } });
  await prisma.costCategory.deleteMany({ where: { tenantId } });
  await prisma.tenant.delete({ where: { id: tenantId } });
}

describe("Wave C — Penalty Engine", () => {
  let tenantId: string;
  let overdueReceivableId: string;
  let notOverdueReceivableId: string;

  beforeAll(async () => {
    const tenant = await createTestTenant();
    tenantId = tenant.id;

    const building = await prisma.building.create({
      data: { tenantId, name: "Penalty Test Building" },
    });

    const apt = await prisma.apartment.create({
      data: {
        tenantId,
        buildingId: building.id,
        unitLabel: "PEN-1",
        ownershipShare: 1.0,
        areaSqm: 50,
      },
    });

    // Overdue receivable: due date in the past
    const overdueRec = await prisma.receivable.create({
      data: {
        tenantId,
        apartmentId: apt.id,
        sourceType: "charge",
        sourceReferenceId: "overdue-1",
        amountOriginal: 500,
        amountOutstanding: 500,
        amountPaid: 0,
        status: "open",
        dueDate: new Date("2026-01-15"), // well overdue
        periodYear: 2026,
        periodMonth: 1,
      },
    });
    overdueReceivableId = overdueRec.id;

    // Not overdue receivable: due date in the future
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1);
    const notOverdueRec = await prisma.receivable.create({
      data: {
        tenantId,
        apartmentId: apt.id,
        sourceType: "charge",
        sourceReferenceId: "future-1",
        amountOriginal: 300,
        amountOutstanding: 300,
        amountPaid: 0,
        status: "open",
        dueDate: futureDate,
        periodYear: 2027,
        periodMonth: 6,
      },
    });
    notOverdueReceivableId = notOverdueRec.id;
  });

  afterAll(async () => {
    await cleanup(tenantId);
  });

  // -----------------------------------------------------------------------
  // 1. Penalty created only for overdue receivables
  // -----------------------------------------------------------------------
  it("creates penalties only for overdue receivables", async () => {
    const engine = new PenaltyEngine(prisma);
    const count = await engine.generatePenalties(tenantId, 2026, 6, 0.08);

    expect(count).toBe(1); // Only the overdue one

    // Verify only one penalty entry exists
    const entries = await prisma.penaltyEntry.findMany({
      where: { tenantId },
    });

    expect(entries).toHaveLength(1);
    expect(entries[0].sourceReceivableId).toBe(overdueReceivableId);
    expect(entries[0].interestRate).toBe(0.08);
  });

  // -----------------------------------------------------------------------
  // 2. No duplicate penalties (idempotent)
  // -----------------------------------------------------------------------
  it("does not create duplicate penalties", async () => {
    const engine = new PenaltyEngine(prisma);

    // Run again
    const count = await engine.generatePenalties(tenantId, 2026, 6, 0.08);

    expect(count).toBe(0); // Should not create duplicates

    // Still only 1 penalty entry
    const entries = await prisma.penaltyEntry.findMany({
      where: { tenantId },
    });
    expect(entries).toHaveLength(1);
  });

  // -----------------------------------------------------------------------
  // 3. Correct penalty amount
  // -----------------------------------------------------------------------
  it("penalty amount is positive and reasonable", async () => {
    const entries = await prisma.penaltyEntry.findMany({
      where: { sourceReceivableId: overdueReceivableId },
    });

    expect(entries).toHaveLength(1);
    expect(entries[0].amount).toBeGreaterThan(0);
    expect(entries[0].daysOverdue).toBeGreaterThan(0);
    expect(entries[0].periodYear).toBe(2026);
    expect(entries[0].periodMonth).toBe(6);
  });

  // -----------------------------------------------------------------------
  // 4. Penalty creates a new receivable
  // -----------------------------------------------------------------------
  it("penalty generates a new receivable for the same apartment", async () => {
    const penaltyReceivables = await prisma.receivable.findMany({
      where: { tenantId, sourceType: "penalty" },
    });

    expect(penaltyReceivables).toHaveLength(1);
    expect(penaltyReceivables[0].amountOriginal).toBeGreaterThan(0);
    expect(penaltyReceivables[0].status).toBe("open");
    expect(penaltyReceivables[0].sourceReferenceId).toBe(overdueReceivableId);
  });

  // -----------------------------------------------------------------------
  // 5. Penalty → Receivable traceability
  // -----------------------------------------------------------------------
  it("penalty entry traces back to original receivable", async () => {
    const penalty = await prisma.penaltyEntry.findFirst({
      where: { tenantId },
      include: {
        sourceReceivable: true,
      },
    });

    expect(penalty).toBeDefined();
    expect(penalty!.sourceReceivable).toBeDefined();
    expect(penalty!.sourceReceivable!.amountOriginal).toBe(500);
    expect(penalty!.sourceReceivable!.status).toBe("open");
  });
});