# Kuhik Master Roadmap

Date: 2026-06-29  
Basis: `KUHIK_ARCHITECTURE_BIBLE.md` and `KUHIK_GAP_ANALYSIS.md`  
Execution rule: Do not implement feature work before the architecture spine is in place.

## Roadmap Strategy

This roadmap is dependency-aware. It prioritizes foundations that prevent future rework:

1. Repository and development spine.
2. Backend authority and database truth.
3. Identity, tenant isolation, audit, and events.
4. Core property domain.
5. Financial core.
6. Operational portals.
7. Automation and integrations.
8. AI and autonomous operations.

The sequence intentionally delays rich UI and AI until deterministic backend services exist.

## Phase 0 — Repository and Documentation Foundation

Purpose: Establish a stable project workspace before implementation.

Affected modules:

- Root repository
- Documentation
- Tooling

Files:

- `README.md`
- `docs/architecture/`
- `docs/decisions/`
- `package.json`
- `pnpm-workspace.yaml` or equivalent
- `.editorconfig`
- `.gitignore`
- `docker-compose.yml`

Dependencies: None.

Acceptance criteria:

- Repository has clear frontend/backend/package structure.
- Architecture Bible is stored and linked from README.
- Development commands are documented.
- No application code depends on undocumented assumptions.

Validation method:

- Workspace file inspection.
- Package manager install check.
- README onboarding walkthrough.

Estimated complexity: Medium.

Risk: Low technically, high architecturally if skipped.

Priority: Critical.

## Phase 1 — Backend Application Spine

Purpose: Create the authoritative backend layer before any business features.

Affected modules:

- Backend app
- Config
- Logging
- Plugins
- Middleware
- Health endpoints

Files:

- `backend/src/app/`
- `backend/src/config/`
- `backend/src/plugins/`
- `backend/src/middleware/`
- `backend/src/shared/`
- `backend/src/server.ts`

Dependencies: Phase 0.

Acceptance criteria:

- Fastify starts only with valid configuration.
- Structured logger exists.
- Request ID and correlation ID are attached to requests.
- `/health`, `/ready`, `/live` exist.
- Critical dependency failure prevents startup.

Validation method:

- TypeScript check.
- Backend unit tests.
- API integration tests for health endpoints.
- Manual local startup.

Estimated complexity: Medium.

Risk: Medium.

Priority: Critical.

## Phase 2 — Database and Prisma Foundation

Purpose: Establish PostgreSQL as permanent business memory.

Affected modules:

- Database
- Prisma
- Shared persistence utilities

Files:

- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/`
- `backend/src/plugins/database.plugin.ts`
- `backend/src/shared/repositories/`

Dependencies: Phase 1.

Acceptance criteria:

- Prisma is configured.
- PostgreSQL connection is validated at startup.
- Base entity conventions are documented.
- Migration workflow exists.
- Foreign key and tenant ownership conventions are explicit.

Validation method:

- Prisma validate.
- Migration apply/reset in local database.
- Database integration test.

Estimated complexity: Medium-high.

Risk: High because schema choices become long-lived.

Priority: Critical.

## Phase 3 — Identity, Authentication, Authorization and Tenant Isolation

Purpose: Create the security boundary before business data exists.

Affected modules:

- Auth
- Users
- People
- Organizations
- Permissions
- Sessions

Files:

- `backend/src/modules/auth/`
- `backend/src/modules/organizations/`
- `backend/src/modules/people/`
- `backend/src/modules/users/`
- `backend/src/middleware/authentication.ts`
- `backend/src/middleware/authorization.ts`

Dependencies: Phases 1-2.

Acceptance criteria:

- Person and User are separate.
- Passwords are hashed with Argon2id or approved fallback.
- Login creates short-lived access token and revocable refresh token.
- Organization scope is derived from authenticated identity.
- Repository queries are tenant scoped.
- Permission checks happen before business logic.

Validation method:

- Auth unit tests.
- API tests for login/refresh/logout.
- Security tests for unauthorized and cross-tenant access.
- Token expiry and revocation tests.

Estimated complexity: High.

Risk: Critical.

Priority: Critical.

## Phase 4 — Audit and Domain Event Backbone

Purpose: Ensure traceability and future automation from the beginning.

Affected modules:

- Audit
- Events
- Outbox/event bus
- Shared transaction utilities

Files:

- `backend/src/modules/audit/`
- `backend/src/events/`
- `backend/src/shared/transactions/`
- `backend/src/shared/event-bus/`

Dependencies: Phases 1-3.

Acceptance criteria:

- Standard audit entry exists.
- Standard event envelope exists.
- Events are published after successful commit.
- Event subscribers are idempotency-ready.
- Correlation IDs link workflows.
- Sensitive operations write audit entries.

Validation method:

- Unit tests for event envelope.
- Integration tests for event-after-commit.
- Audit creation tests.

Estimated complexity: High.

Risk: Critical.

Priority: Critical.

## Phase 5 — Core Property Domain

Purpose: Implement the non-financial domain foundation.

Affected modules:

- Organizations
- Buildings
- Entrances
- Apartments
- People
- ApartmentPerson relationships
- Meters
- Meter readings

Files:

- `backend/src/modules/buildings/`
- `backend/src/modules/apartments/`
- `backend/src/modules/people/`
- `backend/src/modules/meters/`
- `backend/src/modules/readings/`

Dependencies: Phases 1-4.

Acceptance criteria:

- Organizations are tenant boundaries.
- Buildings belong to organizations.
- Apartments belong to buildings.
- People exist independently from users.
- ApartmentPerson supports ownership/resident/contact history.
- Meter readings are append-only.
- Reading cannot decrease without correction workflow.

Validation method:

- Domain service tests.
- API tests.
- Database constraint tests.
- Tenant isolation tests.

Estimated complexity: High.

Risk: High.

Priority: Critical.

## Phase 6 — Frontend and Design System Spine

Purpose: Create the UI foundation without business logic leakage.

Affected modules:

- Frontend app
- Auth UI
- Layouts
- API client
- Design tokens
- Core components

Files:

- `frontend/app/`
- `frontend/components/`
- `frontend/features/`
- `frontend/services/`
- `frontend/lib/`

Dependencies: Phases 1 and 3, can run partially in parallel with Phase 5 after API contracts stabilize.

Acceptance criteria:

- Next.js App Router is configured.
- Resident, manager, and admin route groups exist.
- TanStack Query API client is configured.
- Forms use React Hook Form and Zod.
- No frontend financial/business calculations.
- Design tokens and base components exist.

Validation method:

- TypeScript check.
- Lint.
- Playwright smoke test for app shell/login.
- Accessibility smoke checks.

Estimated complexity: Medium-high.

Risk: Medium.

Priority: High.

## Phase 7 — Documents and File Storage Foundation

Purpose: Support legal artifacts and future invoice PDFs.

Affected modules:

- Documents
- Files
- Storage adapter
- PDF generation worker foundation

Files:

- `backend/src/modules/documents/`
- `backend/src/modules/files/`
- `backend/src/integrations/storage/`
- `backend/src/jobs/document/`

Dependencies: Phases 1-5 and Phase 8 worker foundation if separated.

Acceptance criteria:

- Document metadata and file metadata are separate.
- Storage adapter supports local development.
- Published documents are immutable.
- Checksums are stored.
- Visibility is backend-enforced.
- Document events are emitted.

Validation method:

- API tests.
- File upload validation tests.
- Permission tests.
- Worker test for generated document lifecycle.

Estimated complexity: High.

Risk: High.

Priority: High.

## Phase 8 — Queue, Workers and Scheduler Foundation

Purpose: Enable long-running work without blocking HTTP requests.

Affected modules:

- Redis
- BullMQ
- Workers
- Scheduler
- DLQ
- Job monitoring

Files:

- `backend/src/jobs/`
- `backend/src/workers/`
- `backend/src/scheduler/`
- `backend/src/plugins/queue.plugin.ts`

Dependencies: Phases 1-4.

Acceptance criteria:

- Queues exist for documents, notifications, billing, reporting, integrations, AI, and system.
- Jobs are idempotency-ready.
- Retry and DLQ policies exist.
- Scheduler triggers services, not repositories.
- Job audit exists.

Validation method:

- Worker integration tests.
- Retry/DLQ tests.
- Health readiness includes Redis/queue state.

Estimated complexity: High.

Risk: High.

Priority: High.

## Phase 9 — Notification Engine

Purpose: Make communication event-driven and auditable.

Affected modules:

- Notifications
- Templates
- Email adapter
- In-app notifications
- Preferences

Files:

- `backend/src/modules/notifications/`
- `backend/src/integrations/smtp/`
- `backend/src/jobs/notification/`

Dependencies: Phases 3-4 and 8.

Acceptance criteria:

- Notifications originate from events.
- Email sending is asynchronous.
- Delivery states are persisted.
- Duplicate sends are prevented.
- Communication history is queryable.

Validation method:

- Event subscriber tests.
- Worker tests.
- API tests for in-app notifications.
- SMTP adapter tests using safe local/test transport.

Estimated complexity: Medium-high.

Risk: High.

Priority: High.

## Phase 10 — Financial Data Model and Accounting Foundation

Purpose: Establish the legal financial record before billing automation.

Affected modules:

- Accounting
- Accounts
- Accounting periods
- Journal entries
- Journal lines
- Reserve fund

Files:

- `backend/src/modules/accounting/`
- `backend/src/modules/reports/accounting/`

Dependencies: Phases 1-5 and 4.

Acceptance criteria:

- Chart of accounts exists per organization.
- Accounting periods support open/closing/closed.
- Journal entries always balance.
- Closed periods cannot be modified.
- Manual journals require reason and audit.
- Accounting events are emitted.

Validation method:

- Domain tests for balanced/unbalanced entries.
- API tests.
- Database constraints.
- Security and tenant tests.

Estimated complexity: Very high.

Risk: Critical.

Priority: Critical.

## Phase 11 — Billing Core

Purpose: Implement deterministic apartment-level financial calculations.

Affected modules:

- Costs
- Cost types
- Billing periods
- Allocation rules
- Allocation runs
- Charge lines
- Invoices
- Receivables
- Penalties
- Credits

Files:

- `backend/src/modules/costs/`
- `backend/src/modules/allocations/`
- `backend/src/modules/billing/`
- `backend/src/modules/invoices/`
- `backend/src/modules/receivables/`

Dependencies: Phases 5, 10, 4, 7, 8.

Acceptance criteria:

- Billing period validation blocks invalid generation.
- Allocation methods are deterministic.
- Rounding is reproducible and recorded.
- Charge lines explain every amount.
- Invoices originate from charge lines only.
- Receivables are created automatically.
- Events and audit are complete.
- Corrections create new records.

Validation method:

- Deterministic domain tests with known values.
- Integration tests for full billing run.
- Accounting posting tests.
- Document generation tests.
- API tests.

Estimated complexity: Very high.

Risk: Critical.

Priority: Critical.

## Phase 12 — Payments and Payment Allocation

Purpose: Track cash movement and settle receivables.

Affected modules:

- Payments
- Payment allocations
- Credits
- Refunds
- Bank import foundation

Files:

- `backend/src/modules/payments/`
- `backend/src/integrations/bank/`

Dependencies: Phases 10-11.

Acceptance criteria:

- Payments are immutable after validation/completion.
- Allocations support partial, split, advance, credit, and refund scenarios.
- FIFO default exists.
- Every allocation is auditable.
- Accounting entries are posted.

Validation method:

- Domain tests for allocation strategies.
- Integration tests against receivables/accounting.
- API tests.
- Regression tests for edge cases.

Estimated complexity: High.

Risk: Critical.

Priority: Critical.

## Phase 13 — Manager Portal MVP

Purpose: Give managers operational control over core domains.

Affected modules:

- Manager frontend
- Organization/building/apartment/person/meter/cost/billing/payment/accounting views

Files:

- `frontend/app/haldur/`
- `frontend/features/manager/`

Dependencies: Phases 5, 10-12 and 6.

Acceptance criteria:

- Manager can navigate core entities.
- Lists support search/filter/pagination where needed.
- Billing readiness is visible.
- Errors are actionable.
- No business rules are duplicated in UI.

Validation method:

- Playwright manager workflows.
- API contract tests.
- Console/network error inspection.

Estimated complexity: Very high.

Risk: High.

Priority: High.

## Phase 14 — Resident Portal MVP

Purpose: Provide resident self-service and transparency.

Affected modules:

- Resident frontend
- Resident-scoped APIs
- Invoices
- Payments
- Meter readings
- Documents
- Notifications
- Issues

Files:

- `frontend/app/resident/`
- `frontend/features/resident/`

Dependencies: Phases 5-12 and 6.

Acceptance criteria:

- Resident sees only authorized apartment data.
- Resident can submit meter reading.
- Resident can view invoice breakdown and payment history.
- Resident can access authorized documents.
- Resident can report issue.

Validation method:

- Playwright resident workflows.
- Tenant and relationship permission tests.
- Mobile viewport checks.

Estimated complexity: High.

Risk: High.

Priority: High after financial core.

## Phase 15 — Maintenance and Issue Management

Purpose: Build operational memory for buildings.

Affected modules:

- Issues
- Comments
- Attachments
- Assignments
- Maintenance schedules
- Notifications

Files:

- `backend/src/modules/issues/`
- `backend/src/modules/maintenance/`
- `frontend/features/issues/`

Dependencies: Phases 5, 7, 9, 13-14.

Acceptance criteria:

- Issue lifecycle is backend-controlled.
- Comments and attachments are immutable history.
- Priorities and assignments emit events/notifications.
- Resident and manager visibility differs correctly.

Validation method:

- Domain/API tests.
- Playwright issue reporting and management.
- Permission tests.

Estimated complexity: High.

Risk: Medium-high.

Priority: Medium.

## Phase 16 — Reporting and Dashboards

Purpose: Turn operational data into decisions.

Affected modules:

- Reports
- Read models
- Dashboard projections
- Exports

Files:

- `backend/src/modules/reports/`
- `backend/src/modules/projections/`
- `frontend/features/reports/`
- `frontend/features/dashboard/`

Dependencies: Events, accounting, billing, payments, maintenance.

Acceptance criteria:

- Reports derive from authoritative sources.
- Financial reports derive from accounting.
- Dashboard projections can be rebuilt.
- Reports are permission-aware.
- Exports inherit permissions.

Validation method:

- Report deterministic tests.
- Projection rebuild tests.
- API tests.
- Playwright dashboard checks.

Estimated complexity: High.

Risk: High.

Priority: Medium-high.

## Phase 17 — External Integrations

Purpose: Reduce duplicate data entry without giving external systems authority.

Affected modules:

- SMTP hardening
- Merit
- Finbite
- Banks
- Storage providers
- Webhooks

Files:

- `backend/src/integrations/`

Dependencies: Events, jobs, audit, financial core.

Acceptance criteria:

- Every provider is behind an adapter.
- Integration failures never corrupt business state.
- Retry and monitoring exist.
- External data enters through business services.

Validation method:

- Adapter contract tests.
- Failure/retry tests.
- Audit verification.

Estimated complexity: High.

Risk: Medium-high.

Priority: Medium.

## Phase 18 — AI Copilot Foundation

Purpose: Add permission-aware intelligence after deterministic systems exist.

Affected modules:

- AI context builder
- AI provider adapters
- Recommendation records
- AI audit/events
- Natural language search foundation

Files:

- `backend/src/modules/ai/`
- `backend/src/integrations/ai/`

Dependencies: Stable domain data, events, documents, reporting, permissions.

Acceptance criteria:

- AI is read-only by default.
- AI responses are tenant scoped and permission-aware.
- AI recommendations do not execute without approval.
- AI never emits business events directly.

Validation method:

- Permission tests.
- Context grounding tests.
- Audit tests.
- Manual review workflows.

Estimated complexity: High.

Risk: High if introduced too early.

Priority: Low for MVP, strategic later.

## Phase 19 — Predictive Analytics and Autonomous Operations

Purpose: Move toward the operating system vision.

Affected modules:

- Automation rules
- AI recommendations
- Forecasting
- Anomaly detection
- Operational planning

Files:

- Future modules under `backend/src/modules/automation/`, `backend/src/modules/analytics/`, and `backend/src/modules/ai/`

Dependencies: Mature events, reporting, historical data, automation, AI foundation.

Acceptance criteria:

- Predictions include confidence, evidence, and explanation.
- Important actions require configured approval.
- Automation remains deterministic where it changes state.
- Managers can inspect and override recommendations.

Validation method:

- Historical data tests.
- Event replay tests.
- Human approval workflow tests.
- Monitoring checks.

Estimated complexity: Very high.

Risk: Strategic high.

Priority: Long-term.

## Self-Review Findings

Hidden dependencies identified:

- Billing depends on accounting periods and chart of accounts earlier than a naive roadmap would suggest.
- Document generation depends on queue/workers and storage, not just document metadata.
- Notifications require event backbone and workers; direct synchronous email would violate architecture.
- Resident portal depends on relationship-based data visibility even before full ReBAC exists.
- Reports depend on authoritative source domains and should not be built from ad hoc duplicated totals.
- AI depends on permission-aware context building and stable events; it must not be introduced as a shortcut for missing domain logic.

Circular dependency risks:

- Billing and accounting can become circular if billing writes ledger directly. Resolution: billing publishes financial events; accounting engine posts journals.
- Documents and billing can become circular if invoice creation waits on PDF publication. Resolution: invoice business state is separate from document generation; PDF generation is asynchronous after approval.
- Notifications and business workflows can become circular if services directly send messages. Resolution: notifications subscribe to events.

Missing APIs to plan explicitly:

- Auth/session APIs.
- Organization/building/apartment/person CRUD APIs.
- Meter reading submission and correction APIs.
- Billing validation/generation/approval APIs.
- Accounting journal/report APIs.
- Document upload/generate/publish APIs.
- Notification preference/history APIs.
- Issue lifecycle APIs.

Missing UI to plan explicitly:

- Manager operational dashboard.
- Billing workspace with validation status.
- Accounting workspace.
- Resident invoice explanation.
- Resident meter reading submission.
- Document center.
- Issue reporting and management.

Missing events to enforce early:

- User/session/security events.
- Organization/building/apartment/person events.
- Meter and reading events.
- Cost/billing/invoice/receivable/payment/accounting events.
- Document/notification/issue/reporting/system events.

Missing audit to enforce early:

- Login/logout and security changes.
- Role/permission changes.
- Financial operations.
- Document publication.
- Voting closure.
- Issue state changes.
- Automation executions.

Missing permissions to enforce early:

- System admin versus organization-scoped roles.
- Manager/accountant/board/resident/auditor separation.
- Tenant-scoped repository access.
- Document visibility levels.
- Resident apartment relationship access.

Missing tests to enforce early:

- Cross-tenant access tests.
- Deterministic allocation tests.
- Balanced journal tests.
- Invoice traceability tests.
- Event-after-commit tests.
- Audit creation tests.
- Browser workflow checks.

Missing documentation:

- Module ownership map.
- API conventions.
- Event naming and versioning rules.
- Database lifecycle and retention rules.
- Development setup.
- Definition of done checklist.

## Revised Execution Rule

Implementation may begin only with Phase 0. Do not implement billing, portals, reports, automation, integrations, or AI until the required dependency phases exist.

Every completed implementation task must run relevant tests, TypeScript checks, linting, database validation, and Playwright validation where UI is involved.

If implementation and architecture conflict, stop and document the conflict before changing code.
