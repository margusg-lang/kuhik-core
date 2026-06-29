# Kuhik Backend

The backend is the authoritative source of business truth.

This package currently contains the Phase 1 application spine:

- Fastify app factory
- Environment validation
- Structured logging with sensitive-field redaction
- Request ID and correlation ID propagation
- Consistent error response shape
- Health endpoints: `/health`, `/ready`, `/live`
- Prisma database foundation
- PostgreSQL readiness check
- Authentication foundation
- JWT access tokens and revocable refresh-token sessions

## Run

```bash
pnpm --filter @kuhik/backend dev
```

## Check

```bash
pnpm --filter @kuhik/backend typecheck
pnpm --filter @kuhik/backend lint
pnpm --filter @kuhik/backend test
pnpm --filter @kuhik/backend db:validate
```

## Current Scope

Redis, authentication, tenant isolation enforcement, audit, and events are intentionally not implemented in this skeleton yet. They are the next dependency phases and must be added before product features.

The database foundation currently includes `Organization`, `Person`, `User`, and `UserSession`.

Auth endpoints:

- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/logout`
- `GET /api/v1/auth/me`
