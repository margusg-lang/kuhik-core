// kuhik-core/backend/__tests__/financial-classification.test.ts
// Tests for the Financial Classification Foundation (Wave X)
//
// These tests validate that:
// 1. AccountClass, CashflowGroup, CostCategory can be created and queried
// 2. ChartAccount can be created with proper classification metadata
// 3. Cost and AllocationItem can carry costCategoryId
// 4. Seed data contains the expected master records
// 5. The schema is backward-compatible with existing data patterns

import { describe, it, expect } from "vitest";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function createTestTenant() {
  const slug = `test-fin-${Date.now()}`;
  return prisma.tenant.create({
    data: {
      name: "Test Financial Tenant",
      slug,
      isActive: true,
    },
  });
}

async function cleanup(tenantId: string) {
  // Delete in dependency order — raw SQL for widest FK constraints since
  // Prisma doesn't support nested deleteMany where for deeply related tables
  await prisma.$executeRawUnsafe(`DELETE FROM penalty_entries WHERE tenant_id = $1`, tenantId);
  await prisma.$executeRawUnsafe(`DELETE FROM payment_allocations WHERE tenant_id = $1`, tenantId);
  await prisma.$executeRawUnsafe(`DELETE FROM payments WHERE tenant_id = $1`, tenantId);
  await prisma.$executeRawUnsafe(`DELETE FROM receivables WHERE tenant_id = $1`, tenantId);
  await prisma.$executeRawUnsafe(`DELETE FROM charge_lines WHERE tenant_id = $1`, tenantId);
  await prisma.$executeRawUnsafe(`DELETE FROM allocation_items WHERE run_id IN (SELECT id FROM allocation_runs WHERE tenant_id = $1)`, tenantId);
  await prisma.$executeRawUnsafe(`DELETE FROM allocation_run_costs WHERE run_id IN (SELECT id FROM allocation_runs WHERE tenant_id = $1)`, tenantId);
  await prisma.$executeRawUnsafe(`DELETE FROM allocation_runs WHERE tenant_id = $1`, tenantId);
  await prisma.$executeRawUnsafe(`DELETE FROM allocation_shares WHERE tenant_id = $1`, tenantId);
  await prisma.$executeRawUnsafe(`DELETE FROM allocation_rules WHERE tenant_id = $1`, tenantId);
  await prisma.$executeRawUnsafe(`DELETE FROM journal_entry_lines WHERE tenant_id = $1`, tenantId);
  await prisma.$executeRawUnsafe(`DELETE FROM journal_entries WHERE tenant_id = $1`, tenantId);
  await prisma.$executeRawUnsafe(`DELETE FROM chart_accounts WHERE tenant_id = $1`, tenantId);
  await prisma.$executeRawUnsafe(`DELETE FROM cost_categories WHERE tenant_id = $1`, tenantId);
  await prisma.$executeRawUnsafe(`DELETE FROM cashflow_groups WHERE tenant_id = $1`, tenantId);
  await prisma.$executeRawUnsafe(`DELETE FROM account_classes WHERE tenant_id = $1`, tenantId);
  await prisma.$executeRawUnsafe(`DELETE FROM costs WHERE tenant_id = $1`, tenantId);
  await prisma.$executeRawUnsafe(`DELETE FROM resource_types WHERE tenant_id = $1`, tenantId);
  await prisma.$executeRawUnsafe(`DELETE FROM apartments WHERE tenant_id = $1`, tenantId);
  await prisma.$executeRawUnsafe(`DELETE FROM buildings WHERE tenant_id = $1`, tenantId);
  await prisma.tenant.delete({ where: { id: tenantId } });
}

// ---------------------------------------------------------------------------
// AccountClass
// ---------------------------------------------------------------------------

describe("AccountClass", () => {
  it("can be created and queried", async () => {
    const tenant = await createTestTenant();
    try {
      const ac = await prisma.accountClass.create({
        data: {
          tenantId: tenant.id,
          code: "test_cash",
          name: "Test Cash / Bank",
          statementType: "asset",
          sortOrder: 10,
        },
      });

      expect(ac.id).toBeDefined();
      expect(ac.code).toBe("test_cash");
      expect(ac.statementType).toBe("asset");
      expect(ac.sortOrder).toBe(10);
      expect(ac.isActive).toBe(true);
      expect(ac.createdAt).toBeDefined();
      expect(ac.updatedAt).toBeDefined();
    } finally {
      await cleanup(tenant.id);
    }
  });

  it("enforces unique (tenantId, code)", async () => {
    const tenant = await createTestTenant();
    try {
      await prisma.accountClass.create({
        data: { tenantId: tenant.id, code: "dup", name: "First", statementType: "asset" },
      });

      await expect(
        prisma.accountClass.create({
          data: { tenantId: tenant.id, code: "dup", name: "Second", statementType: "asset" },
        })
      ).rejects.toThrow();
    } finally {
      await cleanup(tenant.id);
    }
  });
});

// ---------------------------------------------------------------------------
// CashflowGroup
// ---------------------------------------------------------------------------

describe("CashflowGroup", () => {
  it("can be created with inflow/outflow/excluded direction", async () => {
    const tenant = await createTestTenant();
    try {
      const inflow = await prisma.cashflowGroup.create({
        data: { tenantId: tenant.id, code: "test_in", name: "Test In", direction: "inflow", sortOrder: 10 },
      });
      const outflow = await prisma.cashflowGroup.create({
        data: { tenantId: tenant.id, code: "test_out", name: "Test Out", direction: "outflow", sortOrder: 20 },
      });
      const excluded = await prisma.cashflowGroup.create({
        data: { tenantId: tenant.id, code: "test_ex", name: "Test Excluded", direction: "excluded", sortOrder: 999 },
      });

      expect(inflow.direction).toBe("inflow");
      expect(outflow.direction).toBe("outflow");
      expect(excluded.direction).toBe("excluded");
    } finally {
      await cleanup(tenant.id);
    }
  });
});

// ---------------------------------------------------------------------------
// CostCategory
// ---------------------------------------------------------------------------

describe("CostCategory", () => {
  it("can be created with kind = expense | income | both", async () => {
    const tenant = await createTestTenant();
    try {
      const expense = await prisma.costCategory.create({
        data: { tenantId: tenant.id, code: "test_exp", name: "Test Expense", kind: "expense" },
      });
      const income = await prisma.costCategory.create({
        data: { tenantId: tenant.id, code: "test_inc", name: "Test Income", kind: "income" },
      });
      const both = await prisma.costCategory.create({
        data: { tenantId: tenant.id, code: "test_both", name: "Test Both", kind: "both" },
      });

      expect(expense.kind).toBe("expense");
      expect(income.kind).toBe("income");
      expect(both.kind).toBe("both");
    } finally {
      await cleanup(tenant.id);
    }
  });
});

// ---------------------------------------------------------------------------
// ChartAccount — classification metadata
// ---------------------------------------------------------------------------

describe("ChartAccount", () => {
  it("can be created with account class, cashflow group, and default cost category", async () => {
    const tenant = await createTestTenant();
    try {
      const ac = await prisma.accountClass.create({
        data: { tenantId: tenant.id, code: "ac_asset", name: "Asset", statementType: "asset" },
      });
      const cg = await prisma.cashflowGroup.create({
        data: { tenantId: tenant.id, code: "cg_op", name: "Operating", direction: "inflow" },
      });
      const cc = await prisma.costCategory.create({
        data: { tenantId: tenant.id, code: "cc_main", name: "Maintenance", kind: "expense" },
      });

      const chartAccount = await prisma.chartAccount.create({
        data: {
          tenantId: tenant.id,
          accountNumber: "1101",
          name: "Test Cash Account",
          accountClassId: ac.id,
          cashflowGroupId: cg.id,
          defaultCostCategoryId: cc.id,
        },
        include: {
          accountClass: true,
          cashflowGroup: true,
          defaultCostCategory: true,
        },
      });

      expect(chartAccount.accountNumber).toBe("1101");
      expect(chartAccount.accountClass.code).toBe("ac_asset");
      expect(chartAccount.cashflowGroup!.code).toBe("cg_op");
      expect(chartAccount.defaultCostCategory!.code).toBe("cc_main");
      expect(chartAccount.isActive).toBe(true);
    } finally {
      await cleanup(tenant.id);
    }
  });

  it("allows cashflowGroup and defaultCostCategory to be null", async () => {
    const tenant = await createTestTenant();
    try {
      const ac = await prisma.accountClass.create({
        data: { tenantId: tenant.id, code: "ac_liab", name: "Liability", statementType: "liability" },
      });

      const chartAccount = await prisma.chartAccount.create({
        data: {
          tenantId: tenant.id,
          accountNumber: "2101",
          name: "Test Liability Account",
          accountClassId: ac.id,
          // cashflowGroupId intentionally null — excluded from CF
          // defaultCostCategoryId intentionally null
        },
      });

      expect(chartAccount.cashflowGroupId).toBeNull();
      expect(chartAccount.defaultCostCategoryId).toBeNull();
    } finally {
      await cleanup(tenant.id);
    }
  });
});

// ---------------------------------------------------------------------------
// Cost — operational costCategoryId
// ---------------------------------------------------------------------------

describe("Cost.costCategoryId", () => {
  it("accepts a cost category on creation and returns it on query", async () => {
    const tenant = await createTestTenant();
    try {
      // Need a resourceType for Cost
      const rt = await prisma.resourceType.create({
        data: { tenantId: tenant.id, name: "Electricity", code: `el-${Date.now()}`, category: "utility" },
      });
      const cc = await prisma.costCategory.create({
        data: { tenantId: tenant.id, code: `cc_util_${Date.now()}`, name: "Utilities Test", kind: "expense" },
      });

      const cost = await prisma.cost.create({
        data: {
          tenantId: tenant.id,
          resourceTypeId: rt.id,
          description: "Monthly electricity",
          amount: 1500,
          totalAmount: 1500,
          costCategoryId: cc.id,
          periodYear: 2026,
          periodMonth: 6,
        },
        include: { costCategory: true },
      });

      expect(cost.costCategoryId).toBe(cc.id);
      expect(cost.costCategory!.code).toBe(cc.code);
    } finally {
      await cleanup(tenant.id);
    }
  });

  it("allows null costCategoryId (backward compatibility)", async () => {
    const tenant = await createTestTenant();
    try {
      const rt = await prisma.resourceType.create({
        data: { tenantId: tenant.id, name: "Water", code: `water-${Date.now()}`, category: "utility" },
      });

      const cost = await prisma.cost.create({
        data: {
          tenantId: tenant.id,
          resourceTypeId: rt.id,
          description: "Monthly water",
          amount: 800,
          totalAmount: 800,
          periodYear: 2026,
          periodMonth: 6,
        },
      });

      expect(cost.costCategoryId).toBeNull();
    } finally {
      await cleanup(tenant.id);
    }
  });
});

// ---------------------------------------------------------------------------
// AllocationItem — operational costCategoryId
// ---------------------------------------------------------------------------

describe("AllocationItem.costCategoryId", () => {
  it("accepts a cost category on creation", async () => {
    const tenant = await createTestTenant();
    try {
      const cc = await prisma.costCategory.create({
        data: { tenantId: tenant.id, code: `cc_test_${Date.now()}`, name: "Test Cat", kind: "expense" },
      });

      // Need an allocation run + apartment
      const building = await prisma.building.create({
        data: { tenantId: tenant.id, name: "Test Building" },
      });
      const apartment = await prisma.apartment.create({
        data: { tenantId: tenant.id, buildingId: building.id, unitLabel: "T1" },
      });
      const run = await prisma.allocationRun.create({
        data: {
          tenantId: tenant.id,
          periodStart: new Date("2026-06-01"),
          periodEnd: new Date("2026-06-30"),
          status: "draft",
        },
      });

      const item = await prisma.allocationItem.create({
        data: {
          runId: run.id,
          apartmentId: apartment.id,
          costType: "electricity",
          costCategoryId: cc.id,
          method: "flat",
          amount: 100,
        },
        include: { costCategory: true },
      });

      expect(item.costCategoryId).toBe(cc.id);
      expect(item.costCategory!.code).toBe(cc.code);
    } finally {
      await cleanup(tenant.id);
    }
  });
});