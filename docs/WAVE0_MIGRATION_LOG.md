# Wave 0 Migration Log — building-os-v6 → kuhik-core

## Summary

Created `kuhik-core/` as a clean standalone product repository. This log documents every migration decision made during Wave 0.

## Migration Actions

### Backend

| Item | Source | Destination | Action | Notes |
|------|--------|-------------|--------|-------|
| Prisma schema | `kuhik/packages/database/prisma/schema.prisma` | `backend/prisma/schema.prisma` | COPIED | Canonical data model — all KÜ entities. No changes needed. |
| Fastify server entry | `kuhik/apps/api/src/index.ts` | `backend/src/index.ts` | COPIED_AND_NORMALIZED | Removed references to non-Wave-0 module imports. Added auth routes registration. Added Wave 0 status log line. |
| Config | `kuhik/apps/api/src/config.ts` | `backend/src/config.ts` | COPIED | All env variables preserved. |
| Auth plugin | `kuhik/apps/api/src/plugins/auth.ts` | `backend/src/plugins/auth.ts` | COPIED | JWT auth with decorators and hooks. Added `fastify-plugin` to package.json. |
| Error handler plugin | `kuhik/apps/api/src/plugins/error-handler.ts` | `backend/src/plugins/error-handler.ts` | COPIED | AppError class + error handler. |
| Queues plugin | `kuhik/apps/api/src/plugins/queues.ts` | `backend/src/plugins/queues.ts` | COPIED_AND_NORMALIZED | Removed `QueueScheduler` import (deprecated in BullMQ v5). |
| Auth routes | `kuhik/apps/api/src/modules/auth/auth.routes.ts` | `backend/src/modules/auth/auth.routes.ts` | COPIED | Login + register endpoints. Uses bcrypt + Prisma. |
| Backend package.json | `kuhik/apps/api/package.json` | `backend/package.json` | COPIED_AND_NORMALIZED | Added `fastify-plugin` dependency. |
| Backend tsconfig.json | `kuhik/apps/api/tsconfig.json` | `backend/tsconfig.json` | COPIED | Standard TS config for ESM. |
| Backend vitest config | New | `backend/vitest.config.ts` | CREATED | Minimal vitest config for Node. |
| Backend .env.example | New | `backend/.env.example` | CREATED | All env vars documented. |
| Smoke test | New | `backend/__tests__/smoke/health.test.ts` | CREATED | Tests config loading + health check shape. |

### Frontend

| Item | Source | Destination | Action | Notes |
|------|--------|-------------|--------|-------|
| Frontend package.json | `kuhik/apps/web/package.json` | `frontend/package.json` | REWRITTEN | Slimmed down: removed next-auth, bullmq, @react-pdf. Added Tailwind v4, lucide-react. |
| Next.js config | `kuhik/apps/web/next.config.ts` | `frontend/next.config.ts` | CREATED | Added API proxy rewrite to Fastify backend. |
| tsconfig | New | `frontend/tsconfig.json` | CREATED | Standard Next.js 16 tsconfig. |
| Root layout | `kuhik/apps/web/src/app/layout.tsx` | `frontend/src/app/layout.tsx` | COPIED_AND_NORMALIZED | Removed Geist font import (not needed). |
| Landing page | `kuhik/apps/web/src/app/page.tsx` | `frontend/src/app/page.tsx` | COPIED | Same landing page with Estonian marketing. |
| Globals CSS | `kuhik/apps/web/src/app/globals.css` | `frontend/src/app/globals.css` | REWRITTEN | Tailwind v4 format with @theme. |
| Login page | `kuhik/apps/web/src/app/login/page.tsx` | `frontend/src/app/login/page.tsx` | REWRITTEN | Uses direct API call to Fastify POST /api/v1/auth/login instead of NextAuth signIn(). Stores JWT in localStorage. |
| Haldur page | `kuhik/apps/web/src/app/haldur/page.tsx` | `frontend/src/app/haldur/page.tsx` | STUBBED | Simple placeholder page with feature cards + wave labels. Full UI incoming in Wave 1+. |
| PostCSS config | New | `frontend/postcss.config.mjs` | CREATED | Tailwind v4 postcss plugin. |

### Root / Config

| Item | Source | Destination | Action | Notes |
|------|--------|-------------|--------|-------|
| Root package.json | New | `package.json` | CREATED | Root workspace with concurrently for dev. |
| .gitignore | New | `.gitignore` | CREATED | Standard Node.js gitignore. |

### Documentation

| Item | Source | Destination | Action | Notes |
|------|--------|-------------|--------|-------|
| README | New | `README.md` | CREATED | Full setup instructions. |
| Migration log | New | `docs/WAVE0_MIGRATION_LOG.md` | CREATED | This file. |
| Wave 0 status | New | `docs/WAVE0_STATUS.md` | CREATED | Status report + next steps. |

## Items Explicitly NOT Migrated in Wave 0

| Item | Reason |
|------|--------|
| `kuhik/apps/web/src/app/portaal/` | Resident portal — requires meter/invoice backend (Wave 2+) |
| `kuhik/apps/web/src/app/register/` | Registration page — low priority, minimal backend changes needed (TODO) |
| `kuhik/apps/web/src/app/simulation/` | Dev/testing tool — not part of product |
| `kuhik/apps/web/src/app/demo/` | Demo mode — skip for Wave 0 |
| `kuhik/apps/web/src/app/api/` | Next.js API routes — replaced by Fastify backend |
| `kuhik/apps/web/src/lib/` | Business logic — belongs to Wave 1+ migrations |
| `kuhik/apps/web/src/components/` | UI components — will migrate with feature waves |
| `kuhik/apps/web/src/middleware.ts` | NextAuth middleware — auth handled by Fastify now |
| `kuhik/apps/web/src/types/` | Type definitions — will migrate with feature code |
| All `kuhik/apps/web/e2e/` | E2E tests — will be rewritten for new architecture |
| `kuhik/apps/web/supabase/` | Supabase migrations — Prisma is the ORM now |
| All `frontend/` (root) | Old Next.js 14 app — superseded |
| All `api-server/` | Express server — replaced by Fastify |
| All `src/modules/` | Business logic — Wave 1+ migration scope |
| All `src/core/`, `src/pipeline/` | Generic OS framework — DROP |
| All `kuhik-odoo/` | Abandoned Odoo integration — ARCHIVE |
| All Python files | Replaced by TypeScript |

## Dependency Decisions

1. **No NextAuth** — Login uses Fastify JWT directly. `next-auth` dependency removed.
2. **No @react-pdf** — PDF generation is a Wave 4+ feature.
3. **Tailwind v4** — Used instead of v3. The globals.css uses `@theme` directive.
4. **API proxy** — `frontend/next.config.ts` rewrites `/api/*` to `localhost:4000`.
5. **Queues are optional** — Backend boots without Redis. BullMQ queues are only registered if Redis is available.