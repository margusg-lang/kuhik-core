# Wave 4 Status — Utility Cost Ledger

## What Wave 4 delivers

A logged-in manager can:

1. Open the costs page (`/haldur/kulud`)
2. Select an organization
3. View all utility costs for that org (type, period, amount, supplier)
4. Add a new cost entry (type: electricity/water/heating/gas/other, period start/end, amount EUR)
5. Delete a cost entry
6. All data org-scoped (same authz layer)

## What it explicitly does NOT include

- ❌ No allocation or split logic
- ❌ No per-apartment calculations
- ❌ No invoice generation
- ❌ No payment tracking
- ❌ No debt tracking
- ❌ No meter integration logic
- ❌ No double-entry accounting
- ❌ No billing or pricing

## Backend module: utility-costs — 5 endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/organizations/:orgId/costs` | List costs for org |
| GET | `/api/v1/utility-costs/:id` | Get single cost |
| POST | `/api/v1/organizations/:orgId/costs` | Create cost |
| PUT | `/api/v1/utility-costs/:id` | Update cost |
| DELETE | `/api/v1/utility-costs/:id` | Delete cost |

## Prisma changes

**New model: `UtilityCost`**
- tenantId, type, periodStart, periodEnd, totalAmount, currency, supplierName, description, source
- Index on (tenantId, periodStart)
- No relation to meters, apartments, or allocation logic

## Frontend page

- `/haldur/kulud` — costs list table with org selector, create form, delete

## Total repo: ~66 files, 32 API endpoints

## Forbidden terms check
Zero references to: allocation, invoice, payment, debt, split

## Recommended Wave 5 scope
1. **Cost allocation engine** — distribute utility costs per apartment by rules
2. **Invoice generation** — create invoices based on allocated amounts