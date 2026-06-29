# Database Conventions

Status: Phase 2 foundation

## Principles

The database is Kuhik's permanent business memory. Schema design must preserve tenant isolation, traceability, deterministic financial processing, and long-term readability.

## Current Scope

Phase 2 introduces:

- Prisma configuration.
- PostgreSQL datasource.
- Initial migration workflow.
- `Organization` as the first tenant-boundary model.
- Database plugin for Fastify.
- Readiness health check for database connectivity.

It intentionally does not introduce users, people, audit entries, events, billing, or accounting yet. Those belong to later dependency phases.

## Naming

Prisma model names use business language in PascalCase.

Database tables use snake_case plural names.

Prisma field names use camelCase.

Database columns use snake_case where the natural column name differs from the Prisma field name.

## Tenant Ownership

`Organization` is the tenant boundary.

Future tenant-scoped business entities must include an `organizationId` relation unless they are explicitly system-level entities.

Client-supplied organization IDs must not become the authority for tenant scope. Tenant scope is derived from authenticated identity in Phase 3.

## Base Entity Fields

Future important business entities should consistently include:

- `id`
- `organizationId` where tenant-scoped
- `createdAt`
- `updatedAt`
- `createdBy` where actor information exists
- `updatedBy` where actor information exists
- `version` where optimistic locking or historical clarity is required
- `status` where lifecycle states apply

## Migration Rules

- Every schema change uses Prisma migrations.
- Production schema must never be modified manually.
- Migrations must preserve business history.
- Large or risky migrations require an architecture decision record.
