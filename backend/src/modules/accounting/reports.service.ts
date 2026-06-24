// kuhik-core/backend/src/modules/accounting/reports.service.ts
// Wave D.2 — Financial reports from the journal ledger.
//
// Reports:
// 1. Balance Sheet — assets = liabilities + equity at a point in time
// 2. Income Statement — revenues - expenses for a period
// 3. Trial Balance — all accounts with debit/credit totals
// 4. Account Ledger — detailed transactions for a specific account
//
// Architecture: ALL data from JournalEntryLines, NEVER from live tables.
// This ensures reports are auditable and match the posted journal.

import { PrismaClient } from "@prisma/client";
import { roundCents } from "../allocation/allocation.engine.js";

type TxClient = Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">;

export interface TrialBalanceRow {
  accountId: string;
  accountNumber: string;
  accountName: string;
  classCode: string;
  className: string;
  totalDebit: number;
  totalCredit: number;
  balance: number;
}

export interface BalanceSheetSection {
  code: string;
  name: string;
  accounts: Array<{
    accountNumber: string;
    accountName: string;
    balance: number;
  }>;
  total: number;
}

export interface IncomeStatementRow {
  costCategoryId: string | null;
  costCategoryName: string;
  totalExpense: number;
  totalIncome: number;
  netAmount: number;
}

export class ReportsService {
  constructor(private tx: TxClient) {}

  // =======================================================================
  // TRIAL BALANCE — all accounts with net position
  // =======================================================================

  /**
   * Trial balance for a given period.
   * Shows every account with total debit, total credit, and net balance.
   */
  async getTrialBalance(tenantId: string, periodId?: string): Promise<TrialBalanceRow[]> {
    const where: any = { tenantId };
    if (periodId) {
      where.journalEntry = { periodId };
    }

    const lines = await this.tx.journalEntryLine.findMany({
      where,
      include: {
        account: {
          include: { accountClass: true },
        },
        journalEntry: {
          select: { status: true, periodId: true },
        },
      },
    });

    // Aggregate by account
    const byAccount = new Map<string, {
      accountId: string;
      accountNumber: string;
      accountName: string;
      classCode: string;
      className: string;
      totalDebit: number;
      totalCredit: number;
    }>();

    for (const line of lines) {
      // Only include posted entries (not reversed)
      if (line.journalEntry.status !== 'posted') continue;

      const key = line.accountId;
      const existing = byAccount.get(key) || {
        accountId: line.accountId,
        accountNumber: line.account.accountNumber,
        accountName: line.account.name,
        classCode: line.account.accountClass.code,
        className: line.account.accountClass.name,
        totalDebit: 0,
        totalCredit: 0,
      };
      existing.totalDebit += line.debitAmount;
      existing.totalCredit += line.creditAmount;
      byAccount.set(key, existing);
    }

    return Array.from(byAccount.values())
      .map(row => ({
        ...row,
        totalDebit: roundCents(row.totalDebit),
        totalCredit: roundCents(row.totalCredit),
        balance: roundCents(row.totalDebit - row.totalCredit),
      }))
      .sort((a, b) => a.accountNumber.localeCompare(b.accountNumber));
  }

  // =======================================================================
  // BALANCE SHEET — assets, liabilities, equity
  // =======================================================================

  /**
   * Balance sheet report.
   * Groups accounts by their account class statement type.
   */
  async getBalanceSheet(tenantId: string, periodId?: string): Promise<{
    assets: BalanceSheetSection;
    liabilities: BalanceSheetSection;
    equity: BalanceSheetSection;
    totalAssets: number;
    totalLiabilitiesPlusEquity: number;
  }> {
    const trialBalance = await this.getTrialBalance(tenantId, periodId);

    const assets: BalanceSheetSection = { code: '1', name: 'Assets', accounts: [], total: 0 };
    const liabilities: BalanceSheetSection = { code: '2', name: 'Liabilities', accounts: [], total: 0 };
    const equity: BalanceSheetSection = { code: '3', name: 'Equity', accounts: [], total: 0 };

    for (const row of trialBalance) {
      const code = row.classCode.charAt(0);

      if (code === '1') {
        // Asset accounts: debit balance = positive
        const balance = row.totalDebit - row.totalCredit;
        if (balance !== 0) {
          assets.accounts.push({ accountNumber: row.accountNumber, accountName: row.accountName, balance: roundCents(balance) });
          assets.total += balance;
        }
      } else if (code === '2') {
        // Liability accounts: credit balance = positive
        const balance = row.totalCredit - row.totalDebit;
        if (balance !== 0) {
          liabilities.accounts.push({ accountNumber: row.accountNumber, accountName: row.accountName, balance: roundCents(balance) });
          liabilities.total += balance;
        }
      } else if (code === '3') {
        // Equity accounts: credit balance = positive
        const balance = row.totalCredit - row.totalDebit;
        if (balance !== 0) {
          equity.accounts.push({ accountNumber: row.accountNumber, accountName: row.accountName, balance: roundCents(balance) });
          equity.total += balance;
        }
      }
    }

    assets.total = roundCents(assets.total);
    liabilities.total = roundCents(liabilities.total);
    equity.total = roundCents(equity.total);

    return {
      assets,
      liabilities,
      equity,
      totalAssets: assets.total,
      totalLiabilitiesPlusEquity: roundCents(liabilities.total + equity.total),
    };
  }

  // =======================================================================
  // INCOME STATEMENT — revenue and expenses
  // =======================================================================

  /**
   * Income statement for a period.
   * Groups by cost category (or uncategorized).
   */
  async getIncomeStatement(tenantId: string, periodId?: string): Promise<{
    rows: IncomeStatementRow[];
    totalIncome: number;
    totalExpense: number;
    netIncome: number;
  }> {
    const where: any = { tenantId };
    if (periodId) {
      where.journalEntry = { periodId };
    }

    const lines = await this.tx.journalEntryLine.findMany({
      where,
      include: {
        account: {
          include: { accountClass: true },
        },
        costCategory: true,
        journalEntry: {
          select: { status: true },
        },
      },
    });

    // Aggregate by cost category
    const byCategory = new Map<string, {
      costCategoryId: string | null;
      costCategoryName: string;
      totalIncome: number;
      totalExpense: number;
    }>();

    for (const line of lines) {
      if (line.journalEntry.status !== 'posted') continue;
      if (!line.account.accountClass) continue;

      const classCode = line.account.accountClass.code;
      const key = line.costCategoryId || 'uncategorized';

      const existing = byCategory.get(key) || {
        costCategoryId: line.costCategoryId,
        costCategoryName: line.costCategory?.name || 'Uncategorized',
        totalIncome: 0,
        totalExpense: 0,
      };

      // Income accounts (class 4xx): credit balance
      if (classCode.startsWith('4')) {
        existing.totalIncome += line.creditAmount - line.debitAmount;
      }
      // Expense accounts (class 5xx): debit balance
      if (classCode.startsWith('5')) {
        existing.totalExpense += line.debitAmount - line.creditAmount;
      }

      byCategory.set(key, existing);
    }

    const rows: IncomeStatementRow[] = Array.from(byCategory.values())
      .map(r => ({
        costCategoryId: r.costCategoryId,
        costCategoryName: r.costCategoryName,
        totalExpense: roundCents(r.totalExpense),
        totalIncome: roundCents(r.totalIncome),
        netAmount: roundCents(r.totalIncome - r.totalExpense),
      }))
      .filter(r => r.totalExpense > 0 || r.totalIncome > 0);

    const totalIncome = roundCents(rows.reduce((s, r) => s + r.totalIncome, 0));
    const totalExpense = roundCents(rows.reduce((s, r) => s + r.totalExpense, 0));
    const netIncome = roundCents(totalIncome - totalExpense);

    return { rows, totalIncome, totalExpense, netIncome };
  }

  // =======================================================================
  // ACCOUNT LEDGER — detailed transaction history for an account
  // =======================================================================

  /**
   * Detailed ledger for a specific account.
   */
  async getAccountLedger(tenantId: string, accountId: string, periodId?: string): Promise<{
    accountNumber: string;
    accountName: string;
    entries: Array<{
      date: Date;
      referenceType: string;
      referenceId: string | null;
      description: string | null;
      debitAmount: number;
      creditAmount: number;
      runningBalance: number;
      apartmentLabel: string | null;
    }>;
  }> {
    const account = await this.tx.chartAccount.findUnique({
      where: { id: accountId },
    });
    if (!account) throw new Error('Account not found');

    const where: any = { tenantId, accountId };
    if (periodId) {
      where.journalEntry = { periodId };
    }

    const lines = await this.tx.journalEntryLine.findMany({
      where,
      include: {
        journalEntry: { select: { entryDate: true, referenceType: true, referenceId: true, status: true } },
        apartment: { select: { unitLabel: true } },
      },
      orderBy: [
        { journalEntry: { entryDate: 'asc' } },
        { createdAt: 'asc' },
      ],
    });

    let runningBalance = 0;
    const entries = lines
      .filter(l => l.journalEntry.status === 'posted')
      .map(l => {
        runningBalance += l.debitAmount - l.creditAmount;
        return {
          date: l.journalEntry.entryDate,
          referenceType: l.journalEntry.referenceType,
          referenceId: l.journalEntry.referenceId,
          description: l.description,
          debitAmount: l.debitAmount,
          creditAmount: l.creditAmount,
          runningBalance: roundCents(runningBalance),
          apartmentLabel: l.apartment?.unitLabel || null,
        };
      });

    return {
      accountNumber: account.accountNumber,
      accountName: account.name,
      entries,
    };
  }
}

export function createReportsService(tx: TxClient): ReportsService {
  return new ReportsService(tx);
}