-- Wave C: Financial State Layer
-- Receivables, Payments, PaymentAllocations, PenaltyEntries

-- CreateTable: receivables
CREATE TABLE IF NOT EXISTS "receivables" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "apartment_id" TEXT NOT NULL,
    "charge_line_id" TEXT,
    "cost_category_id" TEXT,
    "source_type" TEXT NOT NULL DEFAULT 'charge',
    "source_reference_id" TEXT,
    "amount_original" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "amount_outstanding" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "amount_paid" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'open',
    "period_year" INTEGER,
    "period_month" INTEGER,
    "due_date" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    CONSTRAINT "receivables_pkey" PRIMARY KEY ("id")
);

-- CreateTable: payments
CREATE TABLE IF NOT EXISTS "payments" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "apartment_id" TEXT,
    "invoice_id" TEXT,
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "payment_date" TIMESTAMPTZ NOT NULL,
    "reference_number" TEXT,
    "method" TEXT NOT NULL DEFAULT 'bank_transfer',
    "allocation_state" TEXT NOT NULL DEFAULT 'unallocated',
    "bank_transaction_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'received',
    "metadata" JSONB DEFAULT '{}',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable: payment_allocations
CREATE TABLE IF NOT EXISTS "payment_allocations" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "payment_id" TEXT NOT NULL,
    "receivable_id" TEXT NOT NULL,
    "apartment_id" TEXT,
    "amount_allocated" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "method" TEXT NOT NULL DEFAULT 'fifo',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "payment_allocations_pkey" PRIMARY KEY ("id")
);

-- CreateTable: penalty_entries
CREATE TABLE IF NOT EXISTS "penalty_entries" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "apartment_id" TEXT NOT NULL,
    "source_receivable_id" TEXT,
    "rule_id" TEXT,
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "interest_rate" DOUBLE PRECISION,
    "days_overdue" INTEGER,
    "period_year" INTEGER,
    "period_month" INTEGER,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "penalty_entries_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE INDEX IF NOT EXISTS "receivables_tenant_id_apartment_id_idx" ON "receivables"("tenant_id", "apartment_id");
CREATE INDEX IF NOT EXISTS "receivables_tenant_id_status_idx" ON "receivables"("tenant_id", "status");
CREATE INDEX IF NOT EXISTS "receivables_charge_line_id_idx" ON "receivables"("charge_line_id");
CREATE INDEX IF NOT EXISTS "payments_tenant_id_apartment_id_idx" ON "payments"("tenant_id", "apartment_id");
CREATE INDEX IF NOT EXISTS "payments_reference_number_idx" ON "payments"("reference_number");
CREATE INDEX IF NOT EXISTS "payment_allocations_payment_id_idx" ON "payment_allocations"("payment_id");
CREATE INDEX IF NOT EXISTS "payment_allocations_receivable_id_idx" ON "payment_allocations"("receivable_id");
CREATE INDEX IF NOT EXISTS "penalty_entries_tenant_id_apartment_id_idx" ON "penalty_entries"("tenant_id", "apartment_id");
CREATE INDEX IF NOT EXISTS "penalty_entries_source_receivable_id_idx" ON "penalty_entries"("source_receivable_id");
CREATE INDEX IF NOT EXISTS "penalty_entries_period_year_period_month_idx" ON "penalty_entries"("period_year", "period_month");

-- Foreign keys: receivables
ALTER TABLE "receivables" ADD CONSTRAINT "receivables_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "receivables" ADD CONSTRAINT "receivables_apartment_id_fkey" FOREIGN KEY ("apartment_id") REFERENCES "apartments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "receivables" ADD CONSTRAINT "receivables_charge_line_id_fkey" FOREIGN KEY ("charge_line_id") REFERENCES "charge_lines"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "receivables" ADD CONSTRAINT "receivables_cost_category_id_fkey" FOREIGN KEY ("cost_category_id") REFERENCES "cost_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Foreign keys: payments
ALTER TABLE "payments" ADD CONSTRAINT "payments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "payments" ADD CONSTRAINT "payments_apartment_id_fkey" FOREIGN KEY ("apartment_id") REFERENCES "apartments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "payments" ADD CONSTRAINT "payments_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "payments" ADD CONSTRAINT "payments_bank_transaction_id_fkey" FOREIGN KEY ("bank_transaction_id") REFERENCES "bank_transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Foreign keys: payment_allocations
ALTER TABLE "payment_allocations" ADD CONSTRAINT "payment_allocations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "payment_allocations" ADD CONSTRAINT "payment_allocations_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "payment_allocations" ADD CONSTRAINT "payment_allocations_receivable_id_fkey" FOREIGN KEY ("receivable_id") REFERENCES "receivables"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "payment_allocations" ADD CONSTRAINT "payment_allocations_apartment_id_fkey" FOREIGN KEY ("apartment_id") REFERENCES "apartments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Foreign keys: penalty_entries
ALTER TABLE "penalty_entries" ADD CONSTRAINT "penalty_entries_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "penalty_entries" ADD CONSTRAINT "penalty_entries_apartment_id_fkey" FOREIGN KEY ("apartment_id") REFERENCES "apartments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "penalty_entries" ADD CONSTRAINT "penalty_entries_source_receivable_id_fkey" FOREIGN KEY ("source_receivable_id") REFERENCES "receivables"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Unique constraint: payment_allocations
CREATE UNIQUE INDEX IF NOT EXISTS "payment_allocations_payment_id_receivable_id_key" ON "payment_allocations"("payment_id", "receivable_id");