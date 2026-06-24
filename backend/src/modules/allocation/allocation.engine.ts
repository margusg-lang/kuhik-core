// kuhik-core/backend/src/modules/allocation/allocation.engine.ts
// Wave B — HARDENED: Deterministic allocation engine with full traceability.
// Chain: Cost → AllocationRun → AllocationItem → ChargeLine
// Gate validation: determinism, ordering, rounding, traceability, idempotency

import { prisma } from '../../index.js';
import { guardPeriod, PeriodStatus, assertOperationAllowed } from '../../guards/period-guard.js';

export type AllocationMethod = 'equal' | 'ownership_share' | 'area' | 'heated_area' | 'meter_based' | 'manual';

interface ApartmentBasis {
  id: string;
  unitLabel: string;
  value: number; // the basis value (share %, area m2, reading, etc.)
}

export interface AllocationInput {
  tenantId: string;
  buildingId?: string;
  periodYear: number;
  periodMonth: number;
  periodStart: Date;
  periodEnd: Date;
  ruleId: string;
  costIds: string[];
}

export interface AllocationResultLine {
  apartmentId: string;
  costType: string;
  costCategoryId: string | null;
  method: AllocationMethod;
  amount: number;
  basisValue: number | null;
  basisTotal: number | null;
}

// ===========================================================================
// MAIN: Execute allocation — fully deterministic
// ===========================================================================

export async function executeAllocation(input: AllocationInput): Promise<{
  runId: string;
  items: AllocationResultLine[];
  totalSourceAmount: number;
  totalAllocatedAmount: number;
  roundingRemainder: number;
}> {
  const { tenantId, buildingId, periodYear, periodMonth, periodStart, periodEnd, ruleId, costIds } = input;

  // 1. Check period guard — allocation only allowed in DRAFT or ACTIVE
  const accountingPeriod = await prisma.accountingPeriod.findFirst({
    where: {
      tenantId,
      periodYear,
      periodMonth,
    },
  });

  if (accountingPeriod) {
    // Check if this is a new run (creation) or a rerun
    const existingRun = await prisma.allocationRun.findFirst({
      where: {
        tenantId,
        allocationRuleId: ruleId,
        periodYear,
        periodMonth,
        status: 'draft',
      },
      orderBy: { createdAt: 'desc' },
    });

    if (existingRun) {
      // This is a rerun — check if rerun is allowed
      assertOperationAllowed(accountingPeriod.status as PeriodStatus, 'allocation_rerun');
    } else {
      // This is a new run
      assertOperationAllowed(accountingPeriod.status as PeriodStatus, 'allocation_run');
    }
  }
  // No accounting period found — allow (legacy behavior or period-less setup)

  // 2. Get the rule
  const rule = await prisma.allocationRule.findUnique({
    where: { id: ruleId },
    include: { resourceType: true },
  });
  if (!rule) throw new Error(`AllocationRule not found: ${ruleId}`);
  if (!rule.isActive) throw new Error(`AllocationRule is not active: ${ruleId}`);

  // 2. Get source costs — ordered by id for determinism
  const costs = await prisma.cost.findMany({
    where: { id: { in: costIds }, tenantId, status: { not: 'cancelled' } },
    orderBy: { id: 'asc' },
  });
  if (costs.length === 0) throw new Error('No source costs found');

  const totalSourceAmount = costs.reduce((s, c) => s + c.totalAmount, 0);

  // 3. Get apartments — ALWAYS sorted by unitLabel for deterministic ordering
  const apartments = await prisma.apartment.findMany({
    where: {
      tenantId,
      ...(buildingId ? { buildingId } : {}),
      isActive: true,
    },
    select: {
      id: true,
      unitLabel: true,
      ownershipShare: true,
      areaSqm: true,
      heatedAreaSqm: true,
    },
    orderBy: { unitLabel: 'asc' },
  });
  if (apartments.length === 0) throw new Error('No active apartments found');

  // 4. Compute bases — deterministic by construction
  let bases: ApartmentBasis[];
  if (rule.method === 'meter_based') {
    bases = await computeMeterBases(apartments, tenantId, periodStart, periodEnd);
  } else {
    bases = computeBasesSync(apartments, rule.method);
  }
  const totalBasis = bases.reduce((s, b) => s + b.value, 0);

  // 5. Determine cost category
  const costCategoryId = determineCategory(costs, rule);

  // 6. Allocate — pure function, no side effects
  const lines = allocateAmount(
    totalSourceAmount,
    bases,
    rule.method,
    costCategoryId,
    rule.resourceType?.name?.toLowerCase() || 'other',
  );

  // 7. Compute totals for verification
  const totalAllocated = lines.reduce((s, l) => s + l.amount, 0);
  const remainder = roundCents(totalSourceAmount - totalAllocated);

  // 8. Create the run with all records in a transaction
  const run = await prisma.$transaction(async (tx) => {
    // Check if exact same allocation already exists (idempotency)
    const existingRun = await tx.allocationRun.findFirst({
      where: {
        tenantId,
        allocationRuleId: ruleId,
        periodYear,
        periodMonth,
        totalSourceAmount,
        status: 'draft',
      },
      orderBy: { createdAt: 'desc' },
    });

    if (existingRun) {
      // Delete old items to allow re-creation (idempotent overwrite)
      await tx.allocationItem.deleteMany({ where: { runId: existingRun.id } });
      await tx.allocationRunCost.deleteMany({ where: { runId: existingRun.id } });
      await tx.allocationRun.delete({ where: { id: existingRun.id } });
    }

    return tx.allocationRun.create({
      data: {
        tenantId,
        buildingId: buildingId || null,
        allocationRuleId: ruleId,
        periodYear,
        periodMonth,
        periodStart,
        periodEnd,
        status: 'draft',
        totalSourceAmount,
        totalAllocatedAmount: totalAllocated,
        roundingRemainder: remainder,
        sourceCosts: {
          create: costs.map(c => ({
            costId: c.id,
            costCategoryId: c.costCategoryId,
            sourceAmount: c.totalAmount,
          })),
        },
        items: {
          create: lines.map(l => ({
            apartmentId: l.apartmentId,
            costType: l.costType,
            costCategoryId: l.costCategoryId,
            method: l.method,
            amount: l.amount,
            basisValue: l.basisValue,
            basisTotal: l.basisTotal,
          })),
        },
      },
      include: { items: true },
    });
  });

  const items: AllocationResultLine[] = run.items.map(i => ({
    apartmentId: i.apartmentId,
    costType: i.costType,
    costCategoryId: i.costCategoryId,
    method: i.method as AllocationMethod,
    amount: i.amount,
    basisValue: i.basisValue,
    basisTotal: i.basisTotal,
  }));

  return {
    runId: run.id,
    items,
    totalSourceAmount,
    totalAllocatedAmount: totalAllocated,
    roundingRemainder: remainder,
  };
}

// ===========================================================================
// BASIS COMPUTATION — purely synchronous, no DB calls
// ===========================================================================

function computeBasesSync(
  apartments: Array<{
    id: string;
    unitLabel: string;
    ownershipShare: number | null;
    areaSqm: number | null;
    heatedAreaSqm: number | null;
  }>,
  method: string,
): ApartmentBasis[] {
  switch (method) {
    case 'ownership_share':
      return apartments.map(a => ({
        id: a.id,
        unitLabel: a.unitLabel,
        value: a.ownershipShare || (1 / apartments.length),
      }));

    case 'area':
      return apartments.map(a => ({
        id: a.id,
        unitLabel: a.unitLabel,
        value: a.areaSqm || 0,
      }));

    case 'heated_area':
      return apartments.map(a => ({
        id: a.id,
        unitLabel: a.unitLabel,
        value: a.heatedAreaSqm || a.areaSqm || 0,
      }));

    // meter_based is handled in the async wrapper above — not here
    case 'manual':
      return apartments.map(a => ({
        id: a.id,
        unitLabel: a.unitLabel,
        value: 0,
      }));

    case 'equal':
    default:
      return apartments.map(a => ({
        id: a.id,
        unitLabel: a.unitLabel,
        value: 1,
      }));
  }
}

// ===========================================================================
// METER-BASED BASIS — async but deterministic (sorted query + ordered Map)
// ===========================================================================

export async function computeMeterBases(
  apartments: Array<{ id: string; unitLabel: string }>,
  tenantId: string,
  periodStart: Date,
  periodEnd: Date,
): Promise<ApartmentBasis[]> {
  // Deterministic query: sorted by meter ID asc, then timestamp desc
  // First reading per apartment wins (earliest meter ID, latest timestamp)
  const readings = await prisma.apartmentMeterReading.findMany({
    where: {
      tenantId,
      timestamp: { gte: periodStart, lte: periodEnd },
    },
    include: { meter: { select: { apartmentId: true } } },
    orderBy: [
      { meterId: 'asc' },
      { timestamp: 'desc' },
    ],
  });

  // First-wins per apartment (guaranteed deterministic due to above sort)
  const latestByApt = new Map<string, number>();
  for (const r of readings) {
    const aptId = r.meter.apartmentId;
    if (!aptId) continue;
    if (!latestByApt.has(aptId)) {
      latestByApt.set(aptId, r.value);
    }
  }

  return apartments.map(a => ({
    id: a.id,
    unitLabel: a.unitLabel,
    value: latestByApt.get(a.id) || 0,
  }));
}

// ===========================================================================
// CORE ALLOCATION MATH — pure function, deterministic, rounding-safe
// ===========================================================================

/**
 * Allocates totalAmount across bases using deterministic rounding.
 *
 * Rounding strategy: "round-half-up" with last-item remainder adjustment.
 * This guarantees: sum(result amounts) === totalAmount
 *
 * @param totalAmount — the total cost to allocate (in cents-precision float)
 * @param bases — sorted apartment basis values
 * @param method — allocation method name (for record)
 * @param costCategoryId — category to propagate
 * @param costType — type label
 * @returns sorted array of AllocationResultLine
 */
export function allocateAmount(
  totalAmount: number,
  bases: ApartmentBasis[],
  method: string,
  costCategoryId: string | null,
  costType: string,
): AllocationResultLine[] {
  const totalBasis = bases.reduce((s, b) => s + b.value, 0);

  // Guard: zero or negative basis → equal fallback
  if (totalBasis <= 0) {
    const perUnit = roundCents(totalAmount / bases.length);
    const items: AllocationResultLine[] = [];
    let allocated = 0;
    for (let i = 0; i < bases.length; i++) {
      const amount = (i === bases.length - 1)
        ? roundCents(totalAmount - allocated)
        : perUnit;
      allocated += amount;
      items.push({
        apartmentId: bases[i].id,
        costType,
        costCategoryId,
        method: method as AllocationMethod,
        amount,
        basisValue: null,
        basisTotal: null,
      });
    }
    return items;
  }

  // Normal allocation with proportional distribution
  const items: AllocationResultLine[] = [];
  let allocatedSum = 0;

  for (let i = 0; i < bases.length; i++) {
    const proportion = bases[i].value / totalBasis;

    // Round each line to cents
    let aptAmount: number;
    if (i === bases.length - 1) {
      // Last item gets the remainder to guarantee sum(totalAmount)
      aptAmount = roundCents(totalAmount - allocatedSum);
    } else {
      aptAmount = roundCents(totalAmount * proportion);
    }

    allocatedSum += aptAmount;

    items.push({
      apartmentId: bases[i].id,
      costType,
      costCategoryId,
      method: method as AllocationMethod,
      amount: aptAmount,
      basisValue: bases[i].value,
      basisTotal: totalBasis,
    });
  }

  return items;
}

// ===========================================================================
// ROUNDING UTILITY
// ===========================================================================

/** Round to 2 decimal places (cent precision). */
export function roundCents(value: number): number {
  return Math.round(value * 100) / 100;
}

// ===========================================================================
// CATEGORY DETERMINATION
// ===========================================================================

function determineCategory(
  costs: Array<{ costCategoryId: string | null }>,
  rule: { defaultCostCategoryId: string | null },
): string | null {
  const fromCosts = costs.find(c => c.costCategoryId);
  return fromCosts?.costCategoryId || rule.defaultCostCategoryId || null;
}

// ===========================================================================
// CHARGE LINE PREPARATION — idempotent, creates once per allocation item
// ===========================================================================

export async function prepareChargeLines(runId: string): Promise<number> {
  return prisma.$transaction(async (tx) => {
    const run = await tx.allocationRun.findUnique({
      where: { id: runId },
      include: { items: true },
    });
    if (!run) throw new Error(`AllocationRun not found: ${runId}`);
    if (run.items.length === 0) return 0;

    // Idempotency: remove any existing charge lines for this run
    await tx.chargeLine.deleteMany({ where: { allocationRunId: runId } });

    // Create fresh charge lines
    const chargeData = run.items.map(item => ({
      tenantId: run.tenantId,
      apartmentId: item.apartmentId,
      allocationRunId: runId,
      allocationItemId: item.id,
      costCategoryId: item.costCategoryId,
      label: `${item.costType} / ${run.periodYear}-${String(run.periodMonth).padStart(2, '0')}`,
      amount: item.amount,
      sourceType: 'allocation' as const,
      status: 'active' as const,
      periodYear: run.periodYear,
      periodMonth: run.periodMonth,
    }));

    await tx.chargeLine.createMany({ data: chargeData });
    return chargeData.length;
  });
}

// ===========================================================================
// TRACEABILITY — full chain resolution
// ===========================================================================

export async function getChargeTraceability(chargeLineId: string) {
  return prisma.chargeLine.findUnique({
    where: { id: chargeLineId },
    include: {
      allocationItem: {
        include: {
          run: {
            include: {
              allocationRule: true,
              sourceCosts: {
                include: { cost: true },
                orderBy: { createdAt: 'asc' },
              },
            },
          },
        },
      },
      costCategory: true,
    },
  });
}

// ===========================================================================
// DRY-RUN: Execute allocation math without persisting (for validation)
// ===========================================================================

/**
 * computeAllocation — wraps executeAllocation for the service layer.
 * Looks up active allocation rules and costs for the period, runs allocation.
 */
export async function computeAllocation(
  tenantId: string,
  periodStart: Date,
  periodEnd: Date,
): Promise<{
  summary: { totalCost: number; totalAllocated: number; remainder: number; ruleName: string };
  items: Array<{ apartmentId: string; costType: string; method: string; amount: number; consumptionPct: number | null }>;
}> {
  // Find active allocation rule
  const rule = await prisma.allocationRule.findFirst({
    where: { tenantId, isActive: true },
    orderBy: { priority: 'asc' },
  });
  if (!rule) throw new Error(`No active allocation rule found for tenant ${tenantId}`);

  // Find costs in period
  const costs = await prisma.cost.findMany({
    where: {
      tenantId,
      periodYear: periodStart.getFullYear(),
      periodMonth: periodStart.getMonth() + 1,
      status: { not: 'cancelled' },
    },
    orderBy: { id: 'asc' },
  });
  if (costs.length === 0) throw new Error(`No costs found for period`);

  const result = await executeAllocation({
    tenantId,
    periodYear: periodStart.getFullYear(),
    periodMonth: periodStart.getMonth() + 1,
    periodStart,
    periodEnd,
    ruleId: rule.id,
    costIds: costs.map(c => c.id),
  });

  return {
    summary: {
      totalCost: result.totalSourceAmount,
      totalAllocated: result.totalAllocatedAmount,
      remainder: result.roundingRemainder,
      ruleName: rule.name,
    },
    items: result.items.map(item => ({
      apartmentId: item.apartmentId,
      costType: item.costType,
      method: item.method,
      amount: item.amount,
      consumptionPct: item.basisValue && item.basisTotal ? Math.round((item.basisValue / item.basisTotal) * 10000) / 100 : null,
    })),
  };
}

export function dryRunAllocation(
  totalAmount: number,
  bases: ApartmentBasis[],
  method: string,
): {
  items: Array<{ apartmentId: string; amount: number; basisValue: number | null; basisTotal: number | null }>;
  totalAllocated: number;
  remainder: number;
} {
  const lines = allocateAmount(totalAmount, bases, method, null, 'dry-run');
  const totalAllocated = lines.reduce((s, l) => s + l.amount, 0);
  const remainder = roundCents(totalAmount - totalAllocated);

  return {
    items: lines.map(l => ({
      apartmentId: l.apartmentId,
      amount: l.amount,
      basisValue: l.basisValue,
      basisTotal: l.basisTotal,
    })),
    totalAllocated,
    remainder,
  };
}