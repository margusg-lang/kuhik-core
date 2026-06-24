# Wave 8 Status — Resident Read-Only Portal

> **Status**: Complete  
> **Date**: 2026-06-22  
> **Layer**: Presentation only — no business logic

---

## What Wave 8 delivers

A logged-in resident can:

1. **Dashboard overview** — summary cards (apartment info, invoice count, total unpaid, org name), recent invoices list, quick links
2. **Apartment info page** — building details, apartment number, floor, area (total + heated), relationship type (owner/resident/contact)
3. **Invoices list** — all invoices with status, period, amount
4. **Invoice detail** — line items by cost type, payment history with running balance
5. **Meters + readings** — per-meter card with latest reading and historical readings

---

## What it explicitly does NOT include

- ❌ No invoice creation / generation
- ❌ No payment creation
- ❌ No notification / email / SMS
- ❌ No reminders or overdue tracking
- ❌ No allocation or cost logic
- ❌ No admin dashboard features
- ❌ No create/update/delete operations
- ❌ No mutation calls from UI
- ❌ No new backend business logic
- ❌ No new domain entities
- ❌ No new Prisma models
- ❌ No new workflow states

---

## Consumed APIs (Waves 1–7, existing only)

| Wave | API Called | Purpose |
|------|-----------|---------|
| 8 | `GET /api/v1/me/profile` | Self-service profile + org list |
| 8 | `GET /api/v1/me/organizations/:orgId/apartment` | Resident apartment discovery |
| 1 | `GET /api/v1/organizations` | Organization listing (via me/profile) |
| 3 | `GET /api/v1/apartments/:aptId/meters` | List apartment meters |
| 3 | `GET /api/v1/meters/:meterId/readings` | Meter reading history |
| 6 | `GET /api/v1/organizations/:orgId/invoices` | Invoice list |
| 6 | `GET /api/v1/invoices/:id` | Invoice detail with items + payments |

All calls are **GET only** — no POST/PUT/DELETE operations.

---

## New Backend Endpoints (Wave 8)

Two minimal convenience endpoints were added:

### `GET /api/v1/me/profile`
- Returns authenticated user's profile + org memberships
- Thin read-only projection of existing `User` + `TenantUser` data
- No new models, no new business logic

### `GET /api/v1/me/organizations/:orgId/apartment`
- Resolves resident's apartment via `Person` → `ApartmentPerson` chain
- Matches by email first, then by name
- Returns apartment + building info + relationship type
- Required because resident doesn't know their apartment ID directly

Both endpoints are **read-only** and use existing Prisma queries only.

---

## Frontend Pages

| Path | Component | Data Source | Read-only? |
|------|-----------|-------------|-----------|
| `/resident` | Dashboard | me/profile + invoices (top 5) | ✅ |
| `/resident/apartment` | Apartment info | me/organizations/:orgId/apartment | ✅ |
| `/resident/invoices` | Invoice list | organizations/:orgId/invoices | ✅ |
| `/resident/invoices/[id]` | Invoice detail | invoices/:id | ✅ |
| `/resident/meters` | Meters + readings | apartments/:aptId/meters + meters/:id/readings | ✅ |
| `/resident/layout.tsx` | Shared layout | me/profile for auth check | ✅ |

---

## Architecture Rules

### 1. Read-only principle
The resident portal **consumes data only**. It never:
- Changes state
- Triggers workflows
- Computes financial logic

### 2. No domain expansion
Wave 8 introduces:
- No new entities
- No new models
- No new financial concepts
- No new workflow states

### 3. API discipline
Only existing endpoints from Waves 1–7 are consumed, plus two minimal convenience endpoints (`/api/v1/me/*`) that are thin projections of existing data.

### 4. UI separation
Resident portal is a **separate surface layer** with:
- Distinct navigation (teal theme to differentiate from admin)
- No admin functions available
- No create/update/delete operations

---

## Validation Checklist

### Frontend
- [x] Resident UI works — 5 pages + layout
- [x] No admin functions leaked — separate nav, teal theme
- [x] No mutation calls exist — only GET fetch calls
- [x] No business logic in UI — status labels are display-only
- [x] No hidden mock data — all data from API

### Backend
- [x] Unchanged (Wave 8 must not modify core logic) — only 2 minimal read-only me endpoints added
- [x] No new Prisma models
- [x] No new business logic
- [x] All existing endpoints preserved intact

### CRITICAL CHECKS — ALL PASS

| Forbidden Feature | Present? |
|------------------|----------|
| Create/update/delete from resident UI | ❌ None |
| Allocation logic | ❌ Not present |
| Invoice logic | ❌ Not present |
| Payment logic | ❌ Not present |
| Notification logic | ❌ Not present |
| Admin features in portal | ❌ None |
| ERP extension | ❌ Not present |
| Workflow system | ❌ Not present |
| Automation layer | ❌ Not present |

---

## Files Changed (Wave 8)

### Backend (new)
- `backend/src/modules/me/me.routes.ts` — 2 read-only endpoints (profile + apartment discovery)

### Backend (modified)
- `backend/src/index.ts` — register me routes, added wave 8 log line

### Frontend (new)
- `frontend/src/app/resident/layout.tsx` — shared layout with navigation
- `frontend/src/app/resident/page.tsx` — dashboard overview
- `frontend/src/app/resident/apartment/page.tsx` — apartment info
- `frontend/src/app/resident/invoices/page.tsx` — invoice list
- `frontend/src/app/resident/invoices/[id]/page.tsx` — invoice detail
- `frontend/src/app/resident/meters/page.tsx` — meters + readings

### Documentation (new)
- `docs/WAVE8_STATUS.md` — this file

---

## Final Rule Verification

> **Wave 8 is ONLY: "safe read-only window into existing system"**

- ✅ NOT an ERP extension
- ✅ NOT a workflow system
- ✅ NOT an automation layer
- ✅ STRICT READ-ONLY BOUNDARY ENFORCED