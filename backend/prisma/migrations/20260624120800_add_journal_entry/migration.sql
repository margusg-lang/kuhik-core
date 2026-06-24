-- WAVE D.2 — Journal Entry (double-entry bookkeeping)
-- Each journal entry has a header + 2+ lines (debit/credit)
-- Links financial events (invoice, payment, expense) to chart accounts

CREATE TABLE IF NOT EXISTS "journal_entries" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenant_id" TEXT NOT NULL,
    "period_id" TEXT,
    "entry_date" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reference_type" TEXT NOT NULL,
    "reference_id" TEXT,
    "description" TEXT,
    "total_debit" REAL NOT NULL DEFAULT 0,
    "total_credit" REAL NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'posted',
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "fk_journal_entry_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE,
    CONSTRAINT "fk_journal_entry_period" FOREIGN KEY ("period_id") REFERENCES "accounting_periods"("id") ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS "journal_entry_lines" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "journal_entry_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "debit_amount" REAL NOT NULL DEFAULT 0,
    "credit_amount" REAL NOT NULL DEFAULT 0,
    "description" TEXT,
    "cost_category_id" TEXT,
    "apartment_id" TEXT,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "fk_jel_journal_entry" FOREIGN KEY ("journal_entry_id") REFERENCES "journal_entries"("id") ON DELETE CASCADE,
    CONSTRAINT "fk_jel_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE,
    CONSTRAINT "fk_jel_account" FOREIGN KEY ("account_id") REFERENCES "chart_accounts"("id") ON DELETE RESTRICT,
    CONSTRAINT "fk_jel_cost_category" FOREIGN KEY ("cost_category_id") REFERENCES "cost_categories"("id") ON DELETE SET NULL,
    CONSTRAINT "fk_jel_apartment" FOREIGN KEY ("apartment_id") REFERENCES "apartments"("id") ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS "idx_journal_entries_tenant_period" ON "journal_entries"("tenant_id", "period_id");
CREATE INDEX IF NOT EXISTS "idx_journal_entries_reference" ON "journal_entries"("reference_type", "reference_id");
CREATE INDEX IF NOT EXISTS "idx_journal_entry_lines_account" ON "journal_entry_lines"("account_id", "tenant_id");
CREATE INDEX IF NOT EXISTS "idx_journal_entry_lines_je" ON "journal_entry_lines"("journal_entry_id");