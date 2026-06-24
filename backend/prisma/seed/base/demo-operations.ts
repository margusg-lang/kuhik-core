// kuhik-core/backend/prisma/seed/base/demo-operations.ts
// Creates operational data for Demo Ühistu:
// - Utility costs (water + electricity for current period)
// - Allocation runs + items
// - Invoices + invoice items
// - Payments
// This makes the demo org fully functional end-to-end.

import {
  createUtilityCost,
  createAllocationRun,
  createAllocationItem,
  createKuhikInvoice,
  createKuhikInvoiceItem,
  createKuhikPayment,
} from "../utils/helpers.js";
import { getSeedIds } from "../utils/ids.js";

export async function seedDemoOperations(): Promise<void> {
  const { tenantId, apartmentIds, apartmentMeterIds } = getSeedIds();
  if (!tenantId) throw new Error("tenantId not set — run seedDemoOrg first");
  if (!apartmentIds || apartmentIds.length === 0) throw new Error("apartmentIds not set");
  if (!apartmentMeterIds || apartmentMeterIds.length < 2) throw new Error("apartmentMeterIds not set");

  console.log("[seed] Creating demo operational data (costs, allocations, invoices, payments)...");

  const currentYear = 2026;
  const currentMonth = 6; // June

  // ================================================================
  // PERIOD 1: May 2026 (past period, paid)
  // ================================================================
  const mayStart = new Date(currentYear, 4, 1);
  const mayEnd = new Date(currentYear, 4, 31);

  // Water cost May
  await createUtilityCost({
    tenantId,
    type: "water",
    periodStart: mayStart,
    periodEnd: mayEnd,
    totalAmount: 420.0,
    supplierName: "Tallinna Vesi",
    description: "Veetarbimine mai 2026",
  });

  // Electricity cost May
  await createUtilityCost({
    tenantId,
    type: "electricity",
    periodStart: mayStart,
    periodEnd: mayEnd,
    totalAmount: 980.0,
    supplierName: "Eesti Energia",
    description: "Elekter mai 2026",
  });

  // Allocation run May
  const mayRun = await createAllocationRun({
    tenantId,
    periodStart: mayStart,
    periodEnd: mayEnd,
    status: "finalized",
    meta: { description: "Mai 2026 — standard allocation" },
  });

  // Water allocations: scale based on apartment size
  const waterPcts = [10, 14, 12, 18, 8, 11, 15, 12];
  const elecPcts = [12, 16, 14, 20, 9, 13, 17, 11];

  for (let i = 0; i < apartmentIds.length; i++) {
    const waterAmount = Math.round((waterPcts[i] / 100) * 420 * 100) / 100;
    const elecAmount = Math.round((elecPcts[i] / 100) * 980 * 100) / 100;

    await createAllocationItem({
      runId: mayRun.id,
      apartmentId: apartmentIds[i],
      costType: "water",
      method: "meter_based",
      amount: waterAmount,
      consumptionPct: waterPcts[i],
    });
    await createAllocationItem({
      runId: mayRun.id,
      apartmentId: apartmentIds[i],
      costType: "electricity",
      method: "meter_based",
      amount: elecAmount,
      consumptionPct: elecPcts[i],
    });
  }

  // Invoices for May
  const mayInvoiceDate = new Date(currentYear, 5, 5); // June 5
  for (let i = 0; i < apartmentIds.length; i++) {
    const waterAmount = Math.round((waterPcts[i] / 100) * 420 * 100) / 100;
    const elecAmount = Math.round((elecPcts[i] / 100) * 980 * 100) / 100;
    const totalAmount = waterAmount + elecAmount;

    const inv = await createKuhikInvoice({
      tenantId,
      apartmentId: apartmentIds[i],
      allocationRunId: mayRun.id,
      invoiceNumber: `DEMO-${String(i + 1).padStart(3, "0")}-${currentYear}05`,
      periodStart: mayStart,
      periodEnd: mayEnd,
      totalAmount: Math.round(totalAmount * 100) / 100,
      status: "paid",
      issuedAt: mayInvoiceDate,
    });

    await createKuhikInvoiceItem({ invoiceId: inv.id, costType: "water", amount: waterAmount });
    await createKuhikInvoiceItem({ invoiceId: inv.id, costType: "electricity", amount: elecAmount });

    // All May invoices fully paid
    await createKuhikPayment({
      invoiceId: inv.id,
      amount: Math.round(totalAmount * 100) / 100,
      paidAt: new Date(currentYear, 5, 15),
      method: "bank_transfer",
      reference: `PAY-${String(i + 1).padStart(3, "0")}-${currentYear}05`,
    });
  }
  console.log(`  May 2026: ${apartmentIds.length} invoices created (all paid)`);

  // ================================================================
  // PERIOD 2: June 2026 (current period, some paid some pending)
  // ================================================================
  const junStart = new Date(currentYear, 5, 1);
  const junEnd = new Date(currentYear, 5, 30);

  // Water cost June
  await createUtilityCost({
    tenantId,
    type: "water",
    periodStart: junStart,
    periodEnd: junEnd,
    totalAmount: 450.0,
    supplierName: "Tallinna Vesi",
    description: "Veetarbimine juuni 2026",
  });

  // Electricity cost June
  await createUtilityCost({
    tenantId,
    type: "electricity",
    periodStart: junStart,
    periodEnd: junEnd,
    totalAmount: 1050.0,
    supplierName: "Eesti Energia",
    description: "Elekter juuni 2026",
  });

  // Allocation run June
  const junRun = await createAllocationRun({
    tenantId,
    periodStart: junStart,
    periodEnd: junEnd,
    status: "finalized",
    meta: { description: "Juuni 2026 — current period" },
  });

  const junWaterPcts = [11, 15, 13, 19, 9, 12, 16, 13];
  const junElecPcts = [13, 17, 15, 21, 10, 14, 18, 12];

  for (let i = 0; i < apartmentIds.length; i++) {
    const waterAmount = Math.round((junWaterPcts[i] / 100) * 450 * 100) / 100;
    const elecAmount = Math.round((junElecPcts[i] / 100) * 1050 * 100) / 100;

    await createAllocationItem({
      runId: junRun.id,
      apartmentId: apartmentIds[i],
      costType: "water",
      method: "meter_based",
      amount: waterAmount,
      consumptionPct: junWaterPcts[i],
    });
    await createAllocationItem({
      runId: junRun.id,
      apartmentId: apartmentIds[i],
      costType: "electricity",
      method: "meter_based",
      amount: elecAmount,
      consumptionPct: junElecPcts[i],
    });
  }

  // Invoices for June
  const junInvoiceDate = new Date(currentYear, 6, 5); // July 5
  for (let i = 0; i < apartmentIds.length; i++) {
    const waterAmount = Math.round((junWaterPcts[i] / 100) * 450 * 100) / 100;
    const elecAmount = Math.round((junElecPcts[i] / 100) * 1050 * 100) / 100;
    const totalAmount = waterAmount + elecAmount;

    const inv = await createKuhikInvoice({
      tenantId,
      apartmentId: apartmentIds[i],
      allocationRunId: junRun.id,
      invoiceNumber: `DEMO-${String(i + 1).padStart(3, "0")}-${currentYear}06`,
      periodStart: junStart,
      periodEnd: junEnd,
      totalAmount: Math.round(totalAmount * 100) / 100,
      status: i < 5 ? "paid" : (i === 7 ? "draft" : "issued"),
      issuedAt: junInvoiceDate,
    });

    await createKuhikInvoiceItem({ invoiceId: inv.id, costType: "water", amount: waterAmount });
    await createKuhikInvoiceItem({ invoiceId: inv.id, costType: "electricity", amount: elecAmount });

    // First 5 apartments paid, apartment 6+7 pending
    if (i < 5) {
      await createKuhikPayment({
        invoiceId: inv.id,
        amount: Math.round(totalAmount * 100) / 100,
        paidAt: new Date(currentYear, 6, 12),
        method: "bank_transfer",
        reference: `PAY-${String(i + 1).padStart(3, "0")}-${currentYear}06`,
      });
    }
  }
  console.log(`  June 2026: ${apartmentIds.length} invoices created (5 paid, 2 issued, 1 draft)`);

  console.log("[seed] Demo operational data complete");
}