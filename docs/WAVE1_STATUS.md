# Wave 1 Status — Property Hierarchy Foundation

## What Wave 1 delivers

A logged-in manager can:
1. Open the manager area → see a dashboard with "Korteriühistud" link
2. View a list of organizations (KÜ) they belong to
3. Create a new organization
4. Open an organization → see its buildings + module cards for future features
5. Create a new building under an organization
6. Open a building → see its apartments in a table
7. Create apartments (inline form on building page) with unit label, floor, area

## Backend modules and routes

### Organizations (`/api/v1/organizations`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/organizations` | JWT | List user's organizations (via TenantUser membership) |
| GET | `/api/v1/organizations/:id` | JWT | Get single organization details |
| POST | `/api/v1/organizations` | JWT | Create new organization (auto-slug, creates admin membership) |
| PUT | `/api/v1/organizations/:id` | JWT | Update organization (admin only) |

### Buildings (`/api/v1/buildings` / `/api/v1/organizations/:orgId/buildings`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/organizations/:orgId/buildings` | JWT | List buildings under organization |
| GET | `/api/v1/buildings/:id` | JWT | Get single building |
| POST | `/api/v1/organizations/:orgId/buildings` | JWT | Create building under organization |
| PUT | `/api/v1/buildings/:id` | JWT | Update building |

### Apartments (`/api/v1/apartments` / `/api/v1/buildings/:buildingId/apartments`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/buildings/:buildingId/apartments` | JWT | List apartments under building |
| GET | `/api/v1/apartments/:id` | JWT | Get single apartment |
| POST | `/api/v1/buildings/:buildingId/apartments` | JWT | Create apartment under building |
| PUT | `/api/v1/apartments/:id` | JWT | Update apartment |

### Total: 12 new authenticated endpoints

## Frontend pages

| Route | Page | Type |
|-------|------|------|
| `/haldur` | Manager dashboard with link to uhistud | Updated Wave 0 |
| `/haldur/uhistud` | Organization list with create button | Rewritten from old Supabase version |
| `/haldur/uhistud/uus` | Create organization form | Rewritten from old Supabase version |
| `/haldur/uhistud/[id]` | Organization detail with buildings list + future-wave cards | Rewritten |
| `/haldur/uhistud/[id]/hooned/[buildingId]` | Building detail with apartments table + inline apartment creation | New |
| `/haldur/uhistud/[id]/hooned/new` | Create building form | New |

## Schema changes

**None.** The Prisma schema (Tenant, Building, Apartment, TenantUser models) already had all the needed fields and relations. No migration changes required.

## What was intentionally excluded

| Feature | Reason |
|---------|--------|
| Delete/archive endpoints | Deferred — needs product-level policy on deletion cascades |
| Edit pages for org/building | Can be added as a follow-up; the PUT endpoints exist |
| Owner/resident assignment | Wave 2 |
| Portal (owner-facing) UI | Wave 2+ |
| Dashboard home stats | Wave 7+ |

## API auth model

All routes protected by JWT via `app.authenticate` preHandler hook. Organization scoping is enforced by checking `TenantUser` membership before returning data. Admin role required for mutations (PUT on org).

## Files created in Wave 1

```
kuhik-core/
├── backend/src/modules/organizations/
│   ├── organization.schema.ts     (NEW — 28 lines)
│   ├── organization.service.ts    (NEW — 86 lines)
│   └── organization.routes.ts     (NEW — 46 lines)
├── backend/src/modules/buildings/
│   ├── building.schema.ts         (NEW — 17 lines)
│   ├── building.service.ts        (NEW — 73 lines)
│   └── building.routes.ts         (NEW — 47 lines)
├── backend/src/modules/apartments/
│   ├── apartment.schema.ts        (NEW — 22 lines)
│   ├── apartment.service.ts       (NEW — 88 lines)
│   └── apartment.routes.ts        (NEW — 47 lines)
├── backend/src/index.ts           (UPDATED — +5 lines for route registration)
├── frontend/src/app/haldur/
│   ├── page.tsx                   (UPDATED — Wave 1 navigation)
│   └── uhistud/
│       ├── page.tsx               (REWRITTEN — 94 lines)
│       ├── uus/page.tsx           (REWRITTEN — 79 lines)
│       └── [id]/
│           ├── page.tsx           (REWRITTEN — 107 lines)
│           └── hooned/
│               ├── [buildingId]/page.tsx  (NEW — 143 lines)
│               └── new/page.tsx           (NEW — 67 lines)
├── docs/WAVE1_MIGRATION_LOG.md    (NEW)
└── docs/WAVE1_STATUS.md           (NEW — this file)
```

## Backend architecture notes

- **No Repository pattern** — Prisma queries are used directly in services. Simple and pragmatic.
- **Zod validation** — all request bodies validated with Zod schemas before hitting services.
- **AppError** — domain errors thrown as `AppError(statusCode, code, message)` for consistent API error responses.
- **Membership scoping** — every query checks `TenantUser` membership for tenant isolation.
- **Slug generation** — auto-generated from organization name with uniqueness check.

## Recommended Wave 2 scope

1. Residents / owners module — register owners to apartments, track primary contact
2. Frontend: elanikud page — list residents per apartment, add residents
3. Frontend: portaal (resident portal) — login, view own apartment details
4. Auth improvements — refresh token flow, role-based UI guards
5. Edit forms — add muuda (edit) pages for org, building, apartment