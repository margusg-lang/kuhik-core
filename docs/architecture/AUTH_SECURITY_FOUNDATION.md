# Authentication and Authorization Foundation

Status: Phase 3 foundation

## Current Scope

Phase 3 introduces:

- `Person` as the human identity record.
- `User` as the authentication account.
- `UserSession` as revocable refresh-token session state.
- Argon2 password hashing.
- JWT access tokens.
- Opaque refresh tokens stored only as SHA-256 hashes.
- Refresh-token rotation.
- Protected `/api/v1/auth/me`.
- Initial RBAC role enum.

It intentionally does not introduce invitations, registration, MFA, password reset, audit entries, or relationship-based authorization yet.

## Identity Model

`Person` and `User` are separate.

`Person` represents a real individual.

`User` represents login credentials and authentication state.

System administrators may exist outside an organization. Other user roles require an organization.

## Token Model

Access tokens:

- JWT
- Short-lived
- Signed with `JWT_SECRET`
- Contain user ID, person ID, organization ID, role, session ID, and token version

Refresh tokens:

- Opaque random values
- Stored only as SHA-256 hashes
- Revocable
- Rotated after refresh
- Expire according to `JWT_REFRESH_TOKEN_TTL_DAYS`

## Authorization Foundation

The current backend exposes:

- `request.identity`
- `app.authenticate`
- `app.requireAnyRole`

Tenant-scoped business services must derive organization scope from `request.identity.organizationId`, never from client-supplied authority.

## Next Required Work

The next security increments are:

- Invitation/bootstrap flow for first organization administrator.
- Audit events for login/logout/security changes.
- Permission matrix per endpoint.
- Tenant-scoped repository helpers.
- Cross-tenant regression tests once tenant-owned business entities exist.
