# Kuhik

Kuhik is an apartment association operating system.

This repository is built around the Architecture Bible in `docs/architecture/`. Before changing code, read:

- `docs/architecture/KUHIK_ARCHITECTURE_BIBLE.md`
- `docs/architecture/KUHIK_GAP_ANALYSIS.md`
- `docs/architecture/KUHIK_MASTER_ROADMAP.md`
- `docs/architecture/DATABASE_CONVENTIONS.md`
- `docs/architecture/AUTH_SECURITY_FOUNDATION.md`

## Current Phase

The project is in foundation work:

1. Phase 0: repository, documentation, tooling.
2. Phase 1: backend application spine.

No product feature work should begin before the backend, database, identity, tenant isolation, audit, and event foundations exist.

## Development

Prerequisites:

- Node.js LTS
- pnpm
- Docker Desktop

Install dependencies:

```bash
pnpm install
```

Run backend in development:

```bash
pnpm dev:backend
```

Run checks:

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm format
```

## Architecture Rules

- Backend owns business rules.
- Frontend never calculates financial values.
- Production workflows never use mock business data.
- Tenant isolation is mandatory.
- Financial operations require deterministic logic, audit, and events.
- Events describe completed facts and are published after successful transactions.
