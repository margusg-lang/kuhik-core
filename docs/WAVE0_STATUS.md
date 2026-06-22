# Wave 0 Status — kuhik-core Foundation

## What is done

### Backend (Fastify + Prisma)
- [x] Prisma schema with all KÜ data models (18+ models)
- [x] Fastify 5 server with plugins: CORS, rate-limit, JWT auth, error handler, BullMQ queues
- [x] Auth routes: POST /api/v1/auth/login, POST /api/v1/auth/register
- [x] Health check: GET /api/health
- [x] Config from environment variables with sensible defaults
- [x] Smoke test for config + health check

### Frontend (Next.js 16)
- [x] Landing page with Kuhik marketing (Estonian)
- [x] Login page (posting to Fastify backend, not NextAuth)
- [x] Manager dashboard stub (placeholder cards with wave labels)
- [x] Tailwind CSS v4 with brand color theme
- [x] PostCSS config
- [x] API proxy to backend via next.config.ts rewrites

### Infrastructure
- [x] Root package.json with `npm run dev` (concurrently runs backend + frontend)
- [x] .gitignore
- [x] Backend .env.example
- [x] README with setup instructions

### Documentation
- [x] WAVE0_MIGRATION_LOG.md — every file migration decision documented
- [x] WAVE0_STATUS.md — this file

## What is stubbed / disabled

| File | Status | Reason |
|------|--------|--------|
| `frontend/src/app/haldur/page.tsx` | STUB | Full manager UI needs Wave 1+ backend modules |
| `frontend/src/app/portaal/` | SKIPPED | Requires meter + invoice backend (Wave 2+) |
| `frontend/src/app/register/` | SKIPPED | Registration UI not critical for boot |
| Backend feature modules | DISABLED | Only auth routes are registered; meters, billing, invoices, etc. wait for Wave 1+ |
| BullMQ queues | GRACEFUL | Backend boots without Redis; queues are optional |

## What remains for Wave 1+

1. **Organizations / Buildings / Apartments CRUD** — create association, add buildings, register apartments
2. **Residents module** — resident management, ownership tracking
3. **Frontend: uhistud pages** — full KÜ management UI from `kuhik/apps/web/src/app/haldur/uhistud/`
4. **Frontend: portaal pages** — resident portal from `kuhik/apps/web/src/app/portaal/`
5. **Register page** — UI for registration
6. **Auth hardening** — refresh tokens, role-based access in frontend

## How to validate Wave 0

```bash
# 1. Install dependencies
cd kuhik-core
npm install && cd backend && npm install && cd ../frontend && npm install && cd ..

# 2. Database
cd backend
cp .env.example .env  # Edit with actual DB URL
npx prisma generate
npx prisma db push    # (or migrate dev)
cd ..

# 3. Run (two terminals or use root npm run dev)
# Terminal 1:
cd backend && npm run dev
# Should show: "🚀 Kuhik API running on http://0.0.0.0:4000"

# Terminal 2:
cd frontend && npm run dev
# Should show: Next.js on http://localhost:3000

# 4. Smoke test
curl http://localhost:4000/api/health
# Expected: {"status":"ok","version":"1.0.0",...}

# 5. Test login
curl -X POST http://localhost:4000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin@test.com","password":"test123"}'
# Expected: {"success":false,"error":"Vale kasutajanimi või parool"}
# (No users seeded yet — this validates the error path)

# 6. Open browser at http://localhost:3000
# Expected: Kuhik landing page