// kuhik-core/backend/__tests__/wave-c-payment-engine.test.ts
// Wave C: PaymentAllocationService — FIFO allocation
//
// Tests:
// 1. FIFO: oldest receivable gets paid first
// 2. Does not exceed Payment.amount
// 3. Receivable outstanding decreases correctly
// 4. Partial payment → status = partial on receivable
// 5. Full payment → status = paid
// 6. Idempotent: same payment allocated twice doesn't duplicate
// 7. Payment allocation state tracking

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import { PaymentAllocationService } from "../src/modules/payments/payments.service.js";

const prisma = new PrismaClient();

async function createTestTenant() {
  const slug = `test-wavec-pay-${Date.now()}`;
  return prisma.tenant.create({
    data: { name: "Wave C Payment Test", slug, isActive: true },
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

describe("Wave C — Payment Engine (FIFO)", () => {
  let tenantId: string;
  let apartmentId: string;
  let receivableIds: string[] = [];
  let paymentId: string;

  beforeAll(async () => {
    const tenant = await createTestTenant();
    tenantId = tenant.id;

    const building = await prisma.building.create({
      data: { tenantId, name: "Payment Test Building" },
    });

    const apt = await prisma.apartment.create({
      data: {
        tenantId,
        buildingId: building.id,
        unitLabel: "PAY-1",
        ownershipShare: 1.0,
        areaSqm: 50,
      },
    });
    apartmentId = apt.id;

    // Create 3 receivables for the same apartment with different due dates (FIFO test)
    // Receivable 1: oldest, 100€
    const r1 = await prisma.receivable.create({
      data: {
        tenantId,
        apartmentId,
        sourceType: "charge",
        sourceReferenceId: "ref-1",
        amountOriginal: 100,
        amountOutstanding: 100,
        amountPaid: 0,
        status: "open",
        dueDate: new Date("2026-05-01"),
        periodYear: 2026,
        periodMonth: 5,
      },
    });

    // Receivable 2: middle, 200€
    const r2 = await prisma.receivable.create({
      data: {
        tenantId,
        apartmentId,
        sourceType: "charge",
        sourceReferenceId: "ref-2",
        amountOriginal: 200,
        amountOutstanding: 200,
        amountPaid: 0,
        status: "open",
        dueDate: new Date("2026-06-01"),
        periodYear: 2026,
        periodMonth: 6,
      },
    });

    // Receivable 3: newest, 150€
    const r3 = await prisma.receivable.create({
      data: {
        tenantId,
        apartmentId,
        sourceType: "charge",
        sourceReferenceId: "ref-3",
        amountOriginal: 150,
        amountOutstanding: 150,
        amountPaid: 0,
        status: "open",
        dueDate: new Date("2026-07-01"),
        periodYear: 2026,
        periodMonth: 7,
      },
    });

    receivableIds = [r1.id, r2.id, r3.id];
  });

  afterAll(async () => {
    await cleanup(tenantId);
  });

  // -----------------------------------------------------------------------
  // 1. FIFO: oldest receivable gets paid first
  // -----------------------------------------------------------------------
  it("allocates payment to oldest receivable first (FIFO)", async () => {
    // Create a payment of 100€ — should fully cover r1 (oldest, 100€)
    const payment = await prisma.payment.create({
      data: {
        tenantId,
        apartmentId,
        amount: 100,
        paymentDate: new Date("2026-06-15"),
        status: "received",
        allocationState: "unallocated",
      },
    });
    paymentId = payment.id;

    const service = new PaymentAllocationService(prisma);
    const allocations = await service.allocateFifo(paymentId);

    expect(allocations).toHaveLength(1);

    // Verify: r1 should now be PAID
    const r1 = await prisma.receivable.findUnique({ where: { id: receivableIds[0] } });
    expect(r1!.amountPaid).toBe(100);
    expect(r1!.amountOutstanding).toBe(0);
    expect(r1!.status).toBe("paid");

    // Verify: r2 and r3 unchanged
    const r2 = await prisma.receivable.findUnique({ where: { id: receivableIds[1] } });
    expect(r2!.amountPaid).toBe(0);
    expect(r2!.amountOutstanding).toBe(200);

    const r3 = await prisma.receivable.findUnique({ where: { id: receivableIds[2] } });
    expect(r3!.amountPaid).toBe(0);
    expect(r3!.amountOutstanding).toBe(150);
  });

  // -----------------------------------------------------------------------
  // 2. Does not exceed Payment.amount
  // -----------------------------------------------------------------------
  it("does not allocate more than payment amount", async () => {
    // Create a payment of 50€ — partial payment
    const partialPayment = await prisma.payment.create({
      data: {
        tenantId,
        apartmentId,
        amount: 50,
        paymentDate: new Date("2026-06-20"),
        status: "received",
        allocationState: "unallocated",
      },
    });

    const service = new PaymentAllocationService(prisma);
    const allocations = await service.allocateFifo(partialPayment.id);

    expect(allocations).toHaveLength(1);

    // r2 (200 outstanding) should get 50
    const r2 = await prisma.receivable.findUnique({ where: { id: receivableIds[1] } });
    expect(r2!.amountPaid).toBe(50);
    expect(r2!.amountOutstanding).toBe(150);
    expect(r2!.status).toBe("partial");

    // Total allocated should not exceed payment amount
    const allocs = await prisma.paymentAllocation.findMany({
      where: { paymentId: partialPayment.id },
    });
    const totalAllocated = allocs.reduce((s, a) => s + a.amountAllocated, 0);
    expect(totalAllocated).toBe(50);
    expect(totalAllocated).toBeLessThanOrEqual(partialPayment.amount);
  });

  // -----------------------------------------------------------------------
  // 3. Partial payment crosses multiple receivables
  // -----------------------------------------------------------------------
  it("partially pays across multiple receivables in FIFO order", async () => {
    // r2 now has 150 outstanding, r3 has 150 outstanding
    // Create a payment of 200€
    const payment = await prisma.payment.create({
      data: {
        tenantId,
        apartmentId,
        amount: 200,
        paymentDate: new Date("2026-06-25"),
        status: "received",
        allocationState: "unallocated",
      },
    });

    const service = new PaymentAllocationService(prisma);
    const allocations = await service.allocateFifo(payment.id);

    expect(allocations).toHaveLength(2); // r2 (150) + r3 (50)

    const r2 = await prisma.receivable.findUnique({ where: { id: receivableIds[1] } });
    expect(r2!.amountPaid).toBe(200); // 50 from before + 150 now
    expect(r2!.amountOutstanding).toBe(0);
    expect(r2!.status).toBe("paid");

    const r3 = await prisma.receivable.findUnique({ where: { id: receivableIds[2] } });
    expect(r3!.amountPaid).toBe(50);
    expect(r3!.amountOutstanding).toBe(100);
    expect(r3!.status).toBe("partial");

    // Verify: no over-allocation
    const allocs = await prisma.paymentAllocation.findMany({
      where: { paymentId: payment.id },
    });
    const totalAllocated = allocs.reduce((s, a) => s + a.amountAllocated, 0);
    expect(totalAllocated).toBe(200);
  });

  // -----------------------------------------------------------------------
  // 4. Idempotent: running allocateFifo twice doesn't duplicate
  // -----------------------------------------------------------------------
  it("re-running allocateFifo is idempotent", async () => {
    const service = new PaymentAllocationService(prisma);

    // Run again on the first payment (already fully allocated)
    const allocations = await service.allocateFifo(paymentId);

    // Should return empty (nothing new to allocate)
    expect(allocations).toHaveLength(0);

    // r1 should still be paid
    const r1 = await prisma.receivable.findUnique({ where: { id: receivableIds[0] } });
    expect(r1!.amountPaid).toBe(100);
    expect(r1!.status).toBe("paid");
  });

  // -----------------------------------------------------------------------
  // 5. Full cycle: all receivables paid
  // -----------------------------------------------------------------------
  it("fully pays remaining receivable", async () => {
    // r3 has 100 outstanding — pay 100
    const payment = await prisma.payment.create({
      data: {
        tenantId,
        apartmentId,
        amount: 100,
        paymentDate: new Date("2026-07-01"),
        status: "received",
        allocationState: "unallocated",
      },
    });

    const service = new PaymentAllocationService(prisma);
    await service.allocateFifo(payment.id);

    const r3 = await prisma.receivable.findUnique({ where: { id: receivableIds[2] } });
    expect(r3!.amountPaid).toBe(150);
    expect(r3!.amountOutstanding).toBe(0);
    expect(r3!.status).toBe("paid");

    // Payment allocation state
    const paymentRecord = await prisma.payment.findUnique({ where: { id: payment.id } });
    expect(paymentRecord!.allocationState).toBe("allocated");
  });

  // -----------------------------------------------------------------------
  // 6. Payment allocation traceability
  // -----------------------------------------------------------------------
  it("payment → paymentAllocation → receivable traceability is intact", async () => {
    const allocations = await prisma.paymentAllocation.findMany({
      where: { tenantId },
      include: {
        payment: true,
        receivable: true,
      },
      orderBy: { createdAt: "asc" },
    });

    expect(allocations.length).toBeGreaterThan(0);

    // Verify every allocation links to a valid payment + receivable
    for (const alloc of allocations) {
      expect(alloc.payment).toBeDefined();
      expect(alloc.receivable).toBeDefined();
      expect(alloc.amountAllocated).toBeGreaterThan(0);
      expect(alloc.method).toBe("fifo");
    }
  });
});