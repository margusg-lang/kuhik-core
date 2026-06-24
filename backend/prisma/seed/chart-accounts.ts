// kuhik-core/backend/prisma/seed/chart-accounts.ts
// Estonian standard chart of accounts for apartment associations (KÜ).
// Based on Eesti Korteriühistu standard kontoplaan.
//
// Account number structure:
//   1xxx — Assets (varad)
//   2xxx — Liabilities (kohustised)
//   3xxx — Equity (omakapital)
//   4xxx — Revenue (tulud)
//   5xxx — Expenses (kulud)
//
// Each account maps to an AccountClass (cash, receivable, payable, etc.)
// and optionally to a default CostCategory.

import { getPrisma } from "./utils/db.js";

interface AccountDef {
  accountNumber: string;
  name: string;
  classCode: string;       // matches AccountClass.code
  cashflowGroupCode?: string;
  defaultCostCategoryCode?: string;
}

const STANDARD_ACCOUNTS: AccountDef[] = [
  // ================================================================
  // 1xxx — ASSETS (Varad)
  // ================================================================
  { accountNumber: "1000", name: "Kassa", classCode: "cash", cashflowGroupCode: "excluded" },
  { accountNumber: "1010", name: "Arvelduskonto", classCode: "cash", cashflowGroupCode: "operating_inflow" },
  { accountNumber: "1020", name: "Kogumiskonto", classCode: "cash", cashflowGroupCode: "operating_inflow" },
  { accountNumber: "1030", name: "Hoiused ja tähtajalised hoiused", classCode: "cash", cashflowGroupCode: "financing_inflow" },
  { accountNumber: "1100", name: "Nõuded korteriomanike vastu", classCode: "receivable", cashflowGroupCode: "excluded" },
  { accountNumber: "1110", name: "Ebatõenäoliselt laekuvad nõuded", classCode: "receivable", cashflowGroupCode: "excluded" },
  { accountNumber: "1200", name: "Nõuded hankijate vastu", classCode: "receivable", cashflowGroupCode: "operating_inflow" },
  { accountNumber: "1300", name: "Viitlaekumised (ettemakstud kulud)", classCode: "accrual", cashflowGroupCode: "operating_outflow" },
  { accountNumber: "1400", name: "Rajatised ja hooned", classCode: "cash", cashflowGroupCode: "investing_outflow" },
  { accountNumber: "1410", name: "Muu põhivara", classCode: "cash", cashflowGroupCode: "investing_outflow" },

  // ================================================================
  // 2xxx — LIABILITIES (Kohustised)
  // ================================================================
  { accountNumber: "2000", name: "Võlad hankijatele", classCode: "payable", cashflowGroupCode: "operating_outflow" },
  { accountNumber: "2010", name: "Võlad töövõtjatele", classCode: "payable", cashflowGroupCode: "operating_outflow" },
  { accountNumber: "2100", name: "Saadud ettemaksed (kogumine)", classCode: "payable", cashflowGroupCode: "excluded" },
  { accountNumber: "2110", name: "Remondifond (kogumata)", classCode: "payable", cashflowGroupCode: "excluded" },
  { accountNumber: "2200", name: "Maksuvõlad", classCode: "tax", cashflowGroupCode: "operating_outflow" },
  { accountNumber: "2300", name: "Viitvõlad (kogunenud kulud)", classCode: "accrual", cashflowGroupCode: "operating_outflow" },
  { accountNumber: "2400", name: "Laenukohustised", classCode: "liability", cashflowGroupCode: "financing_outflow" },

  // ================================================================
  // 3xxx — EQUITY (Omakapital)
  // ================================================================
  { accountNumber: "3000", name: "Eelmiste perioodide jaotamata tulem", classCode: "equity", cashflowGroupCode: "excluded" },
  { accountNumber: "3010", name: "Aruandeaasta tulem", classCode: "equity", cashflowGroupCode: "excluded" },
  { accountNumber: "3100", name: "Kogumisfond (remondifond)", classCode: "reserve", cashflowGroupCode: "excluded" },

  // ================================================================
  // 4xxx — REVENUE (Tulud)
  // ================================================================
  { accountNumber: "4000", name: "Kommunaalmaksete tulud (vesi)", classCode: "revenue", defaultCostCategoryCode: "utilities" },
  { accountNumber: "4010", name: "Kommunaalmaksete tulud (elekter)", classCode: "revenue", defaultCostCategoryCode: "utilities" },
  { accountNumber: "4020", name: "Kommunaalmaksete tulud (küte)", classCode: "revenue", defaultCostCategoryCode: "utilities" },
  { accountNumber: "4030", name: "Kommunaalmaksete tulud (prügi)", classCode: "revenue", defaultCostCategoryCode: "utilities" },
  { accountNumber: "4100", name: "Hooldustasude tulud", classCode: "revenue", defaultCostCategoryCode: "maintenance" },
  { accountNumber: "4110", name: "Haldustasude tulud", classCode: "revenue", defaultCostCategoryCode: "management" },
  { accountNumber: "4120", name: "Heakorratasude tulud", classCode: "revenue", defaultCostCategoryCode: "cleaning" },
  { accountNumber: "4130", name: "Remondifondi tulud", classCode: "revenue", defaultCostCategoryCode: "reserve" },
  { accountNumber: "4200", name: "Viivisetulud", classCode: "revenue", defaultCostCategoryCode: "penalty_interest" },
  { accountNumber: "4900", name: "Muud tulud", classCode: "revenue", defaultCostCategoryCode: "other" },

  // ================================================================
  // 5xxx — EXPENSES (Kulud)
  // ================================================================
  { accountNumber: "5000", name: "Kommunaalkulud (vesi)", classCode: "expense", defaultCostCategoryCode: "utilities" },
  { accountNumber: "5010", name: "Kommunaalkulud (elekter)", classCode: "expense", defaultCostCategoryCode: "utilities" },
  { accountNumber: "5020", name: "Kommunaalkulud (küte)", classCode: "expense", defaultCostCategoryCode: "utilities" },
  { accountNumber: "5030", name: "Kommunaalkulud (prügi)", classCode: "expense", defaultCostCategoryCode: "utilities" },
  { accountNumber: "5100", name: "Hoolduskulud", classCode: "expense", defaultCostCategoryCode: "maintenance" },
  { accountNumber: "5110", name: "Halduskulud", classCode: "expense", defaultCostCategoryCode: "management" },
  { accountNumber: "5120", name: "Heakorrakulud", classCode: "expense", defaultCostCategoryCode: "cleaning" },
  { accountNumber: "5130", name: "Remondikulud", classCode: "expense", defaultCostCategoryCode: "repairs" },
  { accountNumber: "5200", name: "Kindlustuskulud", classCode: "expense", defaultCostCategoryCode: "insurance" },
  { accountNumber: "5300", name: "Pangateenuste kulud", classCode: "expense", defaultCostCategoryCode: "other" },
  { accountNumber: "5400", name: "Intressikulud", classCode: "expense", defaultCostCategoryCode: "interest" },
  { accountNumber: "5900", name: "Muud kulud", classCode: "expense", defaultCostCategoryCode: "other" },
];

/**
 * Seed standard chart of accounts for a tenant.
 * Creates ChartAccount entries linked to existing AccountClasses and CostCategories.
 * Safe to call multiple times — uses upsert on (tenantId, accountNumber).
 */
export async function seedChartAccounts(tenantId: string): Promise<void> {
  const prisma = getPrisma();

  // Fetch existing account classes, cashflow groups, and cost categories for idempotent mapping
  const accountClasses = await prisma.accountClass.findMany({ where: { tenantId } });
  const classByCode = new Map(accountClasses.map(c => [c.code, c]));

  const cashflowGroups = await prisma.cashflowGroup.findMany({ where: { tenantId } });
  const cashflowByCode = new Map(cashflowGroups.map(g => [g.code, g]));

  const costCategories = await prisma.costCategory.findMany({ where: { tenantId } });
  const categoryByCode = new Map(costCategories.map(c => [c.code, c]));

  let created = 0;
  let skipped = 0;

  for (const acct of STANDARD_ACCOUNTS) {
    const accountClass = classByCode.get(acct.classCode);
    if (!accountClass) {
      console.warn(`[ChartAccounts] Missing AccountClass: ${acct.classCode} — skipping ${acct.accountNumber}`);
      skipped++;
      continue;
    }

    const cashflowGroup = acct.cashflowGroupCode ? cashflowByCode.get(acct.cashflowGroupCode) : undefined;
    const defaultCategory = acct.defaultCostCategoryCode ? categoryByCode.get(acct.defaultCostCategoryCode) : undefined;

    const exists = await prisma.chartAccount.findUnique({
      where: { tenantId_accountNumber: { tenantId, accountNumber: acct.accountNumber } },
    });

    if (exists) {
      skipped++;
      continue;
    }

    await prisma.chartAccount.create({
      data: {
        tenantId,
        accountNumber: acct.accountNumber,
        name: acct.name,
        accountClassId: accountClass.id,
        cashflowGroupId: cashflowGroup?.id || null,
        defaultCostCategoryId: defaultCategory?.id || null,
        isActive: true,
      },
    });

    created++;
  }

  console.log(`[ChartAccounts] Created: ${created}, skipped (already exist): ${skipped}`);
}