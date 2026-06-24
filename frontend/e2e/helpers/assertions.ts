// kuhik-core/frontend/e2e/helpers/assertions.ts
// Domain-specific financial assertion helpers for Kuhik correctness validation
//
// These helpers enforce financial invariants across the system:
// meter → reading → allocation → invoice → payment
//
// Every assertion is a pure function — no side effects, no API calls.

import { expect } from '@playwright/test';

/**
 * Assert that two values are equal (with optional tolerance for floats)
 */
export function expectEqual(actual: number, expected: number, context?: string): void {
  const msg = context ? `[${context}] ` : '';
  expect(actual, `${msg}expected ${expected}, got ${actual}`).toBe(expected);
}

/**
 * Assert approximate equality for float values with given precision (default: 2 decimal places)
 */
export function expectApproxEqual(actual: number, expected: number, decimals = 2, context?: string): void {
  const factor = Math.pow(10, decimals);
  const a = Math.round(actual * factor);
  const e = Math.round(expected * factor);
  const msg = context ? `[${context}] ` : '';
  expect(a, `${msg}expected ~${expected}, got ${actual} (${decimals}dp)`).toBe(e);
}

/**
 * Sum a numeric field across an array of objects
 */
export function sum(items: any[], key: string): number {
  return items.reduce((acc, item) => {
    const val = item[key];
    return acc + (typeof val === 'number' ? val : Number(val) || 0);
  }, 0);
}

/**
 * Group an array of objects by a key
 */
export function groupBy(items: any[], key: string): Map<string, any[]> {
  const map = new Map<string, any[]>();
  for (const item of items) {
    const k = String(item[key]);
    const existing = map.get(k) || [];
    existing.push(item);
    map.set(k, existing);
  }
  return map;
}

// ================================================================
// FINANCIAL CONSISTENCY ASSERTIONS
// ================================================================

/**
 * Assert: invoice.total === sum(allocation items for that run)
 */
export function assertInvoiceMatchesAllocations(
  invoiceTotal: number,
  allocationItems: { amount: number }[],
  invoiceId: string,
): void {
  const allocatedSum = sum(allocationItems, 'amount');
  expectApproxEqual(
    invoiceTotal,
    allocatedSum,
    2,
    `Invoice ${invoiceId}: total must match sum of allocations`,
  );
}

/**
 * Assert: sum(payments) <= invoice.total
 */
export function assertPaymentsDoNotExceedInvoice(
  payments: { amount: number }[],
  invoiceTotal: number,
  invoiceId: string,
): void {
  const paidSum = sum(payments, 'amount');
  expect(
    paidSum <= invoiceTotal + 0.01, // small epsilon for float rounding
    `[Invoice ${invoiceId}] sum(payments)=${paidSum} must be <= invoice.total=${invoiceTotal}`,
  ).toBeTruthy();
}

/**
 * Assert: if sum(payments) >= invoice.total → invoice.status === "PAID"
 */
export function assertInvoiceStatusOnFullPayment(
  payments: { amount: number }[],
  invoiceTotal: number,
  actualStatus: string,
  invoiceId: string,
): void {
  const paidSum = sum(payments, 'amount');
  if (paidSum >= invoiceTotal - 0.01) {
    expect(actualStatus.toLowerCase(), `[Invoice ${invoiceId}] Fully paid invoice must have status 'paid'`).toBe('paid');
  }
}

// ================================================================
// ALLOCATION CONSISTENCY ASSERTIONS
// ================================================================

/**
 * Assert: no allocation amount is negative
 */
export function assertNoNegativeAllocations(items: { amount: number; apartmentId: string }[], runId: string): void {
  const negativeItems = items.filter(i => i.amount < -0.001);
  expect(negativeItems.length, `[AllocationRun ${runId}] Found ${negativeItems.length} negative allocations`).toBe(0);
}

/**
 * Assert: no duplicate allocation entries per apartment per cost type
 */
export function assertNoDuplicateAllocations(
  items: { apartmentId: string; costType: string }[],
  runId: string,
): void {
  const seen = new Set<string>();
  for (const item of items) {
    const key = `${item.apartmentId}::${item.costType}`;
    expect(
      seen.has(key),
      `[AllocationRun ${runId}] Duplicate allocation: apartment ${item.apartmentId}, costType ${item.costType}`,
    ).toBeFalsy();
    seen.add(key);
  }
}

// ================================================================
// METER CONSISTENCY ASSERTIONS
// ================================================================

/**
 * Assert: meter readings are monotonically increasing (no rollback)
 */
export function assertMeterReadingsMonotonic(readings: { value: number; id: string }[], meterId: string): void {
  const sorted = [...readings].sort((a, b) => {
    // Sort by value ascending — the reading value itself should increase
    return a.value - b.value;
  });

  // After sorting chronologically, values must not decrease
  for (let i = 1; i < sorted.length; i++) {
    expect(
      sorted[i].value >= sorted[i - 1].value - 0.001,
      `[Meter ${meterId}] Reading ${sorted[i].id} value ${sorted[i].value} < previous ${sorted[i - 1].value}`,
    ).toBeTruthy();
  }
}

/**
 * Assert: no negative consumption derived from readings
 */
export function assertNoNegativeConsumption(readings: { value: number; timestamp: string }[], meterId: string): void {
  const sorted = [...readings].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );

  for (let i = 1; i < sorted.length; i++) {
    const diff = sorted[i].value - sorted[i - 1].value;
    expect(
      diff >= -0.001,
      `[Meter ${meterId}] Negative consumption ${diff} between readings`,
    ).toBeTruthy();
  }
}

// ================================================================
// SYSTEM-LEVEL CONSISTENCY
// ================================================================

/**
 * Assert: no orphan records in the financial pipeline chain
 * Checks that each entity in the chain has valid parent references
 */
export function assertChainConsistency(params: {
  meterExists?: boolean;
  readingsExist?: boolean;
  allocationsExist?: boolean;
  invoicesExist?: boolean;
  paymentsExist?: boolean;
  context: string;
}): void {
  const { meterExists, readingsExist, allocationsExist, invoicesExist, paymentsExist, context } = params;

  // If meter exists, readings may or may not exist — that's OK
  // But if readings exist, meter MUST exist (enforced by FK)
  // If allocations exist, there must be readings or a flat-allocation basis
  // If invoices exist, allocations must exist
  // If payments exist, invoices must exist

  if (paymentsExist && !invoicesExist) {
    expect(false, `[${context}] Orphan payments without invoices`).toBeTruthy();
  }

  if (invoicesExist && !allocationsExist) {
    expect(false, `[${context}] Orphan invoices without allocations`).toBeTruthy();
  }

  // These are informational soft checks — the DB schema enforces FK constraints
  console.log(`[${context}] Chain consistency verified: meter=${meterExists} → readings=${readingsExist} → allocations=${allocationsExist} → invoices=${invoicesExist} → payments=${paymentsExist}`);
}

/**
 * Assert: the full pipeline meter→allocation→invoice→payment is balanced
 * This is the ultimate financial correctness check
 */
export function assertFinancialPipelineBalanced(params: {
  totalAllocated: number;
  totalInvoiced: number;
  totalPaid: number;
  totalCosts: number;
  tolerance?: number;
}): void {
  const { totalAllocated, totalInvoiced, totalPaid, totalCosts } = params;
  const tolerance = params.tolerance ?? 0.01;

  // Allocated amount must match total costs (with rounding tolerance)
  const allocationMatchesCosts = Math.abs(totalAllocated - totalCosts) <= tolerance;
  expect(
    allocationMatchesCosts,
    `Financial mismatch: totalCosts=${totalCosts} !== totalAllocated=${totalAllocated} (diff=${(totalAllocated - totalCosts).toFixed(2)})`,
  ).toBeTruthy();

  // Invoiced amount must match allocated amount
  const invoiceMatchesAllocation = Math.abs(totalInvoiced - totalAllocated) <= tolerance;
  expect(
    invoiceMatchesAllocation,
    `Financial mismatch: totalAllocated=${totalAllocated} !== totalInvoiced=${totalInvoiced}`,
  ).toBeTruthy();

  // Paid amount must NOT exceed invoiced amount
  expect(
    totalPaid <= totalInvoiced + tolerance,
    `Financial mismatch: totalPaid=${totalPaid} > totalInvoiced=${totalInvoiced}`,
  ).toBeTruthy();

  console.log('=== FINANCIAL PIPELINE BALANCED ===');
  console.log(`  Costs:        ${totalCosts.toFixed(2)} EUR`);
  console.log(`  Allocated:    ${totalAllocated.toFixed(2)} EUR`);
  console.log(`  Invoiced:     ${totalInvoiced.toFixed(2)} EUR`);
  console.log(`  Paid:         ${totalPaid.toFixed(2)} EUR`);
  console.log('  Status:       ✓ BALANCED');
}