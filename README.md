# Kuhik — Korteriühistute Haldussüsteem

Eesti korteriühistute nutikas haldusplatvorm.

## Tech Stack

- **Frontend**: Next.js 16 (React 19, Tailwind CSS 4)
- **Backend**: Fastify 5 (TypeScript, Prisma ORM)
- **Database**: PostgreSQL
- **Queues**: BullMQ (Redis)
- **Auth**: JWT (access + refresh tokens)

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL 16+
- Redis (optional — queues work without it)

### 1. Clone and install

```bash
cd kuhik-core

# Install root dependencies
npm install

# Install backend dependencies
cd backend && npm install && cd ..

# Install frontend dependencies
cd frontend && npm install && cd ..
```

### 2. Configure environment

```bash
# Backend config
cp backend/.env.example backend/.env
# Edit backend/.env with your database URL and secrets
```

### 3. Database setup

```bash
# Apply Prisma schema
cd backend
npx prisma migrate dev --name init
npx prisma generate
cd ..
```

### 4. Run

```bash
# Start both backend and frontend (from root)
npm run dev

# Or start separately:
# Terminal 1: backend
cd backend && npm run dev

# Terminal 2: frontend
cd frontend && npm run dev
```

### 5. Open

- Frontend: http://localhost:3000
- Backend health: http://localhost:4000/api/health
- Backend login: POST /api/v1/auth/login

## Project Structure

```
kuhik-core/
├── backend/                    # Fastify API server
│   ├── prisma/                 # Database schema (Prisma)
│   ├── src/
│   │   ├── plugins/            # Fastify plugins (auth, error, queues)
│   │   ├── modules/            # Domain modules (auth first)
│   │   └── index.ts            # Server entrypoint
│   └── __tests__/              # Tests
├── frontend/                   # Next.js web app
│   └── src/app/                # App Router pages
├── config/                     # Product configuration files
├── docs/                       # Documentation
├── scripts/                    # Dev utilities
└── docker/                     # Docker setup
```

## Status

This is **Wave 0** after migration from `building-os-v6`. The repo contains a clean, standalone foundation with:
- ✅ Fastify backend with JWT auth, CORS, rate limiting, error handling
- ✅ PostgreSQL via Prisma (full KÜ data model)
- ✅ Next.js 16 frontend with landing page, login page, manager dashboard stub
- ✅ Auth routes (login + register)
- ✅ Health check endpoint
- ❌ Business modules (meters, billing, invoices, etc.) — coming in Wave 1+

## Migrating from building-os-v6

See the `/migration/` directory in the old repository for the full migration plan.

## License

Proprietary — Kuhik OÜ