// kuhik-core/backend/prisma/seed/scenarios/winter-billing.ts
// Winter billing scenario: high consumption (heating/water), larger invoices, normal payment behavior

import {
  createUtilityCost,
  createAllocationRun,
  createAllocationItem,
  createKuhikInvoice,
  createKuhikInvoiceItem,
  createKuhikPayment,
} from "../utils/helpers.js";
import { getSeedIds } from "../utils/ids.js";

export async function seedWinterBilling(): Promise<void> {
  const { tenantId, apartmentIds } = getSeedIds();
  if (!tenantId) throw new Error("tenantId not set");
  if (!apartmentIds || apartmentIds.length === 0) throw new Error("apartmentIds not set — run base seed first");

  console.log("[scenario] Winter billing — high consumption period...");

  const periodStart = new Date("2026-01-01");
  const periodEnd = new Date("2026-01-31");

  // Create utility costs (winter rates — higher heating)
  const waterCost = await createUtilityCost({
    tenantId,
    type: "water",
    periodStart,
    periodEnd,
    totalAmount: 480.0,
    supplierName: "Tallinna Vesi",
    description: "Veetarbimine jaanuar 2026 (talveperiood)",
  });
  console.log(`  Water cost: ${waterCost.totalAmount}€`);

  const electricCost = await createUtilityCost({
    tenantId,
    type: "electricity",
    periodStart,
    periodEnd,
    totalAmount: 1250.0,
    supplierName: "Eesti Energia",
    description: "Elekter jaanuar 2026 (talveperiood)",
  });
  console.log(`  Electricity cost: ${electricCost.totalAmount}€`);

  // Create allocation run
  const run = await createAllocationRun({
    tenantId,
    periodStart,
    periodEnd,
    status: "finalized",
    meta: { scenario: "winter-billing", description: "January 2026 — winter billing" },
  });
  console.log(`  Allocation run: ${run.id}`);

  // Higher water allocation in winter (more consumption)
  const waterAllocations = [55, 75, 62, 95, 42, 58, 70, 48];
  const waterTotal = waterAllocations.reduce((a, b) => a + b, 0);

  const elecAllocations = [185, 240, 200, 310, 140, 175, 260, 155];
  const elecTotal = elecAllocations.reduce((a, b) => a + b, 0);

  for (let i = 0; i < apartmentIds.length; i++) {
    await createAllocationItem({
      runId: run.id,
      apartmentId: apartmentIds[i],
      costType: "water",
      method: "meter_based",
      amount: waterAllocations[i],
      consumptionPct: Math.round((waterAllocations[i] / waterTotal) * 10000) / 100,
    });
    await createAllocationItem({
      runId: run.id,
      apartmentId: apartmentIds[i],
      costType: "electricity",
      method: "meter_based",
      amount: elecAllocations[i],
      consumptionPct: Math.round((elecAllocations[i] / elecTotal) * 10000) / 100,
    });
  }

  // Create invoices for each apartment
  const invoiceDate = new Date("2026-02-05");

  for (let i = 0; i < apartmentIds.length; i++) {
    const totalAmount = Math.round((waterAllocations[i] + elecAllocations[i]) * 100) / 100;
    const inv = await createKuhikInvoice({
      tenantId,
      apartmentId: apartmentIds[i],
      allocationRunId: run.id,
      invoiceNumber: `WTR-INV-${String(i + 1).padStart(3, "0")}`,
      periodStart,
      periodEnd,
      totalAmount,
      status: "issued",
      issuedAt: invoiceDate,
    });

    await createKuhikInvoiceItem({ invoiceId: inv.id, costType: "water", amount: waterAllocations[i] });
    await createKuhikInvoiceItem({ invoiceId: inv.id, costType: "electricity", amount: elecAllocations[i] });

    // Normal payment behavior — all paid except last
    if (i < apartmentIds.length - 1) {
      await createKuhikPayment({
        invoiceId: inv.id,
        amount: totalAmount,
        paidAt: new Date(2026, 1, 20),
        method: "bank_transfer",
        reference: `PAY-WTR-${String(i + 1).padStart(3, "0")}`,
      });
    }

    console.log(`  Invoice ${inv.invoiceNumber}: ${totalAmount}€ ${i < apartmentIds.length - 1 ? "(paid)" : "(pending)"}`);
  }

  console.log("[scenario] Winter billing complete");
}