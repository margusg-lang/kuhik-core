# Wave 6 Status — Invoice Generation

## What Wave 6 delivers

A logged-in manager can:

1. Open the invoices page (`/haldur/arved`)
2. Select an organization
3. See a list of allocation runs → select one
4. Generate invoices from that allocation
5. View invoice list (number, apartment, period, amount, status)
6. View invoice detail (breakdown by cost type with amounts + totals)

## What it explicitly does NOT include

- ❌ No payment processing or tracking
- ❌ No debt tracking
- ❌ No accounting ledger
- ❌ No transaction system
- ❌ No bank integration
- ❌ No PDF generation (deferred)
- ❌ No tax calculations

## Backend module: invoices — 4 endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/invoices/generate/:allocationRunId` | Generate invoices from allocation |
| GET | `/api/v1/organizations/:orgId/invoices` | List invoices for org |
| GET | `/api/v1/invoices/:id` | Get invoice detail |
| GET | `/api/v1/apartments/:aptId/invoices` | Apartment invoice history |

## Prisma changes

**New models:**
- `KuhikInvoice` — tenantId, apartmentId, allocationRunId, invoiceNumber, periodStart/End, totalAmount, status (draft/issued)
- `KuhikInvoiceItem` — invoiceId, costType, amount, source

## Forbidden terms check

Zero references to: payment, debt, ledger, transaction, accounting

## Flow

1. Wave 5: Run allocation → AllocationRun + AllocationItem created
2. Wave 6: POST /invoices/generate/:allocationRunId
   → Groups items by apartment
   → Creates one KuhikInvoice per apartment with KuhikInvoiceItem breakdown
   → Returns all generated invoices

## Recommended Wave 7 scope

1. **Payment registration** — record payments against invoices
2. **Notifications** — email invoice to resident