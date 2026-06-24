# ARCHITECTURE FREEZE — kuhik-core

> **Status**: Feature-complete core domain system  
> **Date**: 2026-06-22  
> **Waves**: 0–7 complete  
> **Phase**: System hardening + architecture freeze

---

## 1. FINAL DOMAIN MODEL

### 1.1 Layered Domain Map

```
┌──────────────────────────────────────────────────────────────┐
│                    WAVE 7 — Payment (status layer)            │
│  KuhikPayment — strict payment record, status aggregation    │
├──────────────────────────────────────────────────────────────┤
│                    WAVE 6 — Invoice (document layer)          │
│  KuhikInvoice — snapshot from allocation, no billing logic   │
│  KuhikInvoiceItem — line items from allocation results       │
├──────────────────────────────────────────────────────────────┤
│                    WAVE 5 — Allocation (computation layer)    │
│  AllocationRun — pure computation run                        │
│  AllocationItem — per-apartment cost allocation result       │
├──────────────────────────────────────────────────────────────┤
│                    WAVE 4 — UtilityCost (cost layer)          │
│  UtilityCost — pure cost ledger, no allocation/billing       │
├──────────────────────────────────────────────────────────────┤
│                    WAVE 3 — Meter / Reading (measurement)     │
│  ApartmentMeter — measurement device                         │
│  ApartmentMeterReading — raw reading values                  │
├──────────────────────────────────────────────────────────────┤
│                    WAVE 2 — Person / Access (access layer)    │
│  Person — natural person record                              │
│  ApartmentPerson — person↔apartment relationship             │
│  TenantUser — user↔tenant membership + role                  │
├──────────────────────────────────────────────────────────────┤
│                    WAVE 1 — Property (structure layer)        │
│  Tenant (org) — KÜ (apartment association)                   │
│  Building — physical building                                │
│  Apartment — individual unit                                 │
├──────────────────────────────────────────────────────────────┤
│                    WAVE 0 — Auth / Foundation                 │
│  User — platform user                                        │
│  Account, Session, VerificationToken — Auth.js requirements  │
│  AuditLog — audit trail                                      │
└──────────────────────────────────────────────────────────────┘
```

### 1.2 Model Responsibilities

| Model | Wave | Layer | Responsibility |
|-------|------|-------|---------------|
| `User` | 0 | Auth | Platform user identity |
| `Tenant` | 1 | Structure | Apartment association (KÜ) |
| `TenantUser` | 1 | Structure | User membership in org |
| `Building` | 1 | Structure | Physical building |
| `Apartment` | 1 | Structure | Individual apartment unit |
| `Person` | 2 | Access | Natural person (owner/resident/contact) |
| `ApartmentPerson` | 2 | Access | Person↔apartment relationship |
| `ApartmentMeter` | 3 | Measurement | Measurement device per apartment |
| `ApartmentMeterReading` | 3 | Measurement | Raw reading values |
| `UtilityCost` | 4 | Cost | Pure cost ledger entry |
| `AllocationRun` | 5 | Computation | Allocation computation run |
| `AllocationItem` | 5 | Computation | Per-apartment cost allocation |
| `KuhikInvoice` | 6 | Document | Invoice snapshot from allocation |
| `KuhikInvoiceItem` | 6 | Document | Invoice line item |
| `KuhikPayment` | 7 | Status | Payment record + status aggregation |
| `AuditLog` | 0 | Foundation | Audit trail for all changes |

### 1.3 Legacy Models (Maintained, Not Active)

These models exist for migration compatibility but are **NOT** part of the active domain. They are superseded by wave-specific models:

| Model | Superseded By | Status |
|-------|--------------|--------|
| `Resident` | `Person` + `ApartmentPerson` (Wave 2) | Legacy — keep for data migration |
| `Meter` | `ApartmentMeter` (Wave 3) | Legacy — keep for data migration |
| `MeterReading` | `ApartmentMeterReading` (Wave 3) | Legacy — keep for data migration |
| `Cost` | `UtilityCost` (Wave 4) | Legacy — keep for data migration |
| `CostAllocation` | `AllocationItem` (Wave 5) | Legacy — keep for data migration |
| `Invoice` | `KuhikInvoice` (Wave 6) | Legacy — keep for data migration |
| `InvoiceLine` | `KuhikInvoiceItem` (Wave 6) | Legacy — keep for data migration |
| `Payment` | `KuhikPayment` (Wave 7) | Legacy — keep for data migration |
| `ResourceType` | — | Legacy — pre-Wave-1 structure |

### 1.4 Infrastructure Models

| Model | Purpose |
|-------|---------|
| `Event` | Event sourcing (Wave 0 infrastructure) |
| `Issue` / `IssueHistory` | Issue tracking (Wave 1 supporting) |
| `AllocationRule` | Allocation method rules (Wave 5 support) |
| `BankTransaction` | Bank import (Wave 7 support) |
| `OwnershipHistory` | Apartment ownership timeline |
| `Notification` | Notification tracking |
| `CronJob` | Background job tracking |
| `MeritSyncRecord` | Merit Aktiva sync tracking |

---

## 2. WAVE MAPPING SUMMARY (0–7)

| Wave | Domain | Modules | API Prefix |
|------|--------|---------|-----------|
| 0 | Foundation + Auth | `auth/`, plugins, config | `/api/v1/auth/`, `/api/health` |
| 1 | Property Hierarchy | `organizations/`, `buildings/`, `apartments/` | `/api/v1/organizations/` |
| 2 | People + Access | `people/` | `/api/v1/people/`, `/api/v1/apartments/:id/people/` |
| 3 | Meters + Readings | `apartment-meters/`, `meter-readings/` | `/api/v1/apartments/:id/meters/`, `/api/v1/meters/:id/readings/` |
| 4 | Utility Cost Ledger | `utility-costs/` | `/api/v1/organizations/:id/costs/` |
| 5 | Allocation Engine | `allocation/` | `/api/v1/organizations/:id/allocation/` |
| 6 | Invoice Generation | `invoices/` | `/api/v1/invoices/`, `/api/v1/organizations/:id/invoices/` |
| 7 | Payment Tracking | `payments/` | `/api/v1/invoices/:id/payments/`, `/api/v1/organizations/:id/payments/` |

### Route Naming Convention

All resources follow this pattern:
- **List/scoped**: `/api/v1/organizations/:orgId/{resource}`  
- **Single by ID**: `/api/v1/{resource}/:id` (for primary domain resources)
- **Sub-resource**: `/api/v1/{parent}/{parentId}/{resource}`

Exceptions (org-scoped for consistency):
- GET/POST/PUT/DELETE `/api/v1/organizations/:orgId/costs[/:id]` — utility costs
- GET/POST `/api/v1/organizations/:orgId/allocation/*` — allocation engine
- GET `/api/v1/organizations/:orgId/invoices` — invoices list
- GET `/api/v1/organizations/:orgId/payments` — payments list

---

## 3. STRICT BOUNDARIES DEFINITION

### 3.1 Cross-Layer Rules

| Rule | Violation Example | Enforced? |
|------|------------------|-----------|
| Invoice must NOT contain payment/billing logic | Invoice status is read-only aggregation | ✅ |
| Allocation must NOT reference invoice concepts | No invoice fields in allocation_item | ✅ |
| UtilityCost must NOT reference apartments | Pure cost, no apartment FK | ✅ |
| Meters must NOT contain billing logic | No cost/invoice references | ✅ |
| Payment must NOT trigger notifications | No email/SMS/reminder calls | ✅ |
| Person must NOT contain financial data | No payment history, no debt fields | ✅ |

### 3.2 Module Isolation

Each module in `backend/src/modules/{domain}/` contains:
- `*.service.ts` — business logic (single responsibility)
- `*.routes.ts` — Fastify route handlers
- `*.schema.ts` — Zod validation schemas

**No cross-module imports allowed** except:
- `../../index.js` for `prisma`
- `../../lib/authz.js` for authorization helpers
- `../../plugins/error-handler.js` for `AppError`

### 3.3 Data Flow

```
UtilityCost ──► AllocationEngine ──► KuhikInvoice ──► KuhikPayment
   ↑                ↑                     │                │
   │          ApartmentMeterReading        │                │
   │                ↑                     ▼                ▼
   │           ApartmentMeter           status        amount
   │                                    (aggregated)  (recorded)
   └── Pure ledger ─┴── Computation ────┴── Document ──┴── Status
```

---

## 4. WHAT THE SYSTEM IS NOT

This system is a **feature-complete core domain system**. It explicitly does **NOT** include:

### ❌ Not an ERP
- No general ledger
- No double-entry accounting
- No accounts payable/receivable
- No financial reporting beyond invoice status

### ❌ Not a notification system
- No email delivery
- No SMS gateways
- No push notifications
- No automated reminders
- No event-driven alerts

### ❌ Not an AI/ML system
- No prediction models
- No anomaly detection automation
- No chatbot responses
- No natural language processing

### ❌ Not a payment gateway
- No payment processing
- No bank integration
- No direct debit setup
- No payment collection

### ❌ Not a document management system
- No PDF generation
- No document storage
- No file management
- No digital signatures

### ❌ Not a CRM
- No contact management beyond residents
- No marketing features
- No lead tracking
- No customer relationship workflows

### ❌ Not an automation platform
- No scheduled jobs (CronJob model is data-only)
- No workflow engine
- No business process automation
- No rules engine beyond allocation

### ❌ Not a communication platform
- No messaging
- No forum/board features
- No announcement system
- No two-way communication

---

## 5. ORG SCOPE ENFORCEMENT

### 5.1 Every Request Respects Org Scope

Every service function that accesses tenant-scoped data:
1. **Receives** `tenantId` (from URL param) and `userId` (from JWT)
2. **Verifies** `requireTenantAccess()` or `requireTenantAdmin()`
3. **Filters** queries with `where: { tenantId }`

### 5.2 ID-Based Access Pattern

When accessing a resource by direct ID:
1. Fetch the resource
2. Call `requireTenantAccess(resource.tenantId, userId)` 
3. Return data or throw 404 (never 403 — avoids existence leakage)

### 5.3 Admin Operations

Write operations (create/update/delete) require admin role:
- Roles: `system_admin`, `admin`, `board_member`
- Checked via `requireTenantAdmin(tenantId, userId)`
- Uses `role: { in: ['system_admin', 'admin', 'board_member'] }` for precise filtering

---

## 6. PERFORMANCE PROFILE

| Concern | Status | Notes |
|---------|--------|-------|
| N+1 queries | ✅ Clean | All list endpoints use `findMany` with single queries |
| Unnecessary joins | ✅ Clean | Listing endpoints use `include` only when needed |
| Heavy computation on request | ✅ Clean | Allocation is synchronous but scoped |
| Pagination | ⚠️ Limited | Basic — no cursor pagination yet |
| Index usage | ✅ Good | All FK and filter fields indexed |

---

## 7. PRISMA SCHEMA HEALTH

| Criterion | Status |
|-----------|--------|
| No hidden ERP fields | ✅ Clean |
| No unused legacy fields | ⚠️ Dual models exist (legacy + wave) — preserved for migration |
| No duplicate financial concepts | ✅ Clear separation: UtilityCost ↔ AllocationItem ↔ KuhikInvoice |
| Clean relations only | ✅ All FKs reference valid models |

---

## 8. FRONTEND ALIGNMENT

| UI Page | Backend Domain | Aligned? |
|---------|---------------|----------|
| `/haldur` | Dashboard | Wave 1 property hierarchy |
| `/haldur/uhistud` | Organizations | Wave 1 — ✅ |
| `/haldur/kulud` | Utility Costs | Wave 4 — ✅ |
| `/haldur/jaotused` | Allocation | Wave 5 — ✅ |
| `/haldur/arved` | Invoices + Payments | Waves 6–7 — ✅ |
| `/login` | Auth | Wave 0 — ✅ |
| `/` (landing) | Marketing | Pre-Wave 0 — ✅ |

**Rules**:
- UI is a consumer only, never owns business logic
- No hidden mock data or hardcoded domain values
- Pages map 1:1 to backend domains

---

## 9. ENDPOINT REFERENCE (COMPLETE)

### Wave 0 — Auth
| Method | Path | Function |
|--------|------|----------|
| POST | `/api/v1/auth/login` | Login with email/password |
| POST | `/api/v1/auth/register` | Register new user |
| GET | `/api/health` | Health check |

### Wave 1 — Property
| Method | Path | Function |
|--------|------|----------|
| GET | `/api/v1/organizations` | List user's orgs |
| GET | `/api/v1/organizations/:id` | Get org details |
| POST | `/api/v1/organizations` | Create org |
| PUT | `/api/v1/organizations/:id` | Update org |
| GET | `/api/v1/organizations/:orgId/buildings` | List buildings |
| GET | `/api/v1/buildings/:id` | Get building |
| POST | `/api/v1/organizations/:orgId/buildings` | Create building |
| PUT | `/api/v1/buildings/:id` | Update building |
| GET | `/api/v1/buildings/:buildingId/apartments` | List apartments |
| GET | `/api/v1/apartments/:id` | Get apartment |
| POST | `/api/v1/buildings/:buildingId/apartments` | Create apartment |
| PUT | `/api/v1/apartments/:id` | Update apartment |

### Wave 2 — People
| Method | Path | Function |
|--------|------|----------|
| GET | `/api/v1/organizations/:orgId/people` | List people |
| GET | `/api/v1/people/:id` | Get person |
| POST | `/api/v1/organizations/:orgId/people` | Create person |
| PUT | `/api/v1/people/:id` | Update person |
| GET | `/api/v1/apartments/:aptId/people` | List apartment people |
| POST | `/api/v1/apartments/:aptId/people` | Link person to apartment |
| PUT | `/api/v1/apartment-people/:id` | Update relation |
| DELETE | `/api/v1/apartment-people/:id` | Remove relation |

### Wave 3 — Meters + Readings
| Method | Path | Function |
|--------|------|----------|
| GET | `/api/v1/apartments/:aptId/meters` | List apartment meters |
| GET | `/api/v1/meters/:id` | Get meter |
| POST | `/api/v1/apartments/:aptId/meters` | Create meter |
| PUT | `/api/v1/meters/:id` | Update meter |
| GET | `/api/v1/meters/:meterId/readings` | List readings |
| GET | `/api/v1/apartments/:aptId/readings` | List apartment readings |
| POST | `/api/v1/meters/:meterId/readings` | Create reading |

### Wave 4 — Utility Costs
| Method | Path | Function |
|--------|------|----------|
| GET | `/api/v1/organizations/:orgId/costs` | List costs |
| GET | `/api/v1/organizations/:orgId/costs/:id` | Get cost |
| POST | `/api/v1/organizations/:orgId/costs` | Create cost |
| PUT | `/api/v1/organizations/:orgId/costs/:id` | Update cost |
| DELETE | `/api/v1/organizations/:orgId/costs/:id` | Delete cost |

### Wave 5 — Allocation
| Method | Path | Function |
|--------|------|----------|
| POST | `/api/v1/organizations/:orgId/allocation/run` | Run allocation |
| GET | `/api/v1/organizations/:orgId/allocation/runs` | List runs |
| GET | `/api/v1/organizations/:orgId/allocation/runs/:id` | Get run detail |

### Wave 6 — Invoices
| Method | Path | Function |
|--------|------|----------|
| POST | `/api/v1/invoices/generate/:allocationRunId` | Generate invoices |
| GET | `/api/v1/organizations/:orgId/invoices` | List invoices |
| GET | `/api/v1/invoices/:id` | Get invoice detail |
| GET | `/api/v1/apartments/:aptId/invoices` | Apartment invoice history |

### Wave 7 — Payments
| Method | Path | Function |
|--------|------|----------|
| POST | `/api/v1/invoices/:invoiceId/payments` | Add payment |
| GET | `/api/v1/invoices/:invoiceId/payments` | List invoice payments |
| GET | `/api/v1/organizations/:orgId/payments` | List all payments |

---

## 10. HARDENING CHANGES APPLIED

During this architecture freeze pass, the following issues were fixed:

| Issue | Severity | Fix |
|-------|----------|-----|
| Hardcoded `'demo-org'` tenantId in auth register | **CRITICAL** | Changed to require `tenantId` parameter |
| Missing admin role check in building create/update | **HIGH** | Added `role: { in: [...] }` filter |
| Missing admin role check in apartment create/update | **HIGH** | Added `role: { in: [...] }` filter |
| Inconsistent API path: `/utility-costs/:id` | **HIGH** | Changed to `/organizations/:orgId/costs/:id` |
| Inconsistent API path: `/allocation/runs/:id` | **MEDIUM** | Changed to `/organizations/:orgId/allocation/runs/:id` |
| Frontend DELETE cost path mismatch | **HIGH** | Updated to match new API path |
| Frontend viewRun path mismatch | **MEDIUM** | Updated to match new API path |

### Verified: No Cross-Domain Leakage

| Check | Result |
|-------|--------|
| Allocation reads UtilityCost + MeterReading? | ✅ Yes — this is correct (computation reads cost + measurement) |
| Allocation writes to Invoice? | ❌ No — invoice generator is separate layer |
| Invoice contains payment logic? | ❌ No — status is read-only aggregation |
| Payment writes to anything besides KuhikPayment? | ❌ No — only updates invoice status |
| Frontend contains business logic? | ❌ No — all API calls, no local computation |
| Auth routes bypass org scope? | ❌ No — fixed the demo-org bypass |

---

## 11. FUTURE CONSIDERATIONS (OUT OF SCOPE)

These are **not planned** until explicitly decided. They would require a new wave:

- Background job processing (CronJob → actual scheduler)
- Email/SMS notifications
- Bank integration/import automation
- PDF invoice generation
- Resident portal (frontend only)
- Advanced allocation rules
- Multi-currency support
- API versioning (currently v1 only)

---

*This document supersedes all previous WAVE_STATUS documents for architecture reference.*