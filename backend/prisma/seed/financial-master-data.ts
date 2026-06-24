// kuhik-core/backend/prisma/seed/financial-master-data.ts
// Seeds tenant-level financial classification master data.
// Called during tenant creation to set up default account classes,
// cashflow groups, and cost categories.

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export interface FinancialSeedInput {
  tenantId: string;
}

/**
 * Seeds default financial master data for a tenant.
 * Safe to call multiple times — uses upsert on unique (tenantId, code).
 */
export async function seedFinancialMasterData({ tenantId }: FinancialSeedInput) {
  console.log(`[FinancialSeed] Seeding for tenant ${tenantId}`);

  // 1. Account Classes
  const accountClasses = [
    { code: "cash", name: "Cash / Bank", statementType: "asset", sortOrder: 10 },
    { code: "receivable", name: "Receivables", statementType: "asset", sortOrder: 20 },
    { code: "payable", name: "Payables", statementType: "liability", sortOrder: 30 },
    { code: "liability", name: "Other Liabilities", statementType: "liability", sortOrder: 40 },
    { code: "equity", name: "Equity / Retained Earnings", statementType: "equity", sortOrder: 50 },
    { code: "reserve", name: "Reserve Funds", statementType: "equity", sortOrder: 60 },
    { code: "revenue", name: "Revenue / Income", statementType: "revenue", sortOrder: 70 },
    { code: "expense", name: "Expenses", statementType: "expense", sortOrder: 80 },
    { code: "tax", name: "Tax Liabilities", statementType: "liability", sortOrder: 45 },
    { code: "accrual", name: "Accruals / Prepayments", statementType: "asset", sortOrder: 25 },
  ];

  for (const ac of accountClasses) {
    await prisma.accountClass.upsert({
      where: { tenantId_code: { tenantId, code: ac.code } },
      update: { name: ac.name, statementType: ac.statementType, sortOrder: ac.sortOrder },
      create: { tenantId, ...ac },
    });
  }
  console.log(`[FinancialSeed]  Account classes: ${accountClasses.length}`);

  // 2. Cashflow Groups
  const cashflowGroups = [
    { code: "operating_inflow", name: "Operating cash inflow", direction: "inflow", sortOrder: 10 },
    { code: "operating_outflow", name: "Operating cash outflow", direction: "outflow", sortOrder: 20 },
    { code: "investing_inflow", name: "Investing cash inflow", direction: "inflow", sortOrder: 30 },
    { code: "investing_outflow", name: "Investing cash outflow", direction: "outflow", sortOrder: 40 },
    { code: "financing_inflow", name: "Financing cash inflow", direction: "inflow", sortOrder: 50 },
    { code: "financing_outflow", name: "Financing cash outflow", direction: "outflow", sortOrder: 60 },
    { code: "excluded", name: "Excluded from cash flow", direction: "excluded", sortOrder: 999 },
  ];

  for (const cg of cashflowGroups) {
    await prisma.cashflowGroup.upsert({
      where: { tenantId_code: { tenantId, code: cg.code } },
      update: { name: cg.name, direction: cg.direction, sortOrder: cg.sortOrder },
      create: { tenantId, ...cg },
    });
  }
  console.log(`[FinancialSeed]  Cashflow groups: ${cashflowGroups.length}`);

  // 3. Cost Categories
  const costCategories = [
    { code: "management", name: "Management / Haldus", kind: "expense", sortOrder: 10 },
    { code: "maintenance", name: "Maintenance / Hooldus", kind: "expense", sortOrder: 20 },
    { code: "cleaning", name: "Cleaning / Heakord", kind: "expense", sortOrder: 30 },
    { code: "repairs", name: "Repairs / Remont", kind: "expense", sortOrder: 40 },
    { code: "utilities", name: "Utilities / Kommunaal", kind: "both", sortOrder: 50 },
    { code: "reserve", name: "Reserve fund / Reserv", kind: "expense", sortOrder: 60 },
    { code: "insurance", name: "Insurance / Kindlustus", kind: "expense", sortOrder: 70 },
    { code: "taxes", name: "Taxes / Maksud", kind: "expense", sortOrder: 80 },
    { code: "interest", name: "Interest / Intress", kind: "expense", sortOrder: 90 },
    { code: "penalty_interest", name: "Penalty interest / Viivis", kind: "income", sortOrder: 100 },
    { code: "other", name: "Other / Muu", kind: "both", sortOrder: 999 },
  ];

  for (const cc of costCategories) {
    await prisma.costCategory.upsert({
      where: { tenantId_code: { tenantId, code: cc.code } },
      update: { name: cc.name, kind: cc.kind, sortOrder: cc.sortOrder },
      create: { tenantId, ...cc },
    });
  }
  console.log(`[FinancialSeed]  Cost categories: ${costCategories.length}`);

  console.log(`[FinancialSeed] Complete for tenant ${tenantId}`);
}