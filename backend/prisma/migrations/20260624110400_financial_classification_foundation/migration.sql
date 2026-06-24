-- Wave X: Financial Classification Foundation
-- Adds AccountClass, CashflowGroup, CostCategory, ChartAccount models
-- and extends Cost + AllocationItem with costCategoryId

-- CreateTable: account_classes
CREATE TABLE "account_classes" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "statement_type" TEXT NOT NULL DEFAULT 'unknown',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "account_classes_pkey" PRIMARY KEY ("id")
);

-- CreateTable: cashflow_groups
CREATE TABLE "cashflow_groups" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "direction" TEXT NOT NULL DEFAULT 'inflow',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "cashflow_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable: cost_categories
CREATE TABLE "cost_categories" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'both',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "cost_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable: chart_accounts
CREATE TABLE "chart_accounts" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "account_number" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "account_class_id" TEXT NOT NULL,
    "cashflow_group_id" TEXT,
    "default_cost_category_id" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "chart_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateIndexes
CREATE UNIQUE INDEX "account_classes_tenant_id_code_key" ON "account_classes"("tenant_id", "code");
CREATE UNIQUE INDEX "cashflow_groups_tenant_id_code_key" ON "cashflow_groups"("tenant_id", "code");
CREATE UNIQUE INDEX "cost_categories_tenant_id_code_key" ON "cost_categories"("tenant_id", "code");
CREATE UNIQUE INDEX "chart_accounts_tenant_id_account_number_key" ON "chart_accounts"("tenant_id", "account_number");

-- AddForeignKey: account_classes -> tenants
ALTER TABLE "account_classes" ADD CONSTRAINT "account_classes_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: cashflow_groups -> tenants
ALTER TABLE "cashflow_groups" ADD CONSTRAINT "cashflow_groups_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: cost_categories -> tenants
ALTER TABLE "cost_categories" ADD CONSTRAINT "cost_categories_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: chart_accounts -> tenants
ALTER TABLE "chart_accounts" ADD CONSTRAINT "chart_accounts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: chart_accounts -> account_classes
ALTER TABLE "chart_accounts" ADD CONSTRAINT "chart_accounts_account_class_id_fkey" FOREIGN KEY ("account_class_id") REFERENCES "account_classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: chart_accounts -> cashflow_groups
ALTER TABLE "chart_accounts" ADD CONSTRAINT "chart_accounts_cashflow_group_id_fkey" FOREIGN KEY ("cashflow_group_id") REFERENCES "cashflow_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: chart_accounts -> cost_categories (default)
ALTER TABLE "chart_accounts" ADD CONSTRAINT "chart_accounts_default_cost_category_id_fkey" FOREIGN KEY ("default_cost_category_id") REFERENCES "cost_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable: costs — add cost_category_id
ALTER TABLE "costs" ADD COLUMN "cost_category_id" TEXT;
ALTER TABLE "costs" ADD CONSTRAINT "costs_cost_category_id_fkey" FOREIGN KEY ("cost_category_id") REFERENCES "cost_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable: allocation_items — add cost_category_id
ALTER TABLE "allocation_items" ADD COLUMN "cost_category_id" TEXT;
ALTER TABLE "allocation_items" ADD CONSTRAINT "allocation_items_cost_category_id_fkey" FOREIGN KEY ("cost_category_id") REFERENCES "cost_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;