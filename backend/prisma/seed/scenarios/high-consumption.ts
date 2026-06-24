// kuhik-core/backend/prisma/seed/scenarios/high-consumption.ts
// High consumption scenario: 1-2 apartments with extreme consumption to test allocation proportions

import {
  createUtilityCost,
  createAllocationRun,
  createAllocationItem,
  createKuhikInvoice,
  createKuhikInvoiceItem,
} from "../utils/helpers.js";
import { getSeedIds } from "../utils/ids.js";

export async function seedHighConsumption(): Promise<void> {
  const { tenantId, apartmentIds } = getSeedIds();
  if (!tenantId) throw new Error("tenantId not set");
  if (!apartmentIds || apartmentIds.length < 2) throw new Error("apartmentIds not set — run base seed first");

  console.log("[scenario] High consumption — testing allocation proportions...");

  const periodStart = new Date("2026-03-01");
  const periodEnd = new Date("2026-03-31");

  // Utility cost for March
  await createUtilityCost({
    tenantId,
    type: "water",
    periodStart,
    periodEnd,
    totalAmount: 450.0,
    supplierName: "Tallinna Vesi",
    description: "Veetarbimine märts 2026 — high consumption test",
  });

  await createUtilityCost({
    tenantId,
    type: "electricity",
    periodStart,
    periodEnd,
    totalAmount: 1350.0,
    supplierName: "Eesti Energia",
    description: "Elekter märts 2026 — high consumption test",
  });

  const run = await createAllocationRun({
    tenantId,
    periodStart,
    periodEnd,
    status: "draft",
    meta: { scenario: "high-consumption", description: "March 2026 — extreme consumption test" },
  });

  // Extreme consumption: apt 3 (A-4) uses 40% of total water, apt 6 (B-2) uses 35% of total electricity
  // Normal consumption for rest
  const waterAllocations = [40, 55, 48, 320, 32, 45, 50, 35]; // apt 3 = 320 (outlier)
  const waterTotal = waterAllocations.reduce((a, b) => a + b, 0);

  const elecAllocations = [140, 180, 155, 260, 105, 135, 420, 120]; // apt 6 = 420 (outlier)
  const elecTotal = elecAllocations.reduce((a, b) => a + b, 0);

  for (let i = 0; i < apartmentIds.length; i++) {
    const waterPct = Math.round((waterAllocations[i] / waterTotal) * 10000) / 100;
    const elecPct = Math.round((elecAllocations[i] / elecTotal) * 10000) / 100;

    await createAllocationItem({
      runId: run.id,
      apartmentId: apartmentIds[i],
      costType: "water",
      method: "meter_based",
      amount: waterAllocations[i],
      consumptionPct: waterPct,
    });
    await createAllocationItem({
      runId: run.id,
      apartmentId: apartmentIds[i],
      costType: "electricity",
      method: "meter_based",
      amount: elecAllocations[i],
      consumptionPct: elecPct,
    });

    console.log(
      `  Apt ${i + 1}: water=${waterAllocations[i]} (${waterPct}%), elec=${elecAllocations[i]} (${elecPct}%)`
    );
  }

  // Create invoices for outlier apartments
  const invoiceDate = new Date("2026-04-05");

  // Apartment 3 (index 3) — extreme water consumption
  const apt3Total = waterAllocations[3] + elecAllocations[3];
  const inv3 = await createKuhikInvoice({
    tenantId,
    apartmentId: apartmentIds[3],
    allocationRunId: run.id,
    invoiceNumber: "HIGH-INV-001",
    periodStart,
    periodEnd,
    totalAmount: apt3Total,
    status: "draft",
    issuedAt: invoiceDate,
  });
  await createKuhikInvoiceItem({ invoiceId: inv3.id, costType: "water", amount: waterAllocations[3] });
  await createKuhikInvoiceItem({ invoiceId: inv3.id, costType: "electricity", amount: elecAllocations[3] });
  console.log(`  Outlier invoice (A-4): ${apt3Total}€ — water alone: ${waterAllocations[3]}€`);

  // Apartment 6 (index 6) — extreme electricity consumption
  const apt6Total = waterAllocations[6] + elecAllocations[6];
  const inv6 = await createKuhikInvoice({
    tenantId,
    apartmentId: apartmentIds[6],
    allocationRunId: run.id,
    invoiceNumber: "HIGH-INV-002",
    periodStart,
    periodEnd,
    totalAmount: apt6Total,
    status: "draft",
    issuedAt: invoiceDate,
  });
  await createKuhikInvoiceItem({ invoiceId: inv6.id, costType: "water", amount: waterAllocations[6] });
  await createKuhikInvoiceItem({ invoiceId: inv6.id, costType: "electricity", amount: elecAllocations[6] });
  console.log(`  Outlier invoice (B-2): ${apt6Total}€ — electricity alone: ${elecAllocations[6]}€`);

  // Verify allocation sanity
  console.log("\n  === Allocation sanity check ===");
  console.log(`  Total water allocated: ${waterAllocations.reduce((a, b) => a + b, 0)}€ vs cost: 450€`);
  console.log(`  Total electricity allocated: ${elecAllocations.reduce((a, b) => a + b, 0)}€ vs cost: 1350€`);

  console.log("[scenario] High consumption complete");
}