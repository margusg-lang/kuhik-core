// kuhik-core/backend/src/modules/accounting/journal.service.ts
// Wave D.2 — Double-entry bookkeeping journal engine.
//
// INVARIANTS (enforced):
// I1: total_debit === total_credit for every journal entry
// I2: Each line has either debit_amount > 0 XOR credit_amount > 0 (never both)
// I3: Reference is unique per reference_type (no double-posting)
// I4: Period must be ACTIVE (not CLOSED) for automated entries
//
// Usage examples:
//   postInvoiceJournal(tx, invoice, receivableAccountId, incomeAccountId)
//   postPaymentJournal(tx, payment, cashAccountId, receivableAccountId)

import { PrismaClient } from "@prisma/client";
import { roundCents } from "../allocation/allocation.engine.js";
import { assertOperationAllowed, PeriodStatus } from "../../guards/period-guard.js";

type TxClient = Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">;

export interface JournalLineInput {
  accountId: string;
  debitAmount: number;
  creditAmount: number;
  description?: string;
  costCategoryId?: string;
  apartmentId?: string;
}

export interface JournalEntryInput {
  tenantId: string;
  periodId?: string;
  referenceType: string;  // 'invoice' | 'payment' | 'expense' | 'manual'
  referenceId: string;
  description?: string;
  lines: JournalLineInput[];
}

export class JournalError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = 'JournalError';
  }
}

export class JournalService {
  constructor(private tx: TxClient) {}

  // =======================================================================
  // CORE: Create journal entry
  // =======================================================================

  /**
   * Create a journal entry with full invariant enforcement.
   * INVARIANT I1: total_debit === total_credit
   * INVARIANT I2: each line has XOR debit/credit
   * INVARIANT I3: no duplicate reference
   * INVARIANT I4: period must not be CLOSED
   */
  async createEntry(input: JournalEntryInput): Promise<any> {
    const { tenantId, periodId, referenceType, referenceId, description, lines } = input;

    // I2: Validate each line has exactly one of debit or credit
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      const hasDebit = l.debitAmount > 0;
      const hasCredit = l.creditAmount > 0;
      if (hasDebit && hasCredit) {
        throw new JournalError(
          `Line ${i}: cannot have both debit and credit on same line`,
          'AMBIGUOUS_LINE',
        );
      }
      if (!hasDebit && !hasCredit) {
        throw new JournalError(
          `Line ${i}: must have either debit or credit amount`,
          'ZERO_LINE',
        );
      }
      if (l.debitAmount < 0 || l.creditAmount < 0) {
        throw new JournalError(
          `Line ${i}: negative amounts not allowed`,
          'NEGATIVE_AMOUNT',
        );
      }
    }

    // I1: Validate total debit === total credit
    const totalDebit = roundCents(lines.reduce((s, l) => s + l.debitAmount, 0));
    const totalCredit = roundCents(lines.reduce((s, l) => s + l.creditAmount, 0));
    if (totalDebit !== totalCredit) {
      throw new JournalError(
        `Debit (${totalDebit}) !== Credit (${totalCredit}) — unbalanced journal entry`,
        'UNBALANCED_ENTRY',
      );
    }

    // I3: Check for duplicate reference
    if (referenceType !== 'manual') {
      const existing = await this.tx.journalEntry.findFirst({
        where: { tenantId, referenceType, referenceId },
      });
      if (existing) {
        throw new JournalError(
          `Journal entry already exists for ${referenceType}:${referenceId}`,
          'DUPLICATE_REFERENCE',
        );
      }
    }

    // I4: Check period status (if periodId provided)
    if (periodId) {
      const period = await this.tx.accountingPeriod.findUnique({
        where: { id: periodId },
      });
      if (period) {
        assertOperationAllowed(period.status as PeriodStatus, 'payment_entry');
      }
    }

    // Create the entry
    const entry = await this.tx.journalEntry.create({
      data: {
        tenantId,
        periodId: periodId || null,
        referenceType,
        referenceId,
        description: description || null,
        totalDebit,
        totalCredit,
        status: 'posted',
        lines: {
          create: lines.map(l => ({
            tenantId,
            accountId: l.accountId,
            debitAmount: l.debitAmount,
            creditAmount: l.creditAmount,
            description: l.description || null,
            costCategoryId: l.costCategoryId || null,
            apartmentId: l.apartmentId || null,
          })),
        },
      },
      include: { lines: true },
    });

    return entry;
  }

  // =======================================================================
  // INVOICE JOURNAL: Debit Receivables, Credit Income
  // =======================================================================

  /**
   * Post journal entry for an invoice.
   * Debit: Receivables account (per apartment)
   * Credit: Income account (by cost category)
   */
  async postInvoice(params: {
    tenantId: string;
    periodId?: string;
    invoiceId: string;
    apartmentId: string;
    totalAmount: number;
    receivableAccountId: string;
    incomeAccountId: string;
    costCategoryId?: string;
  }) {
    const { tenantId, periodId, invoiceId, apartmentId, totalAmount,
      receivableAccountId, incomeAccountId, costCategoryId } = params;

    return this.createEntry({
      tenantId,
      periodId,
      referenceType: 'invoice',
      referenceId: invoiceId,
      description: `Invoice ${invoiceId}`,
      lines: [
        {
          accountId: receivableAccountId,
          debitAmount: totalAmount,
          creditAmount: 0,
          apartmentId,
          costCategoryId,
          description: 'Invoice issued',
        },
        {
          accountId: incomeAccountId,
          debitAmount: 0,
          creditAmount: totalAmount,
          costCategoryId,
          description: 'Income',
        },
      ],
    });
  }

  // =======================================================================
  // PAYMENT JOURNAL: Debit Cash, Credit Receivables
  // =======================================================================

  /**
   * Post journal entry for a payment received.
   * Debit: Cash/Bank account
   * Credit: Receivables account
   */
  async postPayment(params: {
    tenantId: string;
    periodId?: string;
    paymentId: string;
    apartmentId: string;
    amount: number;
    cashAccountId: string;
    receivableAccountId: string;
    costCategoryId?: string;
  }) {
    const { tenantId, periodId, paymentId, apartmentId, amount,
      cashAccountId, receivableAccountId, costCategoryId } = params;

    return this.createEntry({
      tenantId,
      periodId,
      referenceType: 'payment',
      referenceId: paymentId,
      description: `Payment ${paymentId}`,
      lines: [
        {
          accountId: cashAccountId,
          debitAmount: amount,
          creditAmount: 0,
          apartmentId,
          description: 'Payment received',
        },
        {
          accountId: receivableAccountId,
          debitAmount: 0,
          creditAmount: amount,
          apartmentId,
          costCategoryId,
          description: 'Receivable reduction',
        },
      ],
    });
  }

  // =======================================================================
  // EXPENSE JOURNAL: Debit Expense, Credit Accounts Payable
  // =======================================================================

  /**
   * Post journal entry for an expense (supplier invoice).
   * Debit: Expense account (by cost category)
   * Credit: Accounts Payable
   */
  async postExpense(params: {
    tenantId: string;
    periodId?: string;
    expenseId: string;
    amount: number;
    expenseAccountId: string;
    payableAccountId: string;
    costCategoryId?: string;
    supplierName?: string;
  }) {
    const { tenantId, periodId, expenseId, amount,
      expenseAccountId, payableAccountId, costCategoryId, supplierName } = params;

    return this.createEntry({
      tenantId,
      periodId,
      referenceType: 'expense',
      referenceId: expenseId,
      description: `Expense ${expenseId}${supplierName ? ` - ${supplierName}` : ''}`,
      lines: [
        {
          accountId: expenseAccountId,
          debitAmount: amount,
          creditAmount: 0,
          costCategoryId,
          description: supplierName || 'Expense',
        },
        {
          accountId: payableAccountId,
          debitAmount: 0,
          creditAmount: amount,
          description: 'Accounts payable',
        },
      ],
    });
  }

  // =======================================================================
  // REVERSE: Reverses a posted journal entry
  // =======================================================================

  /**
   * Reverse a journal entry. Creates a new entry with swapped debits/credits.
   * Original entry status is changed to 'reversed'.
   */
  async reverseEntry(entryId: string): Promise<any> {
    const original = await this.tx.journalEntry.findUnique({
      where: { id: entryId },
      include: { lines: true },
    });

    if (!original) throw new JournalError('Journal entry not found', 'NOT_FOUND');
    if (original.status === 'reversed') {
      throw new JournalError('Journal entry already reversed', 'ALREADY_REVERSED');
    }

    // Create reverse entry with swapped debits/credits
    const reverseLines = original.lines.map(l => ({
      accountId: l.accountId,
      debitAmount: l.creditAmount,  // swapped
      creditAmount: l.debitAmount,  // swapped
      description: `Reversal: ${l.description || ''}`,
      costCategoryId: l.costCategoryId,
      apartmentId: l.apartmentId,
    }));

    const reverse = await this.createEntry({
      tenantId: original.tenantId,
      periodId: original.periodId || undefined,
      referenceType: 'manual',
      referenceId: `reversal-${original.id}`,
      description: `Reversal of ${original.referenceType}:${original.referenceId}`,
      lines: reverseLines,
    });

    // Mark original as reversed
    await this.tx.journalEntry.update({
      where: { id: entryId },
      data: { status: 'reversed' },
    });

    return reverse;
  }
}

// Factory for convenience
export function createJournalService(tx: TxClient): JournalService {
  return new JournalService(tx);
}