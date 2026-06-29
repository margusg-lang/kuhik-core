# Kuhik Architecture Bible

Version: 1.0  
Status: Authoritative project context  
Role: Long-term memory and architectural constitution for Kuhik

## How This Document Must Be Used

This document is the authoritative knowledge base for the Kuhik project. Every human developer, AI coding assistant, reviewer, and future contributor must treat it as the source of truth before making architectural or implementation decisions.

If source code and this document conflict, the conflict must be investigated. Do not automatically assume the implementation is correct.

The first task of any implementation effort is not coding. It is to absorb this architecture, build the mental model, verify the repository against it, produce a gap analysis, and create a dependency-aware roadmap.

## Product Mission

Kuhik is an apartment association operating system. It is not intended to be another management application.

The long-term objective is to automate nearly every repetitive task performed by apartment association managers while keeping humans fully in control of important legal, financial, and operational decisions.

The finished system should continuously monitor buildings, finances, residents, maintenance, communication, legal obligations, events, and integrations, surfacing only meaningful actions to managers.

Residents should experience Kuhik as simple, transparent, and trustworthy. Managers should experience it as an intelligent operational workspace rather than a collection of forms.

## Non-Negotiable Principles

1. Business logic belongs in the backend.
2. The running application must never return mock business data.
3. Fail fast. Hidden failures become corrupted systems.
4. Business operations must be deterministic.
5. Every important value must be traceable.
6. Every meaningful business action should produce domain events.
7. The API is the only path from frontend to backend business operations.
8. Major domains remain modular and independent.
9. Security is designed into every feature from the start.
10. User experience must reduce complexity, not expose it.

## Highest-Level Architecture Constitution

Kuhik is business-driven. Technology exists only to implement business behaviour. Frameworks are replaceable. Business rules are not.

The backend is the single source of business truth. The frontend, external systems, and AI never own business logic. Only backend domain/application services may change business state.

Every important business action must be deterministic. Given identical inputs, invoice generation, allocation, accounting, penalty calculation, reserve calculation, and consumption calculation must produce identical outputs.

Every important operation must be auditable. Every business decision must answer who acted, when, why, from which data, and under which version.

Every financial value must be traceable from invoice to charge line, allocation rule, supplier cost, accounting entry, payment, and financial report.

Everything important becomes an event. Events describe completed facts, not future intentions.

Tenant isolation is absolute across API, database, reports, AI, search, cache, events, and tests.

The database stores permanent truth. Caches, queues, Redis, and projections may disappear without destroying business history.

Background processing never changes business rules. Workers and schedulers invoke existing business services and never bypass validation.

AI assists. Humans decide, except where explicit deterministic automation rules exist. AI may explain, recommend, predict, draft, and summarize. AI may never silently modify legal or financial history.

Documentation is architecture. Undocumented architecture eventually disappears.

Kuhik is designed for decades.

## Layered System Architecture

```text
Browser
  |
  v
Next.js Frontend
  |
REST API
  |
  v
Fastify API Layer
  |
Authentication
Authorization
Validation
Rate Limiting
DTO Mapping
Logging
  |
  v
Application Services
  |
Business Workflows
Transactions
Permission Checks
Event Publishing
  |
  v
Domain Services
  |
Business Rules
Financial Logic
Allocation Logic
Validation Rules
  |
  v
Repositories
  |
Prisma ORM
  |
  v
PostgreSQL
```

External systems include Redis, BullMQ, SMTP, Merit Aktiva, banking APIs, Finbite, AI services, file storage, PDF generation, monitoring, and future integrations.

Every layer depends only downward. No layer may bypass another.

## Technology Baseline

Backend:

- Node.js
- Fastify
- TypeScript
- Prisma
- PostgreSQL
- Redis
- BullMQ
- Zod + Fastify schemas
- JWT access tokens
- Refresh tokens
- Argon2id preferred for password hashing, bcrypt acceptable fallback

Frontend:

- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- TanStack Query
- React Hook Form
- Zod
- Lucide icons
- Toast notifications
- Browser-native PDF preview where appropriate

Infrastructure:

- Docker-first local development
- Caddy or Nginx reverse proxy
- PostgreSQL as permanent datastore
- Redis for queues/cache/locks/rate limiting only
- Object storage for binary files
- Background workers for long-running work
- CI/CD with type checks, tests, Playwright, Docker build, migration validation, and smoke tests

## Backend Architecture

The backend is the authoritative source of truth. No client, integration, automation worker, or AI component may bypass backend business rules.

Primary responsibilities:

- Authentication
- Authorization
- Business logic
- Financial calculations
- Workflow orchestration
- Validation
- Database transactions
- Audit logging
- Event publishing
- Background jobs
- Document generation
- External integrations
- Reporting

Recommended structure:

```text
backend/
  src/
    app/
    config/
    plugins/
    middleware/
    modules/
      auth/
      organizations/
      buildings/
      apartments/
      people/
      meters/
      readings/
      costs/
      allocations/
      billing/
      payments/
      accounting/
      documents/
      issues/
      notifications/
      reports/
    shared/
    events/
    jobs/
    repositories/
    utils/
    types/
```

Every module follows a consistent pattern:

```text
billing/
  billing.routes.ts
  billing.schemas.ts
  billing.service.ts
  billing.repository.ts
  billing.events.ts
  billing.types.ts
  billing.errors.ts
  index.ts
```

Application services coordinate workflows. Domain services contain reusable business rules. Repositories load and persist data only.

Startup must validate configuration, initialize logger, connect PostgreSQL and Redis, register plugins/middleware/auth/routes, start schedulers, and fail fast if any critical dependency is missing.

## Frontend Architecture

The frontend is an operational interface, not the application itself. It displays state, collects input, guides workflows, and calls APIs.

The frontend must never implement:

- Invoice calculations
- Allocation calculations
- Accounting logic
- Payment matching
- Permission logic
- Tenant isolation
- Security rules
- Financial business rules

Recommended structure:

```text
frontend/
  app/
    (auth)/
    resident/
    haldur/
    admin/
  components/
  features/
  hooks/
  lib/
  services/
  types/
  styles/
```

Pages remain thin. Server state is owned by TanStack Query. Local state is reserved for UI behaviour only.

Resident UI is mobile-first, minimal, and trust-oriented. Manager UI is desktop-first, information dense, keyboard friendly, and operational.

## Domain Model

The system is built around business concepts, not database tables.

```text
System
└── Organization
    ├── Building
    │   ├── Entrance
    │   ├── Floor
    │   ├── Apartment
    │   │   ├── Ownership
    │   │   ├── Resident
    │   │   ├── Meter
    │   │   ├── Documents
    │   │   ├── Issues
    │   │   └── Invoices
    │   └── Shared Areas
    ├── Accounting
    ├── Documents
    ├── Notifications
    ├── Voting
    ├── Maintenance
    └── Reports
```

Core entities:

- Organization: tenant boundary and apartment association.
- Building: physical building owned by an organization.
- Apartment: central object for resident operations.
- Person: real individual, independent from login credentials.
- User: authentication identity linked to a person.
- ApartmentPerson: relationship between apartments and people, supporting owners, residents, tenants, board members, contacts, and history.
- Meter and MeterReading: append-only consumption evidence.
- Cost: supplier or operational expense.
- AllocationRule and AllocationRun: reproducible cost distribution.
- ChargeLine: atomic financial result.
- Invoice: generated communication/legal document based on charge lines.
- Receivable: resident obligation.
- Payment and PaymentAllocation: cash movement and debt settlement.
- Accounting: double-entry ledger.
- Document and File: legal artifacts and binary metadata.
- Issue: maintenance or resident concern.
- Voting and Vote: governance workflows.
- Notification: event-driven communication.
- AuditEntry: immutable record of sensitive operations.

Domain invariants:

- Apartment belongs to one building.
- Building belongs to one organization.
- Invoice belongs to one organization.
- Payment belongs to one organization.
- Meter belongs to exactly one apartment or common property.
- Every accounting entry balances.
- Every invoice originates from allocation.
- Every payment allocation references a receivable.
- Every document has an owner.
- Every user belongs to one organization unless system administrator.

## Data Governance

Every piece of data has one owner, one lifecycle, one source of truth, and one business meaning.

No module modifies another module's data directly. Communication occurs through services and domain events.

Write models are validated, transactional, normalized business entities. Read models exist for dashboards, reports, search, statistics, and analytics, and may be rebuilt at any time.

PostgreSQL owns persistent business data. Redis owns temporary operational data. BullMQ owns background job state. Object storage owns binary files. The frontend owns temporary UI state only.

Historical entities become immutable after completion or approval. Corrections create new records. History is never rewritten.

## Database Architecture

The database is the permanent memory of Kuhik. Legal, financial, and operational history must be preserved.

Design principles:

- Every table has one responsibility.
- Every relationship models a real-world relationship.
- Normalization is preferred over duplication.
- Financial history is immutable.
- Primary keys never change.
- Foreign keys are mandatory.
- Soft delete is used only where business rules require historical preservation.

Every important entity includes metadata such as id, createdAt, updatedAt, createdBy, updatedBy, organizationId, version, and status where appropriate.

Immutable after completion:

- Invoice
- ChargeLine
- AllocationRun
- JournalEntry
- JournalLine
- AuditEntry
- Historical MeterReading
- Published Document

## Billing Engine

Billing is the core of Kuhik. Every cent must be explainable.

```text
Cost
  |
Billing Period
  |
Allocation Rules
  |
Allocation Engine
  |
Charge Lines
  |
Invoice Generation
  |
Receivables
  |
Payments
  |
Accounting
```

Billing periods progress through Draft, Ready, Calculating/Generating, Generated, Approved, Locked, and Archived states.

Generation requires all mandatory costs, required readings, no duplicate allocation run, open accounting period, and active organization.

Supported allocation methods:

- Equal distribution
- Area based
- Ownership share
- Meter consumption
- Coefficient
- Manual allocation with explicit audit
- Hybrid formulas
- Future formula engine

Rounding must be deterministic. Remaining cents are distributed according to a configured strategy. Every rounding adjustment is recorded.

ChargeLine is the atomic financial object and contains apartment, cost, method/rule, formula/calculation, amount, rounding adjustment, and explanation.

Invoices originate only from charge lines. Corrections never overwrite historical periods; they create correction periods, adjustment charge lines, correction invoices, and accounting adjustments.

## Accounting Engine

Accounting is a core subsystem, not a reporting add-on. Every financial event must eventually produce balanced accounting entries.

Business modules never write directly to the ledger. They publish events. The accounting engine creates journal entries.

Every journal entry contains one or more journal lines, and total debit must equal total credit.

Accounting periods move from Open to Closing to Closed. Closed periods are read-only. Corrections create adjustment entries.

Reports are generated from journal data, never manually maintained.

The accounting engine must support chart of accounts, journal entries, journal lines, general ledger, trial balance, financial statements, receivables aging, reserve fund tracking, VAT support, multi-building analytical dimensions, and future Merit Aktiva integration.

## Financial Constitution

Every euro inside Kuhik must have complete history. Money never appears and never disappears.

Financial ownership:

- Costs: source of expenses.
- Allocation: source of apartment-level calculations.
- ChargeLines: source of invoice contents.
- Invoices: communication/legal document.
- Receivables: debt tracking.
- Payments: cash movement.
- Accounting: legal financial record.
- Reports: read-only projections.

After approval, invoices, charge lines, allocation runs, journal entries, historical payments, and published documents are immutable.

Payment allocation supports partial payments, multiple invoices, credits, advance payments, refunds, FIFO default strategy, and configurable alternatives.

Penalty calculation is configurable and creates receivables, accounting entries, audit, and notifications.

## Event-Driven Architecture

Kuhik is not built around CRUD. CRUD stores information. Events describe what happened.

Events are immutable facts. Commands request work; events describe completed work.

```text
User Action
  |
Command
  |
Business Service
  |
Database Transaction
  |
Commit
  |
Publish Domain Event
  |
Subscribers
  |
Secondary Actions
```

Events are published only after successful transaction commit.

Standard event structure:

- Event ID
- Event Name
- Event Version
- Timestamp
- Correlation ID
- Organization ID
- User ID or System
- Entity Type
- Entity ID
- Payload
- Metadata

Subscribers must be idempotent. Failed events retry and then move to a dead letter queue. Event replay must be able to rebuild projections, dashboards, search indexes, analytics, and caches without modifying historical facts.

Canonical event categories include identity, organization, building, person, meter, cost, billing, payment, accounting, document, notification, issue, voting, reporting, AI, and system events.

## Automation, Scheduler, and Background Processing

Automation removes repetitive operational work while preserving human control over business decisions.

Every automated workflow must be deterministic, idempotent, observable, auditable, retryable, recoverable, and configurable.

Automation invokes the same backend services as manual operations. It never talks directly to repositories.

BullMQ is the primary background processing engine, with independent queues for billing, documents, notifications, reporting, integrations, maintenance, AI, and system work.

Schedulers decide when work begins. They never contain business logic.

Workers execute stateless background jobs such as PDF generation, email sending, large reports, accounting exports, bank imports, document processing, AI analysis, and projection rebuilding.

Dead letter queues preserve failed jobs for inspection, retry, cancellation, and diagnostics.

## Authentication, Authorization, and Security

Security is a core architectural layer. Every request and integration assumes hostile input until validated.

Authentication answers who is making the request. Authorization answers whether the user may perform the action. These responsibilities must not be mixed.

Access tokens are short-lived, signed, stateless, and contain no sensitive business information. Refresh tokens are long-lived, revocable, stored securely, and should be rotated after use.

Initial roles:

- System Administrator
- Organization Administrator
- Manager
- Accountant
- Board Member
- Resident
- Auditor

Long-term direction includes relationship-based authorization.

Permission checks occur before business logic. Every endpoint defines authentication requirement, authorization requirement, input schema, rate limit, and audit requirement.

Frontend visibility is never a security boundary.

## Document Engine

Documents are legal artifacts, not merely downloadable files.

Every document must answer who created it, why it was created, when it was created, which business data produced it, and whether it changed.

Documents are immutable after publication, versioned, auditable, searchable, permission controlled, and linked to business entities.

Document lifecycle:

```text
Business Event
  |
Template
  |
Render
  |
PDF Generation
  |
Storage
  |
Publication
  |
Notification
```

Preferred PDF approach: React components to HTML, Playwright rendering, PDF generation, storage, metadata, event.

Templates contain layout, typography, branding, localization, and formatting. Templates never contain business logic.

## Notification and Communication Engine

Notifications are reactions to business events.

Communication flow:

```text
Business Event
  |
Notification Decision
  |
Template Selection
  |
Channel Selection
  |
Queue
  |
Delivery
  |
Delivery Status
  |
Audit
```

Channels include email and in-app initially, with future support for push, SMS, mobile app, Microsoft Teams, Slack, and webhooks.

Notifications must be reliable, configurable, event-driven, multi-channel, auditable, delayed when necessary, and idempotent.

## Maintenance and Issue Management

Maintenance is an operational memory of the building, not merely a ticket tracker.

Issue lifecycle:

```text
Reported
  |
Validated
  |
Assigned
  |
Scheduled
  |
In Progress
  |
Waiting
  |
Resolved
  |
Verified
  |
Closed
```

State transitions are controlled by backend business rules.

Issues contain structured information: organization, building, optional apartment, category, priority, status, reporter, assignee, contractor, description, photos, attachments, comments, dates, resolution, closure reason, and history.

Future maintenance capabilities include work orders, contractor management, recurring preventive maintenance, maintenance calendar, cost linking, analytics, and AI assistance.

## AI Architecture

AI is not the product. AI amplifies the product.

Kuhik must remain fully functional without AI.

AI may observe, analyze, recommend, explain, summarize, predict, and draft. AI must never change accounting, generate invoices independently, modify ownership, allocate payments autonomously, approve legal documents, or bypass permissions.

AI layers:

1. Explanation: read-only explanations.
2. Recommendations: suggested actions.
3. Assisted automation: drafts and prepared work.
4. Predictive intelligence: forecasts with confidence and evidence.
5. Autonomous operations: supervised long-term operations under configured approval rules.

AI never writes directly into PostgreSQL. Every state-changing action passes through backend business services.

## External Integrations

Kuhik is independent. External systems extend Kuhik but never own business rules.

Every integration uses an adapter pattern:

- MeritAdapter
- FinbiteAdapter
- BankAdapter
- SMTPAdapter
- OpenBankingAdapter
- StorageAdapter
- AI provider adapters

Integration pipeline:

```text
External System
  |
Integration Adapter
  |
Validation
  |
Business Service
  |
Database
  |
Events
  |
Notifications
```

External APIs never bypass validation or directly modify business data.

## Reporting and Analytics

Reports exist to support decisions. Every report must answer a meaningful business question.

Every report must be accurate, reproducible, fast, permission-aware, exportable, auditable, and deterministic.

No report may contain manually maintained values. Every number must be reproducible from source data.

Report categories:

- Financial reports
- Accounting reports
- Billing reports
- Payment reports
- Consumption reports
- Maintenance reports
- Resident activity reports
- Board reports
- Operational dashboards
- Regulatory reports
- AI-generated summaries

Large reports use read models, cached projections, background generation, and streaming downloads. Business correctness never depends on projections.

## Infrastructure and DevOps

Deployment is part of the product.

Production architecture:

```text
Internet
  |
Reverse Proxy
  |
  +--> Next.js Frontend
  |
  +--> Fastify Backend
        |
        +--> PostgreSQL
        +--> Redis/BullMQ
        +--> Background Workers
              |
              +--> SMTP
              +--> Object Storage
              +--> External APIs
```

Health endpoints:

- `/health`
- `/ready`
- `/live`

Observability includes structured logs, metrics, audit logs, domain events, and future distributed tracing.

Backups must include database, documents, configuration, attachments, and audit history. Backups must be encrypted, verified, restorable, and regularly tested.

Primary production target is Oracle Cloud Infrastructure, while preserving cloud independence for Azure, AWS, Hetzner, and on-premise deployments.

## Product Roadmap

Strategic phases:

1. Foundation: auth, organizations, buildings, apartments, people, core API, infrastructure, audit, basic events.
2. Property management: residents, ownership, meters, readings, documents, issues, announcements, notifications, basic reporting.
3. Financial core: costs, allocation, billing periods, invoices, receivables, payments, accounting, reserve fund, financial reporting.
4. Resident experience: dashboard, invoices, payments, consumption, documents, issues, voting, notifications, profile.
5. Manager experience: operational dashboard, quick actions, bulk operations, search, filtering, maintenance, reporting, communication center.
6. Automation: scheduler, BullMQ, recurring jobs, rule engine, reminders, document generation, projections.
7. AI copilot: natural language search, explanations, recommendations, summaries, meeting preparation, resident assistance.
8. External integrations: Merit, Finbite, SMTP, banks, Open Banking, storage, calendar, contacts, signatures.
9. Predictive analytics: cash flow, payment risk, maintenance, consumption, reserve fund, contractor performance, budget variance.
10. Autonomous operations: monitoring, analysis, planning, communication preparation, scheduling, risk detection, decision support.

## UI/UX Constitution

Users should never feel the complexity of the system. Complexity belongs inside services, domain logic, accounting, billing, automation, and AI.

Every page should answer:

- Where am I?
- What happened?
- What requires attention?
- What can I do next?

Resident portal: mobile-first, minimal, large touch targets, clear actions.

Manager portal: persistent sidebar, top navigation, breadcrumbs, dense workspace, action panel, tables, filters, and quick actions.

Every action must provide immediate feedback. Empty states, loading states, and error states must be explicit and useful.

## Testing and Quality Constitution

Quality is achieved through architecture, validation, automation, and continuous verification.

Testing exists to prove that the system behaves exactly as intended under real operational conditions.

Every test should answer: what business risk does this eliminate?

Test categories:

- Architecture tests
- Unit tests
- Domain tests
- Integration tests
- API tests
- Database tests
- Security tests
- Performance tests
- Playwright validation
- Business workflow validation
- Regression tests
- Production smoke tests

End-to-end validation must use real backend, real database, real authentication, real business workflows, real permissions, and real validation. Mocks are acceptable only inside isolated unit tests.

## Operating System Vision

Kuhik is intended to become the digital operating system of apartment associations.

Traditional workflow:

```text
Manager logs in
  |
Searches information
  |
Finds problems
  |
Plans work
  |
Executes work
  |
Documents work
```

Kuhik workflow:

```text
Manager logs in
  |
Dashboard explains priorities
  |
Recommendations prepared
  |
Documents drafted
  |
Tasks scheduled
  |
Manager reviews and approves
```

The system should continuously manage financial operations, communication, maintenance, governance, accounting, documents, automation, AI, integrations, and analytics.

Autonomy levels:

1. Digital record keeping.
2. Operational workflows.
3. Automation.
4. AI recommendations.
5. Predictive operations.
6. Supervised autonomy.

## Development Constitution

Architecture has higher priority than implementation speed.

Before changing code, read project documentation, understand affected modules, respect architecture, avoid shortcuts, and avoid duplicated business logic.

Definition of done:

- Business logic complete
- API complete
- Frontend complete where required
- Permissions complete
- Audit complete
- Events complete
- Tests passing
- Browser validation passing
- Documentation updated
- No TODO placeholders remain

Forbidden anti-patterns:

- Business logic inside React
- SQL inside controllers
- Permission checks only in UI
- Hidden global state
- Circular dependencies
- Copy-pasted business rules
- Silent exception swallowing
- Magic numbers
- Temporary hacks without follow-up

## Final Design Principle

Kuhik is built on one fundamental belief: software should remove operational complexity, not create it.

Every architectural decision, line of code, test, document, and future feature must support that belief.
