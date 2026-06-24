// kuhik-core/backend/src/guards/period-guard.ts
// Period state machine enforcement
// Chain: PeriodStatus determines ALLOWED operations
// DRAFT  → can edit costs, allocation rules
// ACTIVE → can run allocation, generate invoices
// CLOSED → READ-ONLY (no modifications, no allocation rerun)
//
// INVARIANT: Period is a write-lock boundary.
// Once CLOSED, no financial operation can mutate period data.

export enum PeriodStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  CLOSED = 'CLOSED',
}

export type PeriodOperation =
  | 'cost_entry'
  | 'allocation_run'
  | 'invoice_generation'
  | 'payment_entry'
  | 'cost_modification'
  | 'allocation_rerun'
  | 'invoice_regen'
  | 'period_close';

// Allowed transitions matrix
const TRANSITIONS: Record<PeriodStatus, Record<string, PeriodStatus>> = {
  [PeriodStatus.DRAFT]: {
    activate: PeriodStatus.ACTIVE,
  },
  [PeriodStatus.ACTIVE]: {
    close: PeriodStatus.CLOSED,
    reopen_draft: PeriodStatus.DRAFT,
  },
  [PeriodStatus.CLOSED]: {
    reopen: PeriodStatus.ACTIVE,
  },
};

// Operation permission matrix
const OPERATION_ALLOWED: Record<PeriodStatus, PeriodOperation[]> = {
  [PeriodStatus.DRAFT]: [
    'cost_entry',
    'cost_modification',
    'allocation_run',
    'allocation_rerun',
  ],
  [PeriodStatus.ACTIVE]: [
    'cost_entry',
    'cost_modification',
    'allocation_run',
    'allocation_rerun',
    'invoice_generation',
    'payment_entry',
  ],
  [PeriodStatus.CLOSED]: [
    'payment_entry',
    'invoice_regen', // admin override only
  ],
};

export class PeriodGuardError extends Error {
  constructor(
    message: string,
    public readonly status: PeriodStatus,
    public readonly operation: PeriodOperation,
  ) {
    super(message);
    this.name = 'PeriodGuardError';
  }
}

/**
 * Check if a given operation is allowed for the given period status.
 * Throws PeriodGuardError if not allowed.
 */
export function assertOperationAllowed(
  status: PeriodStatus,
  operation: PeriodOperation,
): void {
  const allowed = OPERATION_ALLOWED[status];
  if (!allowed || !allowed.includes(operation)) {
    throw new PeriodGuardError(
      `Operation '${operation}' is not allowed when period status is '${status}'. ` +
      `Allowed operations: ${allowed?.join(', ') || 'none'}`,
      status,
      operation,
    );
  }
}

/**
 * Check if a state transition is valid.
 * Returns true if valid, throws PeriodGuardError if not.
 */
export function assertTransitionAllowed(
  currentStatus: PeriodStatus,
  targetStatus: PeriodStatus,
): void {
  // Find a transition key that leads to targetStatus
  const transitionKey = Object.entries(TRANSITIONS[currentStatus] || {})
    .find(([, target]) => target === targetStatus)?.[0];

  if (!transitionKey) {
    throw new PeriodGuardError(
      `Transition from '${currentStatus}' to '${targetStatus}' is not allowed. ` +
      `Allowed transitions from '${currentStatus}': ${
        Object.keys(TRANSITIONS[currentStatus] || {}).join(', ') || 'none'
      }`,
      currentStatus,
      'period_close',
    );
  }
}

/**
 * Get allowed operations for a given status (for UI rendering).
 */
export function getAllowedOperations(status: PeriodStatus): PeriodOperation[] {
  return OPERATION_ALLOWED[status] || [];
}

/**
 * Period guard — wraps a function execution with period status check.
 * Usage: await guardPeriod(period, 'allocation_run', async () => { ... })
 */
export async function guardPeriod<T>(
  period: { status: string },
  operation: PeriodOperation,
  fn: () => Promise<T>,
): Promise<T> {
  assertOperationAllowed(period.status as PeriodStatus, operation);
  return fn();
}

// Default export for convenient import
export default {
  PeriodStatus,
  assertOperationAllowed,
  assertTransitionAllowed,
  getAllowedOperations,
  guardPeriod,
  PeriodGuardError,
};