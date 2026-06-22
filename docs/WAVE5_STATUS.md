# Wave 5 Status — Cost Allocation Engine

## What Wave 5 delivers

A logged-in manager can:

1. Open the allocation page (`/haldur/jaotused`)
2. Select an organization
3. Enter a period (start/end)
4. Run allocation → system distributes costs across apartments
5. View allocation details (apartment, cost type, method, amount, % of consumption)
6. View history of previous allocation runs

### Allocation rules implemented (V1)

**Rule 1: Meter-based (proportional)**
- Applies to: water, electricity, heating
- If meter readings exist for the period → cost split by consumption proportion
- Example: total water cost €100, apt A used 60% → A pays €60

**Rule 2: Flat (equal split)**
- Applies to: gas, other (and metered types if no readings exist)
- Cost divided equally across all active apartments

## What it explicitly does NOT include

- ❌ No invoice generation
- ❌ No payment tracking
- ❌ No debt tracking
- ❌ No accounting/ledger logic
- ❌ No financial reporting

## Input dependencies

- Wave 3 (meters + readings) for consumption data
- Wave 4 (utility costs) for total amounts

## Backend module: allocation — 3 endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/organizations/:orgId/allocation/run` | Run allocation for period |
| GET | `/api/v1/organizations/:orgId/allocation/runs` | List allocation runs |
| GET | `/api/v1/allocation/runs/:id` | Get run with item details |

## Prisma changes

**New models:**
- `AllocationRun` — tenantId, periodStart/End, status (draft/finalized), meta
- `AllocationItem` — runId, apartmentId, costType, method, amount, consumptionPct

## Forbidden terms check

Zero references to: invoice, payment, debt, accounting, ledger

## Recommended Wave 6 scope

1. **Invoice generation** — create invoices from allocation items
2. **Payment registration** — record payments against invoices