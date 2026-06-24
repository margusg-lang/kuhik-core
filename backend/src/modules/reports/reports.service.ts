// kuhik-core/backend/src/modules/reports/reports.service.ts
// Wave E: Reporting + Dashboard + Export layer
// CRITICAL: This layer NEVER modifies financial data.
// All data comes from Wave C/D snapshots or read-only aggregates.

import { PrismaClient } from "@prisma/client";
import { roundCents } from "../allocation/allocation.engine.js";
import { BalanceService } from "../payments/payments.service.js";

type TxClient = Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">;

export class DashboardService {
  constructor(private tx: TxClient) {}

  /** System-wide dashboard KPIs */
  async getSystemDashboard(tenantId: string) {
    const receivables = await this.tx.receivable.findMany({ where: { tenantId } });
    const payments = await this.tx.payment.findMany({ where: { tenantId } });
    const penalties = await this.tx.penaltyEntry.findMany({ where: { tenantId } });
    const periods = await this.tx.accountingPeriod.findMany({
      where: { tenantId },
      orderBy: { periodYear: "desc", periodMonth: "desc" },
      take: 12,
    });

    const totalOriginal = receivables.reduce((s, r) => s + r.amountOriginal, 0);
    const totalPaid = receivables.reduce((s, r) => s + r.amountPaid, 0);
    const totalOutstanding = receivables.reduce((s, r) => s + r.amountOutstanding, 0);
    const totalPayments = payments.reduce((s, p) => s + p.amount, 0);
    const totalPenalties = penalties.reduce((s, p) => s + p.amount, 0);
    const overdueCount = receivables.filter(r => r.status === "open" || r.status === "partial").length;
    const openPeriodCount = periods.filter(p => p.status === "open").length;

    // Per-period income/expense
    const periodSummaries = periods.map(p => {
      const periodRecs = receivables.filter(
        r => r.periodYear === p.periodYear && r.periodMonth === p.periodMonth
      );
      return {
        periodYear: p.periodYear,
        periodMonth: p.periodMonth,
        status: p.status,
        income: roundCents(periodRecs.reduce((s, r) => s + r.amountOriginal, 0)),
        paid: roundCents(periodRecs.reduce((s, r) => s + r.amountPaid, 0)),
        outstanding: roundCents(periodRecs.reduce((s, r) => s + r.amountOutstanding, 0)),
      };
    });

    return {
      totalReceivables: roundCents(totalOriginal),
      totalPayments: roundCents(totalPayments),
      totalOutstanding: roundCents(totalOutstanding),
      totalPenalties: roundCents(totalPenalties),
      overdueCount,
      openPeriodCount,
      periodSummaries,
    };
  }

  /** Per-unit financial view (resident transparency) */
  async getApartmentDashboard(tenantId: string, apartmentId: string) {
    const balanceService = new BalanceService(this.tx as any);
    const balance = await balanceService.getApartmentBalance(tenantId, apartmentId);

    const receivables = await this.tx.receivable.findMany({
      where: { tenantId, apartmentId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    const payments = await this.tx.payment.findMany({
      where: { tenantId, apartmentId },
      orderBy: { paymentDate: "desc" },
      take: 20,
    });

    const chargeLines = await this.tx.chargeLine.findMany({
      where: { tenantId, apartmentId, receivables: { some: {} } },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { costCategory: true },
    });

    return {
      balance,
      receivables: receivables.map(r => ({
        id: r.id,
        amount: r.amountOriginal,
        outstanding: r.amountOutstanding,
        paid: r.amountPaid,
        status: r.status,
        periodYear: r.periodYear,
        periodMonth: r.periodMonth,
        dueDate: r.dueDate,
        sourceType: r.sourceType,
      })),
      payments: payments.map(p => ({
        id: p.id,
        amount: p.amount,
        date: p.paymentDate,
        reference: p.referenceNumber,
        status: p.allocationState,
      })),
      chargeLines: chargeLines.map(cl => ({
        id: cl.id,
        label: cl.label,
        amount: cl.amount,
        category: cl.costCategory?.name || null,
      })),
    };
  }

  /** Category breakdown for a period */
  async getCategoryBreakdown(tenantId: string, periodYear: number, periodMonth: number) {
    const receivables = await this.tx.receivable.findMany({
      where: { tenantId, periodYear, periodMonth },
      include: { costCategory: true },
    });

    const byCategory = new Map<string, { name: string; original: number; paid: number; outstanding: number; count: number }>();

    for (const r of receivables) {
      const key = r.costCategory?.code || "uncategorized";
      const entry = byCategory.get(key) || { name: r.costCategory?.name || "Uncategorized", original: 0, paid: 0, outstanding: 0, count: 0 };
      entry.original += r.amountOriginal;
      entry.paid += r.amountPaid;
      entry.outstanding += r.amountOutstanding;
      entry.count++;
      byCategory.set(key, entry);
    }

    return Array.from(byCategory.entries()).map(([code, data]) => ({
      code,
      name: data.name,
      original: roundCents(data.original),
      paid: roundCents(data.paid),
      outstanding: roundCents(data.outstanding),
      count: data.count,
    }));
  }
}

// ===========================================================================
// 2. EXPORT SERVICE
// ===========================================================================

export class ExportService {
  constructor(private tx: TxClient) {}

  async exportReceivablesCSV(tenantId: string, apartmentId?: string): Promise<string> {
    const where: any = { tenantId };
    if (apartmentId) where.apartmentId = apartmentId;

    const receivables = await this.tx.receivable.findMany({
      where,
      orderBy: [{ periodYear: "desc" }, { periodMonth: "desc" }, { createdAt: "desc" }],
      include: { costCategory: true, apartment: true },
    });

    const header = "Apartment,Period,Category,Original,Paid,Outstanding,Status,DueDate,SourceType";
    const rows = receivables.map(r =>
      [
        r.apartment.unitLabel,
        `${r.periodYear}-${String(r.periodMonth).padStart(2, "0")}`,
        r.costCategory?.name || "",
        r.amountOriginal.toFixed(2),
        r.amountPaid.toFixed(2),
        r.amountOutstanding.toFixed(2),
        r.status,
        r.dueDate?.toISOString().slice(0, 10) || "",
        r.sourceType,
      ].join(",")
    );

    return [header, ...rows].join("\n");
  }

  async exportPaymentsCSV(tenantId: string, apartmentId?: string): Promise<string> {
    const where: any = { tenantId };
    if (apartmentId) where.apartmentId = apartmentId;

    const payments = await this.tx.payment.findMany({
      where,
      orderBy: { paymentDate: "desc" },
      include: { apartment: true },
    });

    const header = "Apartment,Date,Amount,Reference,Method,Status";
    const rows = payments.map(p =>
      [
        p.apartment?.unitLabel || "",
        p.paymentDate.toISOString().slice(0, 10),
        p.amount.toFixed(2),
        p.referenceNumber || "",
        p.method,
        p.allocationState,
      ].join(",")
    );

    return [header, ...rows].join("\n");
  }

  async exportPeriodSnapshotJSON(tenantId: string, periodYear: number, periodMonth: number): Promise<object> {
    const snapshot = await this.tx.financialSnapshot.findFirst({
      where: {
        tenantId,
        period: { periodYear, periodMonth },
      },
    });

    if (snapshot) return snapshot.snapshotData;

    // Fallback: compute from ledger
    const dashboard = new DashboardService(this.tx);
    const categoryBreakdown = await dashboard.getCategoryBreakdown(tenantId, periodYear, periodMonth);
    const receivables = await this.tx.receivable.findMany({ where: { tenantId, periodYear, periodMonth } });
    const payments = await this.tx.payment.findMany({ where: { tenantId } });

    return {
      period: { year: periodYear, month: periodMonth },
      totalReceivables: roundCents(receivables.reduce((s, r) => s + r.amountOriginal, 0)),
      totalPaid: roundCents(receivables.reduce((s, r) => s + r.amountPaid, 0)),
      totalOutstanding: roundCents(receivables.reduce((s, r) => s + r.amountOutstanding, 0)),
      totalPayments: roundCents(payments.reduce((s, p) => s + p.amount, 0)),
      categoryBreakdown,
      generatedAt: new Date().toISOString(),
    };
  }
}