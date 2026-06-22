# Wave 2 Migration Log — People & Access Layer

## Summary

Wave 2 adds the people and access layer: Person entity, ApartmentPerson relationships, org-scoped authorization, and frontend management UI for all of the above.

## Migration Actions

### Prisma Schema

| Item | Source | Destination | Action | Notes |
|------|--------|-------------|--------|-------|
| Person model | New | `backend/prisma/schema.prisma` | CREATED | Clean person model: fullName, email, phone, personalCode, notes. Related to Tenant + ApartmentPerson. |
| ApartmentPerson model | New | `backend/prisma/schema.prisma` | CREATED | Links Person to Apartment with relationshipType (OWNER/RESIDENT/CONTACT), isPrimary, validFrom/To. Unique constraint on (apartmentId, personId, relationshipType). |
| Tenant.people relation | Added | `backend/prisma/schema.prisma` | UPDATED | Added `people Person[]` and `apartmentPeople ApartmentPerson[]` to Tenant model. |
| Apartment.people relation | Added | `backend/prisma/schema.prisma` | UPDATED | Added `people ApartmentPerson[]` to Apartment model. |
| Resident (legacy) | Kept | `backend/prisma/schema.prisma` | KEPT | Legacy model preserved for backward compat — not used by Wave 2. |

### Backend: Authz helper

| Item | Source | Destination | Action | Notes |
|------|--------|-------------|--------|-------|
| Authz helpers | New | `backend/src/lib/authz.ts` | CREATED | `requireTenantAccess()`, `requireTenantAdmin()`, `getUserTenantIds()`, `assertTenantScope()`. Used across all Wave 1 and Wave 2 modules for org-scoped access. |

### Backend: People module

| Item | Source | Destination | Action | Notes |
|------|--------|-------------|--------|-------|
| Person service | New | `backend/src/modules/people/person.service.ts` | CREATED | CRUD for Person + CRUD for ApartmentPerson relations. Org-scoped via authz helpers. |
| Person routes | New | `backend/src/modules/people/person.routes.ts` | CREATED | 8 endpoints: GET/POST/PUT people, GET/POST/PUT/DELETE apartment-people. |
| Person schema | New | `backend/src/modules/people/person.schema.ts` | CREATED | Zod validation for person + relation create/update. |

### Backend: Route registration

| Item | Source | Destination | Action | Notes |
|------|--------|-------------|--------|-------|
| index.ts | `backend/src/index.ts` | `backend/src/index.ts` | UPDATED | Added `registerPersonRoutes` import + registration. |

### Frontend: Pages

| Item | Source | Destination | Action | Notes |
|------|--------|-------------|--------|-------|
| People list | New | `frontend/src/app/haldur/uhistud/[id]/inimesed/page.tsx` | CREATED | List people under org. Inline create form. Links to person detail. |
| Person detail | New | `frontend/src/app/haldur/uhistud/[id]/inimesed/[personId]/page.tsx` | CREATED | Shows person info + linked apartments with relationship type badges. |
| Apartment people | New | `frontend/src/app/haldur/uhistud/[id]/hooned/[buildingId]/korter/[aptId]/page.tsx` | CREATED | Shows people linked to apartment. Add/remove relations. Dropdown to select from org people. |
| Org detail cards | `frontend/src/app/haldur/uhistud/[id]/page.tsx` | UPDATED | Added "Elanikud ja kontaktid" module card with link to people list. Removed old Wave 2 stub. |

## Auto-TypeScript errors

As with Wave 0 and Wave 1, all `.ts` and `.tsx` files show "Cannot find module" and "JSX element implicitly has any type" errors in VS Code. These are expected — they resolve after `npm install` pulls in type declarations, and after `npm run dev` triggers Next.js type generation. The code is structurally correct.

## Items intentionally excluded from Wave 2

| Item | Reason |
|------|--------|
| Ownership history | Not needed for Wave 2 — deferred to Wave 4+ if needed for billing |
| User→Person linking | A Person can exist independently of a User account. Linking them (for portal login) is future scope. |
| Person edit in-place | PUT endpoints exist; frontend edit form deferred to keep wave scoped |
| Membership module | Person+Tenant relation is already handled by `TenantUser` table. Adding explicit membership CRUD would duplicate existing auth pattern. Deferred until TenantUser management is needed from UI. |
| SYSTEM_ADMIN role implementation | The authz helper defines the role hierarchy but full admin UI is deferred |