-- Wave B: Allocation Traceability Core
-- Adds: enhanced AllocationRule, enhanced AllocationRun, AllocationRunCost, ChargeLine
-- Extends: AllocationItem (basis fields), InvoiceLine (chargeLineId), KuhikInvoiceItem (chargeLineId)

-- AlterTable: allocation_rules — add new columns
ALTER TABLE "allocation_rules" 
  ADD COLUMN IF NOT EXISTS "target_scope" TEXT NOT NULL DEFAULT 'building',
  ADD COLUMN IF NOT EXISTS "default_cost_category_id" TEXT,
  ADD COLUMN IF NOT EXISTS "allocation_rules_default_cost_category_id_fkey" TEXT;

ALTER TABLE "allocation_rules"
  DROP CONSTRAINT IF EXISTS "allocation_rules_resource_type_id_fkey",
  ALTER COLUMN "resource_type_id" DROP NOT NULL;

-- AlterTable: allocation_runs — add new columns
ALTER TABLE "allocation_runs" 
  ADD COLUMN IF NOT EXISTS "building_id" TEXT,
  ADD COLUMN IF NOT EXISTS "allocation_rule_id" TEXT,
  ADD COLUMN IF NOT EXISTS "period_year" INTEGER,
  ADD COLUMN IF NOT EXISTS "period_month" INTEGER,
  ADD COLUMN IF NOT EXISTS "total_source_amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "total_allocated_amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "rounding_method" TEXT NOT NULL DEFAULT 'round_half_up',
  ADD COLUMN IF NOT EXISTS "rounding_remainder" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "notes" TEXT,
  ADD COLUMN IF NOT EXISTS "finalized_at" TIMESTAMPTZ;

-- AlterTable: allocation_items — add basis fields
ALTER TABLE "allocation_items"
  ADD COLUMN IF NOT EXISTS "basis_value" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "basis_total" DOUBLE PRECISION;

-- CreateTable: allocation_run_costs
CREATE TABLE IF NOT EXISTS "allocation_run_costs" (
    "id" TEXT NOT NULL,
    "run_id" TEXT NOT NULL,
    "cost_id" TEXT NOT NULL,
    "cost_category_id" TEXT,
    "source_amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "allocation_run_costs_pkey" PRIMARY KEY ("id")
);

-- CreateTable: charge_lines
CREATE TABLE IF NOT EXISTS "charge_lines" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "apartment_id" TEXT NOT NULL,
    "allocation_run_id" TEXT,
    "allocation_item_id" TEXT,
    "cost_category_id" TEXT,
    "label" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "source_type" TEXT NOT NULL DEFAULT 'allocation',
    "status" TEXT NOT NULL DEFAULT 'active',
    "period_year" INTEGER,
    "period_month" INTEGER,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "charge_lines_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE INDEX IF NOT EXISTS "allocation_run_costs_run_id_idx" ON "allocation_run_costs"("run_id");
CREATE INDEX IF NOT EXISTS "allocation_run_costs_cost_id_idx" ON "allocation_run_costs"("cost_id");
CREATE INDEX IF NOT EXISTS "charge_lines_tenant_id_apartment_id_idx" ON "charge_lines"("tenant_id", "apartment_id");
CREATE INDEX IF NOT EXISTS "charge_lines_allocation_run_id_idx" ON "charge_lines"("allocation_run_id");
CREATE INDEX IF NOT EXISTS "charge_lines_status_idx" ON "charge_lines"("status");
CREATE INDEX IF NOT EXISTS "allocation_runs_tenant_id_period_year_period_month_idx" ON "allocation_runs"("tenant_id", "period_year", "period_month");
CREATE INDEX IF NOT EXISTS "allocation_rules_tenant_id_building_id_idx" ON "allocation_rules"("tenant_id", "building_id");

-- Foreign keys: allocation_run_costs
ALTER TABLE "allocation_run_costs" ADD CONSTRAINT "allocation_run_costs_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "allocation_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "allocation_run_costs" ADD CONSTRAINT "allocation_run_costs_cost_id_fkey" FOREIGN KEY ("cost_id") REFERENCES "costs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "allocation_run_costs" ADD CONSTRAINT "allocation_run_costs_cost_category_id_fkey" FOREIGN KEY ("cost_category_id") REFERENCES "cost_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Foreign keys: charge_lines
ALTER TABLE "charge_lines" ADD CONSTRAINT "charge_lines_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "charge_lines" ADD CONSTRAINT "charge_lines_apartment_id_fkey" FOREIGN KEY ("apartment_id") REFERENCES "apartments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "charge_lines" ADD CONSTRAINT "charge_lines_allocation_run_id_fkey" FOREIGN KEY ("allocation_run_id") REFERENCES "allocation_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "charge_lines" ADD CONSTRAINT "charge_lines_allocation_item_id_fkey" FOREIGN KEY ("allocation_item_id") REFERENCES "allocation_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "charge_lines" ADD CONSTRAINT "charge_lines_cost_category_id_fkey" FOREIGN KEY ("cost_category_id") REFERENCES "cost_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Foreign keys: allocation_runs
ALTER TABLE "allocation_runs" ADD CONSTRAINT "allocation_runs_building_id_fkey" FOREIGN KEY ("building_id") REFERENCES "buildings"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "allocation_runs" ADD CONSTRAINT "allocation_runs_allocation_rule_id_fkey" FOREIGN KEY ("allocation_rule_id") REFERENCES "allocation_rules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Foreign keys: allocation_rules
ALTER TABLE "allocation_rules" ADD CONSTRAINT "allocation_rules_default_cost_category_id_fkey" FOREIGN KEY ("default_cost_category_id") REFERENCES "cost_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "allocation_rules" ADD CONSTRAINT "allocation_rules_resource_type_id_fkey" FOREIGN KEY ("resource_type_id") REFERENCES "resource_types"("id") ON DELETE SET NULL ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable: invoice_lines — add charge_line_id
ALTER TABLE "invoice_lines" ADD COLUMN IF NOT EXISTS "charge_line_id" TEXT;
ALTER TABLE "invoice_lines" ADD CONSTRAINT "invoice_lines_charge_line_id_fkey" FOREIGN KEY ("charge_line_id") REFERENCES "charge_lines"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable: kuhik_invoice_items — add charge_line_id
ALTER TABLE "kuhik_invoice_items" ADD COLUMN IF NOT EXISTS "charge_line_id" TEXT;
ALTER TABLE "kuhik_invoice_items" ADD CONSTRAINT "kuhik_invoice_items_charge_line_id_fkey" FOREIGN KEY ("charge_line_id") REFERENCES "charge_lines"("id") ON DELETE SET NULL ON UPDATE CASCADE;