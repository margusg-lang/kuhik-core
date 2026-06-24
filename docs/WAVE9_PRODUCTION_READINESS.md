# Wave 9 — Production Readiness + Deployment Hardening

> **Status**: Complete  
> **Date**: 2026-06-22  
> **Layer**: Infrastructure — no domain changes

---

## What Wave 9 delivers

1. **Environment Hardening** — centralized env validation with fail-fast startup
2. **Deployment Readiness** — production build scripts, env configs, start procedures
3. **Logging + Observability** — structured request logging with request IDs + error IDs
4. **Security Hardening** — centralized auth guard, strict org scope, production-safe error handler
5. **API Stability** — consistent response/error formats, no stack traces in production
6. **Frontend Build Hardening** — environment-specific config files

---

## What it explicitly does NOT include

- ❌ No new business features
- ❌ No new domain concepts
- ❌ No new workflows
- ❌ No new UI features
- ❌ No analytics dashboards
- ❌ No monitoring platforms
- ❌ No metrics systems (Prometheus, etc.)
- ❌ No tracing systems
- ❌ No event pipelines
- ❌ No microservices
- ❌ No queue/event bus changes
- ❌ No notification logic changes
- ❌ No billing/financial logic changes

---

## 1. Environment Hardening

### Validation Module: `backend/src/lib/env.ts`

All environment variables are validated at startup before any other module loads. The system **fails fast** with a clear error message and exit code 1 if:

- `DATABASE_URL` is missing
- `JWT_SECRET` is missing
- `JWT_REFRESH_SECRET` is missing
- `NODE_ENV` is not one of: `development`, `staging`, `production`
- In production: JWT secrets are shorter than 20 characters or use default values

### Environment Separation

| Environment | File | NODE_ENV | Purpose |
|-------------|------|----------|---------|
| Development | `backend/.env` (user creates) | `development` | Local dev, pino-pretty logs |
| Staging | `backend/.env` (user creates) | `staging` | Pre-production verification |
| Production | `backend/.env` (user creates) | `production` | Live system, JSON logs, no stack traces |

### Env File Templates

- `backend/.env.example` — development defaults
- `backend/.env.production.example` — production with annotations
- `backend/.env.staging.example` — staging config

---

## 2. Deployment Readiness

### Backend Build & Run

```bash
# Development
cd backend
npm run dev              # tsx watch

# Production build
cd backend
npm run build            # tsc → dist/
NODE_ENV=production npm run start  # node dist/index.js

# Or directly with tsx (for containerized)
NODE_ENV=production tsx src/index.ts
```

### Frontend Build & Run

```bash
# Development
cd frontend
npm run dev              # next dev

# Production build
cd frontend
npm run build            # next build
npm run start            # next start
```

### Root Package

```bash
npm run build            # builds backend + frontend
npm run build:backend    # backend only
npm run build:frontend   # frontend only
```

### Health Check

```
GET /api/health
→ {"status":"ok","version":"1.0.0","environment":"production","timestamp":"...","uptime":1234}
```

---

## 3. Logging + Observability

### Structured Request Logging: `backend/src/plugins/request-logger.ts`

Every request receives a unique `requestId` (8-char hex) that flows through all logs:

**On request:**
```
[z7xk3lm2] GET /api/v1/organizations → 200 (12ms)
```

**Structured payload:**
```json
{
  "requestId": "z7xk3lm2",
  "userId": "user_abc123",
  "method": "GET",
  "url": "/api/v1/organizations",
  "statusCode": 200,
  "durationMs": 12
}
```

**On error:**
```json
{
  "requestId": "z7xk3lm2",
  "userId": "user_abc123",
  "error": "Not found",
  "stack": "..."  // only in dev/staging
}
```

### Environment-specific Logger

- **Development**: `pino-pretty` with colorized output
- **Production**: Standard JSON logging (no `pino-pretty`)

---

## 4. Security Hardening

### Error Handler: `backend/src/plugins/error-handler.ts`

The centralized error handler now:
- Returns `errorId` (requestId) in every error response
- Returns `success: false` in all error responses (previously missing in some)
- **NEVER leaks stack traces in production** — only shows error message
- Handles JWT-specific errors with 401 status
- Handles Fastify validation errors consistently

### Auth Middleware

Every route handler uses one of:
- `app.authenticate` — verifies JWT, populates `request.userId`
- `requireTenantAccess()` — verifies user has access to the requested org
- `requireTenantAdmin()` — verifies user has admin role in the org

All access violations return 404 (not 403) to avoid leaking resource existence (per Wave 2 rule).

### Consistent Error Format

All errors now follow:
```json
{
  "success": false,
  "error": "Estonian error message",
  "code": "ERROR_CODE",
  "errorId": "z7xk3lm2"
}
```

---

## 5. API Stability

### Response Format Consistency

All endpoints now return:
- `success: boolean` — always present
- `data: T` — for successful responses
- `error: string` — for error responses (Estonian)
- `code: string` — machine-readable error code
- `errorId: string` — traceable request ID (added in Wave 9)

Previous inconsistency: Some error responses were missing `success: false`. Now enforced globally.

### No Stack Traces in Production

The `config.isProduction` flag controls stack trace leakage:
- **Development/Staging**: Stack traces included for debugging
- **Production**: Only error message, code, and errorId returned

---

## 6. Frontend Build Hardening

### Environment Config Files

| File | Used When | NEXT_PUBLIC_API_URL |
|------|-----------|-------------------|
| `frontend/.env.development` | `next dev` | `http://localhost:4000` |
| `frontend/.env.staging` | Next.js build with `STAGING` | `https://api.staging.example.com` |
| `frontend/.env.production` | `next build` | `https://api.example.com` |
| `frontend/.env.production.example` | Template for deployment | Placeholder |

### Build Independence

Frontend builds independently of backend:
```bash
cd frontend
npm run build   # No backend required
```

API requests are proxied through Next.js rewrites during development and connect directly in production.

---

## Deployment Model

```
┌─────────────────┐     ┌──────────────────┐
│   Frontend      │     │   Backend API    │
│   Next.js 16    │────▶│   Fastify 5      │
│   static build  │     │   Prisma + PG    │
│                 │     │                  │
│ /resident       │     │ /api/v1/auth/*   │
│ /haldur         │     │ /api/v1/orgs/*   │
│ /login          │     │ /api/v1/...      │
│ /               │     │ /api/health      │
└─────────────────┘     └────────┬─────────┘
                                 │
                        ┌────────▼─────────┐
                        │   PostgreSQL DB   │
                        │   (per-tenant)    │
                        └──────────────────┘
```

### Requirements

- Node.js 20+ (runtime)
- PostgreSQL 15+ (database)
- Redis (optional — for BullMQ queues)

### Startup Sequence

1. Database must be accessible (Prisma auto-connects)
2. Redis is optional — queues gracefully disabled if unavailable
3. Backend starts and listens on configured port
4. Frontend connects to backend via `NEXT_PUBLIC_API_URL`

---

## Files Changed (Wave 9)

### Backend (new)
| File | Purpose |
|------|---------|
| `backend/src/lib/env.ts` | Centralized environment validation with fail-fast |
| `backend/src/plugins/request-logger.ts` | Structured request logging with request IDs |
| `backend/.env.production.example` | Production env template |
| `backend/.env.staging.example` | Staging env template |

### Backend (modified)
| File | Changes |
|------|---------|
| `backend/src/config.ts` | Refactored to use `env.ts` as source of truth |
| `backend/src/plugins/error-handler.ts` | Added errorId, production-safe (no stack traces), consistent format |
| `backend/src/index.ts` | Added request logger plugin, env validation import, production logger config, health check includes environment |

### Frontend (new)
| File | Purpose |
|------|---------|
| `frontend/.env.development` | Dev API URL |
| `frontend/.env.staging` | Staging API URL |
| `frontend/.env.production` | Production API URL |
| `frontend/.env.production.example` | Template for deployment |

### Documentation (new)
| File | Purpose |
|------|---------|
| `docs/WAVE9_PRODUCTION_READINESS.md` | This file |

---

## Validation Checklist

### Backend
- [x] Production build works — `npm run build` → `dist/`
- [x] Env validation works — missing `DATABASE_URL` exits with error
- [x] No debug leaks — `config.isProduction` controls stack traces
- [x] Structured logging active — every request gets `requestId`
- [x] Error responses consistent — all include `success`, `code`, `errorId`

### Frontend
- [x] Production build succeeds — `npm run build`
- [x] API URL config correct — via `.env.production`
- [x] Environment separated — dev/staging/production files

### Security
- [x] Auth enforced globally — all routes behind `app.authenticate`
- [x] Org scope intact — `requireTenantAccess()`/`requireTenantAdmin()` on all services
- [x] No hardcoded secrets — all env vars validated at startup
- [x] No stack traces in production — error handler suppresses them

### CRITICAL CHECKS — ALL PASS

| Forbidden | Present? |
|-----------|----------|
| New business logic | ❌ None |
| New domain concepts | ❌ None |
| New workflows | ❌ None |
| New UI features | ❌ None |
| Analytics dashboards | ❌ None |
| Monitoring platforms | ❌ None |
| Event pipelines | ❌ None |

---

## Final Rule Verification

> **Wave 9 is ONLY: "make existing system safe, stable, and deployable"**

- ✅ NOT feature expansion
- ✅ NOT ERP evolution
- ✅ NOT system redesign
- ✅ STRICT PRODUCTION HARDENING BOUNDARY ENFORCED