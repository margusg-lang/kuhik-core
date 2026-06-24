// kuhik-core/backend/__tests__/double-entry-journal.test.ts
// Wave D.2 — Double-entry journal engine tests
//
// Tests:
// 1. Create balanced journal entry
// 2. Reject unbalanced entry (debit !== credit)
// 3. Reject ambiguous line (both debit and credit)
// 4. Reject zero line (neither debit nor credit)
// 5. Reject duplicate reference
// 6. Post invoice journal (debit Receivables, credit Income)
// 7. Post payment journal (debit Cash, credit Receivables)
// 8. Post expense journal (debit Expense, credit Payable)
// 9. Reverse a journal entry
// 10. Trial balance correct
// 11. Balance sheet structure correct
// 12. Income statement structure correct
// 13. Account ledger correct

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ===========================================================================
// Helpers
// ===========================================================================

async function createTestTenant() {
  const slug = `test-double-entry-${Date.now()}`;
  return prisma.tenant.create({
    data: { name: 'Double Entry Test', slug, isActive: true },
  });
}

async function createAccountClass(tenantId: string, code: string, name: string, statementType: string) {
  return prisma.accountClass.create({
    data: { tenantId, code, name, statementType, sortOrder: 10, isActive: true },
  });
}

async function createAccount(tenantId: string, accountNumber: string, name: string, classId: string) {
  return prisma.chartAccount.create({
    data: { tenantId, accountNumber, name, accountClassId: classId, isActive: true },
  });
}

async function createBuilding(tenantId: string) {
  return prisma.building.create({
    data: { tenantId, name: 'Test Building' },
  });
}

async function createApartment(tenantId: string, buildingId: string, label: string) {
  return prisma.apartment.create({
    data: { tenantId, buildingId, unitLabel: label, ownershipShare: 1.0 },
  });
}

async function cleanup(tenantId: string) {
  await prisma.journalEntryLine.deleteMany({ where: { tenantId } });
  await prisma.journalEntry.deleteMany({ where: { tenantId } });
  await prisma.chartAccount.deleteMany({ where: { tenantId } });
  await prisma.accountClass.deleteMany({ where: { tenantId } });
  await prisma.apartment.deleteMany({ where: { tenantId } });
  await prisma.building.deleteMany({ where: { tenantId } });
  await prisma.tenant.delete({ where: { id: tenantId } });
}

// ===========================================================================
// Tests
// ===========================================================================

describe('Journal Service — Double Entry', () => {
  let tenantId: string;
  let cashAccountId: string;
  let receivableAccountId: string;
  let incomeAccountId: string;
  let expenseAccountId: string;
  let payableAccountId: string;
  let aptId: string;

  beforeAll(async () => {
    const tenant = await createTestTenant();
    tenantId = tenant.id;
    const building = await createBuilding(tenantId);
    const apt = await createApartment(tenantId, building.id, 'Test-Apt-1');
    aptId = apt.id;

    // Create account classes
    const assetClass = await createAccountClass(tenantId, '10', 'Current Assets', 'balance_sheet');
    const liabilityClass = await createAccountClass(tenantId, '20', 'Liabilities', 'balance_sheet');
    const equityClass = await createAccountClass(tenantId, '30', 'Equity', 'balance_sheet');
    const incomeClass = await createAccountClass(tenantId, '40', 'Income', 'income');
    const expenseClass = await createAccountClass(tenantId, '50', 'Expenses', 'income');

    // Create standard accounts
    const cash = await createAccount(tenantId, '1010', 'Cash', assetClass.id);
    cashAccountId = cash.id;
    const receivable = await createAccount(tenantId, '1100', 'Receivables', assetClass.id);
    receivableAccountId = receivable.id;
    const income = await createAccount(tenantId, '4110', 'Membership Fees', incomeClass.id);
    incomeAccountId = income.id;
    const expense = await createAccount(tenantId, '5110', 'Utilities', expenseClass.id);
    expenseAccountId = expense.id;
    const payable = await createAccount(tenantId, '2110', 'Accounts Payable', liabilityClass.id);
    payableAccountId = payable.id;
  });

  afterAll(async () => {
    await cleanup(tenantId);
  });

  // Test 1: Create balanced journal entry
  it('creates a balanced journal entry', async () => {
    const { JournalService } = await import('../src/modules/accounting/journal.service.js');
    const service = new JournalService(prisma);

    const entry = await service.createEntry({
      tenantId,
      referenceType: 'manual',
      referenceId: 'test-001',
      description: 'Test entry',
      lines: [
        { accountId: cashAccountId, debitAmount: 100, creditAmount: 0, description: 'Cash in' },
        { accountId: incomeAccountId, debitAmount: 0, creditAmount: 100, description: 'Income' },
      ],
    });

    expect(entry).toBeDefined();
    expect(entry.totalDebit).toBe(100);
    expect(entry.totalCredit).toBe(100);
    expect(entry.status).toBe('posted');
    expect(entry.lines).toHaveLength(2);
  });

  // Test 2: Reject unbalanced entry
  it('rejects unbalanced journal entry', async () => {
    const { JournalService, JournalError } = await import('../src/modules/accounting/journal.service.js');
    const service = new JournalService(prisma);

    await expect(
      service.createEntry({
        tenantId,
        referenceType: 'manual',
        referenceId: 'test-unbalanced',
        description: 'Unbalanced entry',
        lines: [
          { accountId: cashAccountId, debitAmount: 100, creditAmount: 0 },
          { accountId: incomeAccountId, debitAmount: 0, creditAmount: 90 }, // should be 100
        ],
      }),
    ).rejects.toThrow(JournalError);
  });

  // Test 3: Reject ambiguous line
  it('rejects line with both debit and credit', async () => {
    const { JournalService, JournalError } = await import('../src/modules/accounting/journal.service.js');
    const service = new JournalService(prisma);

    await expect(
      service.createEntry({
        tenantId,
        referenceType: 'manual',
        referenceId: 'test-ambiguous',
        description: 'Ambiguous line',
        lines: [
          { accountId: cashAccountId, debitAmount: 100, creditAmount: 50 }, // both!
          { accountId: incomeAccountId, debitAmount: 0, creditAmount: 100 },
        ],
      }),
    ).rejects.toThrow(JournalError);
  });

  // Test 4: Reject zero line
  it('rejects line with zero amount', async () => {
    const { JournalService, JournalError } = await import('../src/modules/accounting/journal.service.js');
    const service = new JournalService(prisma);

    await expect(
      service.createEntry({
        tenantId,
        referenceType: 'manual',
        referenceId: 'test-zero',
        description: 'Zero line',
        lines: [
          { accountId: cashAccountId, debitAmount: 0, creditAmount: 0 }, // zero!
          { accountId: incomeAccountId, debitAmount: 0, creditAmount: 0 },
        ],
      }),
    ).rejects.toThrow(JournalError);
  });

  // Test 5: Reject duplicate reference
  it('rejects duplicate reference', async () => {
    const { JournalService, JournalError } = await import('../src/modules/accounting/journal.service.js');
    const service = new JournalService(prisma);

    // First create an entry with a non-manual reference type to check dupes
    await service.createEntry({
      tenantId,
      referenceType: 'invoice',
      referenceId: 'dup-test-001',
      description: 'Original',
      lines: [
        { accountId: cashAccountId, debitAmount: 50, creditAmount: 0 },
        { accountId: incomeAccountId, debitAmount: 0, creditAmount: 50 },
      ],
    });

    await expect(
      service.createEntry({
        tenantId,
        referenceType: 'invoice',
        referenceId: 'dup-test-001', // already used
        description: 'Duplicate',
        lines: [
          { accountId: cashAccountId, debitAmount: 50, creditAmount: 0 },
          { accountId: incomeAccountId, debitAmount: 0, creditAmount: 50 },
        ],
      }),
    ).rejects.toThrow(JournalError);
  });

  // Test 6: Post invoice journal
  it('posts invoice journal entry', async () => {
    const { JournalService } = await import('../src/modules/accounting/journal.service.js');
    const service = new JournalService(prisma);

    const entry = await service.postInvoice({
      tenantId,
      invoiceId: 'inv-001',
      apartmentId: aptId,
      totalAmount: 250.00,
      receivableAccountId,
      incomeAccountId,
    });

    expect(entry.referenceType).toBe('invoice');
    expect(entry.referenceId).toBe('inv-001');
    expect(entry.totalDebit).toBe(250);
    expect(entry.totalCredit).toBe(250);

    // Debit line should be receivable
    const debitLine = entry.lines.find((l: any) => l.debitAmount > 0);
    expect(debitLine.accountId).toBe(receivableAccountId);
    expect(debitLine.apartmentId).toBe(aptId);

    // Credit line should be income
    const creditLine = entry.lines.find((l: any) => l.creditAmount > 0);
    expect(creditLine.accountId).toBe(incomeAccountId);
  });

  // Test 7: Post payment journal
  it('posts payment journal entry', async () => {
    const { JournalService } = await import('../src/modules/accounting/journal.service.js');
    const service = new JournalService(prisma);

    const entry = await service.postPayment({
      tenantId,
      paymentId: 'pay-001',
      apartmentId: aptId,
      amount: 250.00,
      cashAccountId,
      receivableAccountId,
    });

    expect(entry.referenceType).toBe('payment');
    expect(entry.referenceId).toBe('pay-001');

    // Debit line should be cash
    const debitLine = entry.lines.find((l: any) => l.debitAmount > 0);
    expect(debitLine.accountId).toBe(cashAccountId);

    // Credit line should be receivable
    const creditLine = entry.lines.find((l: any) => l.creditAmount > 0);
    expect(creditLine.accountId).toBe(receivableAccountId);
  });

  // Test 8: Post expense journal
  it('posts expense journal entry', async () => {
    const { JournalService } = await import('../src/modules/accounting/journal.service.js');
    const service = new JournalService(prisma);

    const entry = await service.postExpense({
      tenantId,
      expenseId: 'exp-001',
      amount: 150.00,
      expenseAccountId,
      payableAccountId,
      supplierName: 'Eesti Energia',
    });

    expect(entry.referenceType).toBe('expense');
    expect(entry.referenceId).toBe('exp-001');

    // Debit line should be expense
    const debitLine = entry.lines.find((l: any) => l.debitAmount > 0);
    expect(debitLine.accountId).toBe(expenseAccountId);

    // Credit line should be payable
    const creditLine = entry.lines.find((l: any) => l.creditAmount > 0);
    expect(creditLine.accountId).toBe(payableAccountId);
  });

  // Test 9: Reverse a journal entry
  it('reverses a journal entry', async () => {
    const { JournalService } = await import('../src/modules/accounting/journal.service.js');
    const service = new JournalService(prisma);

    const original = await service.createEntry({
      tenantId,
      referenceType: 'manual',
      referenceId: 'test-reverse-original',
      description: 'To be reversed',
      lines: [
        { accountId: cashAccountId, debitAmount: 75, creditAmount: 0 },
        { accountId: incomeAccountId, debitAmount: 0, creditAmount: 75 },
      ],
    });

    const reverse = await service.reverseEntry(original.id);

    // Reverse entry should have swapped amounts
    expect(reverse.totalDebit).toBe(75);
    expect(reverse.totalCredit).toBe(75);

    const debitLine = reverse.lines.find((l: any) => l.debitAmount > 0);
    expect(debitLine.accountId).toBe(incomeAccountId); // swapped

    // Original should be marked reversed
    const checkOriginal = await prisma.journalEntry.findUnique({ where: { id: original.id } });
    expect(checkOriginal!.status).toBe('reversed');

    // Can't reverse again
    await expect(service.reverseEntry(original.id)).rejects.toThrow();
  });
});

// ===========================================================================
// Reports Tests
// ===========================================================================

describe('Reports Service', () => {
  let tenantId: string;
  let cashId: string;
  let receivableId: string;
  let incomeId: string;
  let expenseId: string;
  let payableId: string;

  beforeAll(async () => {
    const tenant = await createTestTenant();
    tenantId = tenant.id;

    const assetClass = await createAccountClass(tenantId, '10', 'Assets', 'balance_sheet');
    const liabilityClass = await createAccountClass(tenantId, '20', 'Liabilities', 'balance_sheet');
    const equityClass = await createAccountClass(tenantId, '30', 'Equity', 'balance_sheet');
    const incomeClass = await createAccountClass(tenantId, '40', 'Income', 'income');
    const expenseClass = await createAccountClass(tenantId, '50', 'Expenses', 'income');

    cashId = (await createAccount(tenantId, '1010', 'Cash', assetClass.id)).id;
    receivableId = (await createAccount(tenantId, '1100', 'Receivables', assetClass.id)).id;
    incomeId = (await createAccount(tenantId, '4110', 'Maintenance Fees', incomeClass.id)).id;
    expenseId = (await createAccount(tenantId, '5110', 'Electricity Cost', expenseClass.id)).id;
    payableId = (await createAccount(tenantId, '2110', 'Payables', liabilityClass.id)).id;

    // Post some test entries using journal service
    const { JournalService } = await import('../src/modules/accounting/journal.service.js');
    const js = new JournalService(prisma);

    const building = await createBuilding(tenantId);
    const apt = await createApartment(tenantId, building.id, 'Rpt-Apt');
    const aptId = apt.id;

    // Invoice: 1000€ receivable
    await js.postInvoice({
      tenantId, invoiceId: 'rpt-inv-1', apartmentId: aptId, totalAmount: 1000,
      receivableAccountId: receivableId, incomeAccountId: incomeId,
    });

    // Payment: 800€ received
    await js.postPayment({
      tenantId, paymentId: 'rpt-pay-1', apartmentId: aptId, amount: 800,
      cashAccountId: cashId, receivableAccountId: receivableId,
    });

    // Expense: 400€ electricity
    await js.postExpense({
      tenantId, expenseId: 'rpt-exp-1', amount: 400,
      expenseAccountId: expenseId, payableAccountId: payableId,
      supplierName: 'Eesti Energia',
    });
  });

  afterAll(async () => {
    await cleanup(tenantId);
  });

  // Test 10: Trial balance
  it('trial balance is correct', async () => {
    const { ReportsService } = await import('../src/modules/accounting/reports.service.js');
    const rs = new ReportsService(prisma);

    const tb = await rs.getTrialBalance(tenantId);

    // Should have 5 accounts with activity
    expect(tb.length).toBeGreaterThanOrEqual(5);

    // Cash: 800 debit
    const cashRow = tb.find(r => r.accountId === cashId);
    expect(cashRow).toBeDefined();
    expect(cashRow!.totalDebit).toBe(800);
    expect(cashRow!.totalCredit).toBe(0);

    // Receivable: 1000 debit - 800 credit = 200 debit balance
    const recvRow = tb.find(r => r.accountId === receivableId);
    expect(recvRow).toBeDefined();
    expect(recvRow!.totalDebit).toBe(1000);
    expect(recvRow!.totalCredit).toBe(800);

    // Income: 1000 credit
    const incomeRow = tb.find(r => r.accountId === incomeId);
    expect(incomeRow).toBeDefined();
    expect(incomeRow!.totalDebit).toBe(0);
    expect(incomeRow!.totalCredit).toBe(1000);

    // Expense: 400 debit
    const expenseRow = tb.find(r => r.accountId === expenseId);
    expect(expenseRow).toBeDefined();
    expect(expenseRow!.totalDebit).toBe(400);
    expect(expenseRow!.totalCredit).toBe(0);

    // Payable: 400 credit
    const payableRow = tb.find(r => r.accountId === payableId);
    expect(payableRow).toBeDefined();
    expect(payableRow!.totalDebit).toBe(0);
    expect(payableRow!.totalCredit).toBe(400);
  });

  // Test 11: Balance sheet
  it('balance sheet balances (assets = liabilities + equity)', async () => {
    const { ReportsService } = await import('../src/modules/accounting/reports.service.js');
    const rs = new ReportsService(prisma);

    const bs = await rs.getBalanceSheet(tenantId);

    // Cash(800) + Receivables(200) = 1000 assets
    expect(bs.totalAssets).toBe(1000);

    // Payables(400) = 400 liabilities
    expect(bs.liabilities.total).toBe(400);

    // Assets should equal Liabilities + Equity
    expect(bs.totalAssets).toBe(bs.totalLiabilitiesPlusEquity);
  });

  // Test 12: Income statement
  it('income statement shows net income correctly', async () => {
    const { ReportsService } = await import('../src/modules/accounting/reports.service.js');
    const rs = new ReportsService(prisma);

    const is = await rs.getIncomeStatement(tenantId);

    // Total income: 1000
    expect(is.totalIncome).toBe(1000);
    // Total expense: 400
    expect(is.totalExpense).toBe(400);
    // Net income: 600
    expect(is.netIncome).toBe(600);
  });

  // Test 13: Account ledger
  it('account ledger shows running balance', async () => {
    const { ReportsService } = await import('../src/modules/accounting/reports.service.js');
    const rs = new ReportsService(prisma);

    const ledger = await rs.getAccountLedger(tenantId, cashId);

    expect(ledger.accountNumber).toBe('1010');
    expect(ledger.entries.length).toBeGreaterThanOrEqual(1);

    // Final running balance should be 800 (payment received)
    const lastEntry = ledger.entries[ledger.entries.length - 1];
    expect(lastEntry.runningBalance).toBe(800);
  });
});