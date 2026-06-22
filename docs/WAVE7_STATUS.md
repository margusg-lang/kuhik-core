# Wave 7 Status — Payment Tracking

## What Wave 7 delivers

A logged-in manager can:

1. View invoice detail with payments list
2. Add a payment to an invoice (amount, method, reference)
3. Invoice status auto-updates: issued → partially_paid → paid
4. View all payments across the organization

## What it explicitly does NOT include

- ❌ No notifications / email / SMS
- ❌ No reminders or overdue tracking
- ❌ No debt tracking
- ❌ No accounting ledger
- ❌ No financial reconciliation
- ❌ No event-driven architecture
- ❌ No background job systems

## Backend module: payments — 3 endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/invoices/:invoiceId/payments` | Add payment to invoice |
| GET | `/api/v1/invoices/:invoiceId/payments` | List payments for invoice |
| GET | `/api/v1/organizations/:orgId/payments` | List all payments for org |

## Prisma changes

**New model: `KuhikPayment`**
- invoiceId, amount, paidAt, method (bank_transfer/cash/other), reference
- Linked to KuhikInvoice with cascade delete

**Updated model: `KuhikInvoice`**
- Added `payments KuhikPayment[]` relation
- Status enum: `draft | issued | partially_paid | paid`

## Invoice status logic

| Condition | Status |
|-----------|--------|
| No payments | `issued` |
| Sum(payments) < totalAmount | `partially_paid` |
| Sum(payments) ≥ totalAmount | `paid` |

## Backend architecture

- `recalcInvoiceStatus()` — private helper in payments service, recalculates after every payment
- No event bus, no async processing, no notifications

## Forbidden terms check

Zero references to: notification, email, SMS, reminder, overdue, debt, ledger, accounting, event

## Prisma changes

```prisma
model KuhikPayment {
  id        String   @id @default(cuid())
  invoiceId String   @map("invoice_id")
  amount    Float    @default(0)
  paidAt    DateTime @default(now()) @map("paid_at")
  method    String   @default("bank_transfer")
  reference String?
  createdAt DateTime @default(now()) @map("created_at")

  invoice KuhikInvoice @relation(fields: [invoiceId], references: [id], onDelete: Cascade)
}
```

## All 7 waves complete

| Wave | Domain |
|------|--------|
| 0 | Foundation: Fastify, Prisma, Auth |
| 1 | Property: orgs, buildings, apartments |
| 2 | People + authz scope |
| 3 | Meters + readings |
| 4 | Utility cost ledger |
| 5 | Allocation engine |
| 6 | Invoice generation |
| 7 | Payment tracking |