# kuhik-core Deployment Guide

> **Version**: 1.0.0  
> **Stack**: Fastify 5 + Next.js 16 + PostgreSQL 16 + Caddy 2  
> **Deployment**: Docker Compose on single VPS

---

## Architecture

```
┌─────────────┐     ┌──────────────────┐
│   Internet   │────▶│   Caddy :80/443  │
└─────────────┘     └────────┬─────────┘
                             │
                    ┌────────▼─────────┐
                    │   Reverse Proxy   │
                    │                   │
                    │  /api/* → backend │
                    │  /*     → frontend│
                    └────────┬─────────┘
                             │
              ┌──────────────┼──────────────┐
              ▼                             ▼
    ┌─────────────────┐         ┌──────────────────┐
    │   Backend :4000  │         │  Frontend :3000   │
    │   Fastify + JWT  │         │  Next.js (static) │
    │   Prisma ORM     │         │                   │
    └────────┬─────────┘         └──────────────────┘
             │
             ▼
    ┌─────────────────┐
    │  PostgreSQL :5432│
    │  (persistent)    │
    └─────────────────┘
```

---

## 1. Quick Start (Production)

### Prerequisites

- Docker & Docker Compose installed on the VPS
- Domain pointing to the VPS IP (for SSL)
- Git access to the repository

### Step 1: Clone the repository

```bash
sudo mkdir -p /opt/kuhik-core
sudo git clone https://github.com/your-org/kuhik-core.git /opt/kuhik-core
cd /opt/kuhik-core
```

### Step 2: Configure environment

```bash
cp .env.example .env
nano .env
```

Required variables:

| Variable | Description | Example |
|----------|-------------|---------|
| `POSTGRES_PASSWORD` | Database password | `my-strong-password` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://kuhik:password@postgres:5432/kuhik` |
| `JWT_SECRET` | JWT signing key (min 20 chars) | `openssl rand -hex 32` output |
| `JWT_REFRESH_SECRET` | JWT refresh key (min 20 chars) | `openssl rand -hex 32` output |
| `CORS_ORIGINS` | Frontend domain | `https://app.example.com` |
| `NEXT_PUBLIC_API_URL` | Public API URL | `https://app.example.com` |

### Step 3: Start the stack

```bash
docker compose up --build -d
```

### Step 4: Verify

```bash
# Health check
curl http://localhost:4000/api/health

# Frontend via proxy
curl http://localhost/

# API via proxy
curl http://localhost/api/health
```

---

## 2. Docker Compose Services

### Service Overview

| Service | Container Name | Image | Port | Purpose |
|---------|---------------|-------|------|---------|
| `postgres` | `kuhik-postgres` | postgres:16-alpine | 5432 | Database |
| `backend` | `kuhik-backend` | Custom build | 4000 | Fastify API |
| `frontend` | `kuhik-frontend` | Custom build | 3000 | Next.js UI |
| `caddy` | `kuhic-caddy` | caddy:2-alpine | 80/443 | Reverse proxy |

### Startup Sequence (Deterministic)

```
1. postgres ──healthy──→ 2. backend ──healthy──→ 3. frontend ──healthy──→ 4. caddy
```

Each service waits for its dependencies via Docker Compose `depends_on.condition: service_healthy`.

### Volumes

| Volume | Purpose |
|--------|---------|
| `postgres_data` | Persistent database storage |
| `uploads_data` | File uploads storage |
| `caddy_data` | SSL certificates + Caddy state |
| `caddy_config` | Caddy configuration |

---

## 3. Backend Dockerfile

### Multi-stage Build

```
Builder Stage:
  npm ci → prisma generate → tsc build → dist/

Production Stage:
  npm ci --omit=dev → prisma generate → copy dist/ → docker-entrypoint.sh
```

### Entrypoint (`docker-entrypoint.sh`)

1. Wait for PostgreSQL to be ready (connection test)
2. Run `prisma generate` + `prisma db push` for schema sync
3. Start the application

---

## 4. Frontend Dockerfile

### Multi-stage Build

```
Builder Stage:
  npm ci → next build (with NEXT_PUBLIC_API_URL arg)

Production Stage:
  Copy standalone output → copy static assets → copy public/
```

The frontend uses Next.js `output: "standalone"` mode for minimal image size. The `NEXT_PUBLIC_API_URL` build argument sets the API endpoint.

---

## 5. Environment System

### File Hierarchy

| File | Used By | Purpose |
|------|---------|---------|
| `.env` (root) | docker-compose.yml | All secrets and configuration |
| `backend/.env.production.example` | Backend template | Documentation only |
| `frontend/.env.production` | Next.js build | `NEXT_PUBLIC_API_URL` |

### Validation at Startup

The backend validates all required environment variables at startup and **fails fast** if:

- `DATABASE_URL` is missing
- `JWT_SECRET` is missing or too short (< 20 chars in production)
- `JWT_REFRESH_SECRET` is missing or too short
- `NODE_ENV` is not one of: development, staging, production
- Default secrets are used in production mode

---

## 6. Reverse Proxy (Caddy)

### Features

- Automatic SSL via Let's Encrypt (when domain is configured)
- Security headers: X-Content-Type-Options, X-Frame-Options, X-XSS-Protection
- Clean URL routing: `/api/*` → backend, everything else → frontend

### SSL Setup

Uncomment the domain block in `Caddyfile` and replace `app.example.com` with your actual domain:

```
app.example.com {
    reverse_proxy /api/* backend:4000
    reverse_proxy frontend:3000
}
```

Caddy will automatically obtain and renew SSL certificates.

---

## 7. CI/CD Pipeline

### GitHub Actions Workflow (`.github/workflows/deploy.yml`)

**On push to `main`:**

1. Checkout code
2. Backend: install deps → type check → tests → build
3. Frontend: install deps → build (with NEXT_PUBLIC_API_URL)
4. **Deploy to VPS** via SSH:
   - Pull latest code
   - Inject secrets via environment
   - Rebuild Docker containers
   - Restart services
   - Verify health endpoint

### Required GitHub Secrets

| Secret | Description |
|--------|-------------|
| `VPS_HOST` | VPS IP or hostname |
| `VPS_USER` | SSH username |
| `VPS_SSH_KEY` | SSH private key |
| `VPS_PORT` | SSH port (default: 22) |
| `POSTGRES_PASSWORD` | Database password |
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | JWT signing key |
| `JWT_REFRESH_SECRET` | JWT refresh key |
| `CORS_ORIGINS` | Frontend domain |
| `NEXT_PUBLIC_API_URL` | Public API URL |

---

## 8. VPS Setup (First Time)

### Initial Server Setup

```bash
# Install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# Install Docker Compose (if not included)
sudo apt install docker-compose-plugin

# Clone repository
sudo mkdir -p /opt/kuhik-core
sudo chown $USER:$USER /opt/kuhik-core
git clone https://github.com/your-org/kuhik-core.git /opt/kuhik-core
cd /opt/kuhik-core

# Configure
cp .env.example .env
# EDIT .env with real values

# Start
docker compose up --build -d
```

---

## 9. Rollback Strategy

### Simple Rollback (Redeploy Previous Commit)

```bash
cd /opt/kuhik-core

# Rollback to previous commit
git log --oneline -5  # Find the commit to rollback to
git reset --hard <previous-commit-sha>
docker compose down --timeout=30
docker compose build --no-cache
docker compose up -d
```

### Via CI/CD

Rerun the previous successful workflow:

1. Navigate to GitHub Actions → Deploy workflow
2. Click "Run workflow" → select the previous commit from the dropdown

---

## 10. Monitoring

### Health Endpoint

```
GET /api/health
→ {"status":"ok","version":"1.0.0","environment":"production","timestamp":"...","uptime":1234}
```

### Docker Healthchecks

All services have healthchecks configured. Check status:

```bash
docker compose ps
```

### Logs

```bash
# Backend logs
docker compose logs -f backend

# All services
docker compose logs -f

# Filter by request ID
docker compose logs backend | grep "z7xk3lm2"
```

---

## 11. Security

### Hardening Applied

- JWT secrets validated at startup (no defaults in production)
- CORS restricted to frontend domain
- No stack traces leaked in production error responses
- All API endpoints require authentication
- Org scope enforced on all data access (Wave 2 rule)
- Docker containers run as non-root (Alpine)
- Database port bound to 127.0.0.1 only
- Caddy security headers applied

### SSL/TLS

- Automatic via Caddy + Let's Encrypt
- Enabled by uncommenting domain block in Caddyfile

---

## 12. Differences: Local Dev vs Production

| Aspect | Local Dev | Production |
|--------|-----------|------------|
| Backend runner | `tsx watch` (hot reload) | `node dist/index.js` (compiled) |
| Logger | pino-pretty (colorized) | JSON structured |
| Frontend runner | `next dev` | `next start` (optimized) |
| Database | Local PostgreSQL or Docker | Docker postgres service |
| Redis | Optional, configurable | Not needed (queues disabled) |
| Proxy | Next.js rewrites (dev only) | Caddy reverse proxy |
| Stack traces | Visible | Hidden |
| Environment | `.env` with defaults | `.env` with strong secrets |

---

## 13. Troubleshooting

### Backend won't start

```bash
# Check logs
docker compose logs backend

# Common issues:
# - DATABASE_URL missing or wrong
# - JWT_SECRET too short (< 20 chars)
# - PostgreSQL not reachable
```

### Database connection refused

```bash
# Check if postgres is running
docker compose ps postgres

# Check postgres logs
docker compose logs postgres
```

### Frontend shows white page

```bash
# Check frontend logs
docker compose logs frontend

# Verify NEXT_PUBLIC_API_URL matches Caddy domain
```

### Health check fails

```bash
# Direct backend check
curl http://localhost:4000/api/health

# Via proxy
curl http://localhost/api/health

# If backend is up but proxy fails, check Caddyfile syntax
```

---

## 14. Files

| File | Purpose |
|------|---------|
| `docker-compose.yml` | Service orchestration |
| `Caddyfile` | Reverse proxy configuration |
| `.env.example` | Environment template |
| `.dockerignore` | Docker build context exclusions |
| `backend/Dockerfile` | Backend container build |
| `backend/scripts/docker-entrypoint.sh` | Backend startup script |
| `frontend/Dockerfile` | Frontend container build |
| `.github/workflows/deploy.yml` | CI/CD pipeline |
| `scripts/deploy.sh` | Manual VPS deploy script |
| `docs/DEPLOYMENT.md` | This file |