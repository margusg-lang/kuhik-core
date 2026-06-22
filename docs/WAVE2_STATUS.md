# Wave 2 Status — People & Access Layer

## What Wave 2 delivers

A logged-in manager/admin can:

1. Open an organization → see "Elanikud ja kontaktid" module card (active, not stubbed)
2. Open the people list → see all people linked to that organization
3. Create a new person (inline form on people list page) with name, email, phone
4. View person detail → see person info + all linked apartments with relationship type badges (Omanik/Elanik/Kontakt)
5. Open a building → see apartments with a "Seosed" link to manage people
6. Open an apartment's people view → see linked people, add new relations, remove relations
7. Data is org-scoped — a user from org A cannot see org B's data

## Backend modules and routes added

### Authz helpers (`backend/src/lib/authz.ts`)
4 helper functions for org-scoped access enforcement used by all Wave 1 and Wave 2 modules.

### People module (`backend/src/modules/people/`)
8 new authenticated endpoints:

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/organizations/:orgId/people` | List people in org |
| GET | `/api/v1/people/:id` | Get person + apartment relations |
| POST | `/api/v1/organizations/:orgId/people` | Create person in org |
| PUT | `/api/v1/people/:id` | Update person |
| GET | `/api/v1/apartments/:aptId/people` | List people linked to apartment |
| POST | `/api/v1/apartments/:aptId/people` | Link person to apartment |
| PUT | `/api/v1/apartment-people/:id` | Update relation |
| DELETE | `/api/v1/apartment-people/:id` | Remove relation |

### Total Wave 2 endpoints: 8
### Cumulative API endpoints: 20 (Wave 0: 2 + Wave 1: 10 + Wave 2: 8)

## Frontend pages added

| Route | Description |
|-------|-------------|
| `/haldur/uhistud/[id]/inimesed` | People list with inline create form |
| `/haldur/uhistud/[id]/inimesed/[personId]` | Person detail with apartment relations |
| `/haldur/uhistud/[id]/hooned/[buildingId]/korter/[aptId]` | Apartment people management (add/remove relations) |

## Prisma schema changes

**New models added:**
- `Person` — canonical person/contact record (fullName, email, phone, personalCode, notes)
- `ApartmentPerson` — links Person ↔ Apartment (relationshipType: OWNER/RESIDENT/CONTACT, isPrimary, validFrom/To)

**Updated models:**
- `Tenant` — added `people Person[]` and `apartmentPeople ApartmentPerson[]`
- `Apartment` — added `people ApartmentPerson[]`

**Legacy models preserved unchanged:**
- `Resident` — kept for backward compatibility, not used by Wave 2

## How auth/org scoping now works

All Wave 1 and Wave 2 backend modules use the new `authz.ts` helpers:

- `requireTenantAccess(tenantId, userId)` — checks TenantUser membership, throws 404 if not found
- `requireTenantAdmin(tenantId, userId)` — same, but also requires admin/board_member role
- `assertTenantScope(resourceTenantId, userId)` — checks if the user has access to a resource's tenant

This ensures:
- No leaking of data across organizations
- Mutations require admin-level role
- System doesn't reveal whether an org exists if user has no access (404 instead of 403)

## Files created in Wave 2

```
backend/src/lib/authz.ts                       (NEW — 53 lines)
backend/src/modules/people/person.schema.ts     (NEW — 40 lines)
backend/src/modules/people/person.service.ts    (NEW — 140 lines)
backend/src/modules/people/person.routes.ts     (NEW — 93 lines)
frontend/src/app/haldur/uhistud/[id]/inimesed/page.tsx           (NEW — 128 lines)
frontend/src/app/haldur/uhistud/[id]/inimesed/[personId]/page.tsx (NEW — 95 lines)
frontend/src/app/haldur/uhistud/[id]/hooned/[buildingId]/korter/[aptId]/page.tsx (NEW — 160 lines)
docs/WAVE2_MIGRATION_LOG.md                     (NEW)
docs/WAVE2_STATUS.md                            (NEW — this file)
```

**Files updated in Wave 2:**
- `backend/prisma/schema.prisma` — added Person + ApartmentPerson models
- `backend/src/index.ts` — registered person routes + Wave 2 log line
- `frontend/src/app/haldur/uhistud/[id]/page.tsx` — added people module card

## What was deferred to later waves

| Feature | Planned wave |
|---------|-------------|
| User→Person linking (portal login) | Wave 3+ |
| Frontend edit forms for person | Wave 3 |
| Membership CRUD from UI | Wave 3 |
| SYSTEM_ADMIN UI | Wave 3+ |
| Ownership history | Wave 4+ (billing) |
| Person contact preferences | Wave 5+ (notifications) |

## Recommended Wave 3 scope

1. **Meters and meter readings** — the next critical product domain
2. **Frontend: resident portal (portaal)** — owner login → view apartment, submit readings
3. **Frontend: register page** — self-registration for residents