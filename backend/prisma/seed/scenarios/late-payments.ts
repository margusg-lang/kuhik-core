// kuhik-core/backend/prisma/seed/scenarios/late-payments.ts
// Late payments scenario: invoices with partial payments and unpaid balances

import {
  createUtilityCost,
  createAllocationRun,
  createAllocationItem,
  createKuhikInvoice,
  createKuhikInvoiceItem,
  createKuhikPayment,
} from "../utils/helpers.js";
import { getSeedIds } from "../utils/ids.js";

export async function seedLatePayments(): Promise<void> {
  const { tenantId, apartmentIds } = getSeedIds();
  if (!tenantId) throw new Error("tenantId not set");
  if (!apartmentIds || apartmentIds.length < 3) throw new Error("apartmentIds not set — run base seed first");

  console.log("[scenario] Late payments — invoices with partial/unpaid balances...");

  const periodStart = new Date("2026-02-01");
  const periodEnd = new Date("2026-02-28");

  // Utility cost for February
  await createUtilityCost({
    tenantId,
    type: "water",
    periodStart,
    periodEnd,
    totalAmount: 420.0,
    supplierName: "Tallinna Vesi",
    description: "Veetarbimine veebruar 2026",
  });

  await createUtilityCost({
    tenantId,
    type: "electricity",
    periodStart,
    periodEnd,
    totalAmount: 980.0,
    supplierName: "Eesti Energia",
    description: "Elekter veebruar 2026",
  });

  const run = await createAllocationRun({
    tenantId,
    periodStart,
    periodEnd,
    status: "finalized",
    meta: { scenario: "late-payments", description: "February 2026 — late payment test" },
  });

  // Create allocations
  const waterAllocations = [50, 68, 55, 85, 38, 52, 62, 43];
  const elecAllocations = [165, 210, 180, 280, 125, 155, 230, 140];

  for (let i = 0; i < apartmentIds.length; i++) {
    await createAllocationItem({
      runId: run.id,
      apartmentId: apartmentIds[i],
      costType: "water",
      method: "meter_based",
      amount: waterAllocations[i],
    });
    await createAllocationItem({
      runId: run.id,
      apartmentId: apartmentIds[i],
      costType: "electricity",
      method: "meter_based",
      amount: elecAllocations[i],
    });
  }

  const invoiceDate = new Date("2026-03-05");
  for (let i = 0; i < apartmentIds.length; i++) {
    const totalAmount = Math.round((waterAllocations[i] + elecAllocations[i]) * 100) / 100;
    const inv = await createKuhikInvoice({
      tenantId,
      apartmentId: apartmentIds[i],
      allocationRunId: run.id,
      invoiceNumber: `LATE-INV-${String(i + 1).padStart(3, "0")}`,
      periodStart,
      periodEnd,
      totalAmount,
      status: i === 0 ? "draft" : i === 1 ? "partially_paid" : "paid",
      issuedAt: invoiceDate,
    });

    await createKuhikInvoiceItem({ invoiceId: inv.id, costType: "water", amount: waterAllocations[i] });
    await createKuhikInvoiceItem({ invoiceId: inv.id, costType: "electricity", amount: elecAllocations[i] });

    // Payment scenarios:
    // Apt 0 (draft): no payment yet
    // Apt 1 (partially_paid): paid 50%
    // Apt 2-7 (paid): full payment
    if (i === 1) {
      // Partial payment — only 50% paid
      const partialAmount = Math.round((totalAmount / 2) * 100) / 100;
      await createKuhikPayment({
        invoiceId: inv.id,
        amount: partialAmount,
        paidAt: new Date(2026, 2, 28),
        method: "bank_transfer",
        reference: `PAY-LATE-PART-${String(i + 1).padStart(3, "0")}`,
      });
      console.log(`  Invoice ${inv.invoiceNumber}: ${totalAmount}€ (partial: ${partialAmount}€ paid)`);
    } else if (i >= 2) {
      await createKuhikPayment({
        invoiceId: inv.id,
        amount: totalAmount,
        paidAt: new Date(2026, 2, 22),
        method: "bank_transfer",
        reference: `PAY-LATE-${String(i + 1).padStart(3, "0")}`,
      });
      console.log(`  Invoice ${inv.invoiceNumber}: ${totalAmount}€ (paid)`);
    } else {
      console.log(`  Invoice ${inv.invoiceNumber}: ${totalAmount}€ (unpaid/draft)`);
    }
  }

  console.log("[scenario] Late payments complete");
}