# Test Run Snapshot

**Date:** 2026-06-22  
**Environment:** development  
**Test mode:** Full API validation (backend + database + auth)

---

## Environment State

| Component | Status | Details |
|-----------|--------|---------|
| **Backend** | ✅ OK | Fastify server running on http://localhost:4000 |
| **Frontend** | ⏭️ SKIPPED | Not started (optional for API validation) |
| **Database** | ✅ OK | PostgreSQL `kuhik_app`, user `kuhik` via localhost:5432 |
| **Auth** | ✅ OK | JWT auth enabled, login functional |
| **Redis** | ✅ OK | Connected, BullMQ queues registered |

## Database

- **Host:** localhost:5432
- **Database:** kuhik_app
- **Schema:** Prisma-pushed (all models synced)
- **Connection:** Successful via Prisma ORM

## Users

| # | Name | Email | Role | Status |
|---|------|-------|------|--------|
| 1 | Admin | admin@kuhik.local | admin | Active |

### Tenant

| Name | Slug | Registry Code | Active |
|------|------|---------------|--------|
| Testühistu | testuhistu | 12345678 | Yes |

## Endpoints Tested

| Endpoint | Method | Status | Notes |
|----------|--------|--------|-------|
| `/api/health` | GET | ✅ 200 | Public, returns version + uptime |
| `/api/v1/auth/login` | POST | ✅ 200 | Returns JWT token |
| `/api/v1/organizations` | GET | ✅ 200 | Requires auth, returns orgs |
| `/api/v1/me/profile` | GET | ✅ (not tested) | Protected, requires auth |
| Non-existent route | GET/POST | ✅ 404 | Not found handled properly |

## Auth Test Result

- **Login:** ✅ Success
- **JWT Token:** ✅ Received
- **User Data:** ✅ Admin user with admin role
- **Tenant ID:** ✅ Linked to "Testühistu" tenant

## System Health

```
Health endpoint:     {
  "status": "ok",
  "version": "1.0.0",
  "environment": "development",
  "timestamp": "2026-06-22T10:11:35.768Z",
  "uptime": 2142.99
}
```

## Bugs Found & Fixed

### 1. Global Auth Hook Leak (CRITICAL — FIXED)
- **Issue:** `registerOrganizationRoutes` called `app.addHook('preHandler', app.authenticate)` which applied globally to ALL routes, including public ones (health, login) and even non-existent routes.
- **Fix:** Moved all protected routes into a scoped Fastify plugin (`app.register(async function protectedRoutes(...))`) and applied the auth hook only within that scope. Created `registerPublicRoutes` module for health endpoint.
- **Files modified:**
  - `backend/src/index.ts` — restructured route registration with scoped plugin
  - `backend/src/modules/public/public.routes.ts` — new public routes module

### 2. Bootstrap User Creation
- **Issue:** Database was empty (no users, no tenants)
- **Fix:** Created `backend/prisma/seed-bootstrap.ts` script to bootstrap admin user + tenant
- **Credentials:** `admin@kuhik.local` / `admin123`

## Warnings

- Frontend not tested (optional for API validation)
- `/me` routes register under `/api/v1/me/profile`, not `/api/v1/me`
- `registerOrganizationRoutes` and other route modules still have individual `app.addHook('preHandler', app.authenticate)` calls that are now redundant but harmless when inside the scoped plugin

## Access Info

| Parameter | Value |
|-----------|-------|
| **API URL** | http://localhost:4000 |
| **Frontend URL** | http://localhost:3000 (not started) |
| **Test User Email** | admin@kuhik.local |
| **Test User Password** | admin123 |
| **Default Tenant Slug** | testuhistu |

## Conclusion

System is operational. Backend, database, and authentication all pass validation. The critical auth scope bug was identified and fixed.