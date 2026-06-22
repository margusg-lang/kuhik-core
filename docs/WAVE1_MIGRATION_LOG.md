# Wave 1 Migration Log — Property Hierarchy Foundation

## Summary

Wave 1 delivers the property hierarchy foundation: organizations (KÜ), buildings, and apartments. This is the domain backbone for all future waves.

## Migration Actions

### Backend: Organizations module

| Item | Source | Destination | Action | Notes |
|------|--------|-------------|--------|-------|
| Organization service | New | `backend/src/modules/organizations/organization.service.ts` | CREATED | list/get/create/update. Uses Prisma Tenant model. Scopes queries by TenantUser membership. |
| Organization routes | New | `backend/src/modules/organizations/organization.routes.ts` | CREATED | 4 endpoints: GET list, GET by id, POST create, PUT update. All authenticated via preHandler hook. |
| Organization schema | New | `backend/src/modules/organizations/organization.schema.ts` | CREATED | Zod validation: name (required), registryCode, address, contactEmail, contactPhone. |
| Organization slug generation | New | `backend/src/modules/organizations/organization.service.ts` | CREATED | Auto-generates URL-safe slug from organization name. Checks for uniqueness. |

### Backend: Buildings module

| Item | Source | Destination | Action | Notes |
|------|--------|-------------|--------|-------|
| Building service | New | `backend/src/modules/buildings/building.service.ts` | CREATED | list/get/create/update. Nested under organization. Scoped by TenantUser membership. |
| Building routes | New | `backend/src/modules/buildings/building.routes.ts` | CREATED | 4 endpoints: GET list by org, GET by id, POST create under org, PUT update. |
| Building schema | New | `backend/src/modules/buildings/building.schema.ts` | CREATED | Zod validation: name (required), address, type. |

### Backend: Apartments module

| Item | Source | Destination | Action | Notes |
|------|--------|-------------|--------|-------|
| Apartment service | New | `backend/src/modules/apartments/apartment.service.ts` | CREATED | list/get/create/update. Nested under building. Scoped by building→tenant→membership chain. |
| Apartment routes | New | `backend/src/modules/apartments/apartment.routes.ts` | CREATED | 4 endpoints: GET list by building, GET by id, POST create under building, PUT update. |
| Apartment schema | New | `backend/src/modules/apartments/apartment.schema.ts` | CREATED | Zod validation: unitLabel (required), floor, areaSqm, heatedAreaSqm, occupancy. |

### Backend: Route registration

| Item | Source | Destination | Action | Notes |
|------|--------|-------------|--------|-------|
| Route registration | `backend/src/index.ts` | `backend/src/index.ts` | UPDATED | Added `registerOrganizationRoutes`, `registerBuildingRoutes`, `registerApartmentRoutes`. Clarified log message. |

### Frontend: Manager UI

| Item | Source | Destination | Action | Notes |
|------|--------|-------------|--------|-------|
| Uhistud list page | Old: `kuhik/apps/web/src/app/haldur/uhistud/page.tsx` | `frontend/src/app/haldur/uhistud/page.tsx` | REWRITTEN | Uses new Fastify API instead of Supabase. Removed demo-mode logic. |
| Uhistud create page | Old: `kuhik/apps/web/src/app/haldur/uhistud/uus/page.tsx` | `frontend/src/app/haldur/uhistud/uus/page.tsx` | REWRITTEN | Uses new Fastify API. Cleaned form inputs (no custom UI components). |
| Uhistud detail page | Old: `kuhik/apps/web/src/app/haldur/uhistud/[id]/page.tsx` | `frontend/src/app/haldur/uhistud/[id]/page.tsx` | REWRITTEN | Shows org detail + buildings list. Wave labels for future features. Removed Supabase dependency. |
| Building detail page | New | `frontend/src/app/haldur/uhistud/[id]/hooned/[buildingId]/page.tsx` | CREATED | Building detail with apartments table. Inline apartment creation form. |
| New building page | New | `frontend/src/app/haldur/uhistud/[id]/hooned/new/page.tsx` | CREATED | Simple building creation form. |
| Haldur dashboard | `frontend/src/app/haldur/page.tsx` | `frontend/src/app/haldur/page.tsx` | UPDATED | Added link to uhistud list. Clarified wave labels. |

### Schema changes

| Item | Source | Destination | Action | Notes |
|------|--------|-------------|--------|-------|
| Prisma schema | `backend/prisma/schema.prisma` | `backend/prisma/schema.prisma` | KEPT | No changes needed — Tenant, Building, Apartment models already exist with correct relations. |

## Items intentionally excluded from Wave 1

| Item | Reason |
|------|--------|
| Residents / owners | Belongs to Wave 2 |
| Ownership history | Belongs to Wave 2 |
| Meters / readings | Belongs to Wave 2+ |
| Delete endpoints | Deliberately omitted — archive/deletion semantics need product clarification |
| UI edit pages for org/building/apartment | Edit forms are deferred — inline editing will be added in a follow-up or Wave 2 |
| Portal (resident) pages | Belongs to Wave 2+ |