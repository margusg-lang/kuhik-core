# Korto.ee Süsteemne Analüüs — Engineering-Level Domain Reverse Engineering

**Date:** 2026-06-24  
**Method:** Live Playwright-based UI exploration of demo association "Näidisühistu 7949" (Pikk 3, Saue)  
**Scope:** Full private (korteriomanik) + PRO (haldur) views  

---

## 1. SYSTEM MAP

### 1.1 KORTO PRIVATE FLOW (korteriomanik)

```
korto.ee
├── /public                   # Landing page (hero, slides, features, pricing, testimonials)
│   ├── /public/introduction   # Feature overview
│   ├── /public/prices         # Pricing
│   ├── /public/login          # Auth entry
│   ├── /public/signup         # Registration
│   ├── /public/news-list      # News
│   ├── /public/access-control # Remote access info
│   ├── /public/remote-metering# Remote metering info
│   ├── /public/about          # About
│   └── /public/privacy|terms  # Legal
│
└── /private                   # Authenticated owner dashboard
    ├── Teated                 # Messages & issues (discussions, voting, issue tracking)
    ├── Näidud                 # Meter readings (+ history table + charts)
    ├── Arved                  # Invoices (list + PDF download)
    ├── Ühistu                 # Association overview
    │   ├── Raha /Financials   # Cash, reserves, receivables + cash flow chart
    │   └── Failid /Files      # Document repository
    ├── Tehingud               # Transactions (monthly grouped, by vendor)
    ├── Päevik                 # Calendar/events (status: planeeritud, kinnitatud, tehtud)
    ├── Läbipääsud             # Access control (key management)
    └── Seaded                 # Settings
        ├── Korter /Apartment  # Persons, roles (omanik/elanik), notifications
        └── Konto /Account     # Personal account preferences
```

### 1.2 KORTO PRO FLOW (haldur/admin)

```
pro.korto.ee                  # Admin interface (PHP-based, screen parameter routing)
│
├── Suhtlus                   # Communication management
│
├── Üldandmed                 # Master data management
│   ├── Ühistud               # Associations (CRUD)
│   ├── Majad                 # Buildings (CRUD)
│   ├── Korterid              # Apartments (CRUD)
│   ├── Arvestid              # Meters (CRUD)
│   ├── Isikud                # Persons (CRUD)
│   └── Rollid ja õigused     # Roles & permissions (RBAC)
│
├── Arveldused                # Billing engine (CORE MODULE)
│   ├── Perioodid             # Periods (monthly state machine: avatud → suletud)
│   │   ├── Kuupäevad         # Invoice date, due date terms
│   │   ├── Arved             # Invoice generation status per period
│   │   ├── Teated            # Notifications sent per period
│   │   └── Viivised          # Late fees configuration
│   ├── Kululiigid            # Cost types (with allocation rules)
│   │   ├── Classification: 010 Haldustasu, 020 Hooldustasu, 030 Prügivedu, ...
│   │   ├── Allocation basis: korteri pind (area), kõik võrdselt (equal), näidupõhine (meter-based)
│   │   ├── Pricing: fikseeritud hind (fixed) OR kuluarvete summa (invoice-based)
│   │   └── Period binding: jooksev kuu, eelmine kuu
│   ├── Osalused              # Allocation shares per apartment per cost type
│   ├── Näidud                # Meter readings in billing context
│   ├── Tulud ja kulud        # Income & expense transactions
│   ├── Kulude jaotus         # Cost allocation/distribution engine
│   ├── Arved                 # Invoices (generated per apartment)
│   ├── Laekumised            # Received payments
│   └── Saldod                # Balance per apartment (receivables)
│
├── Haldus                    # Administrative management
│
├── Raamatupidamine           # Double-entry accounting
│   ├── Kontoplaan            # Chart of accounts (vähemalt kontod, kreedit/deebet)
│   ├── Tüüpkanded            # Standard journal entries templates
│   ├── Bilanss               # Balance sheet
│   ├── Tulud-kulud           # Income statement
│   ├── Rahavood              # Cash flow
│   └── Eelarve               # Budget
│
├── Dokumendid                # Document management
│
└── Võrdlus                   # Cross-association comparison
```

---

## 2. FEATURE INVENTORY

### 2.1 COMMUNICATION & ENGAGEMENT

| Feature | Private | PRO | Notes |
|---------|---------|-----|-------|
| Discussion threads | ✅ | ✅ | Nested comments, edit/delete |
| Issue/problem tracking | ✅ | ✅ | Separate from discussions |
| Voting (hääletused) | ✅ | ✅ | Aastaaruande kinnitamine etc. |
| Email notifications | config | admin | Per-person notification prefs |
| Announcements | ✅ | ✅ | Teadetetahvel |

### 2.2 METERING & UTILITIES

| Feature | Private | PRO | Notes |
|---------|---------|-----|-------|
| Individual meters (vesi, elekter päev/öö) | ✅ | ✅ | 4 meter types in demo |
| Reading submission (manual ± buttons) | ✅ | ✅ | Derived reading indicator |
| Reading history (table) | ✅ | ✅ | Monthly data points |
| Charts/graphs (per meter) | ✅ | ✅ | Table/chart toggle |
| Time granularity (year/month/day/hour/15min) | ✅ | ✅ | Especially for electricity |
| Remote metering integration | external | ✅ | IoT meters, börsihinna rakendus |
| Consumption calculations | ✅ | ✅ | Previous - current = usage |

### 2.3 BILLING & FINANCE

| Feature | Private | PRO | Notes |
|---------|---------|-----|-------|
| Invoice list | ✅ | ✅ | Year filter, PDF download |
| Invoice PDF generation | ✅ (view) | ✅ | Hash-based secure URL |
| Period management | ✗ | ✅ | State machine (avatud → suletud) |
| Cost type catalog | ✗ | ✅ | Numbered: 010-070 |
| Cost allocation rules | ✗ | ✅ | Per cost type config |
| Cost distribution engine | ✗ | ✅ | "Jaota kulud" button |
| Payment tracking | ✗ | ✅ | Laekumised |
| Balance per apartment | ✅ (summary) | ✅ | Saldod |
| Transaction log | ✅ | ✅ | Monthly grouped |
| Cash flow visualization | ✅ | ✅ | Chart |
| Budget comparison | ✗ | ✅ | Eelarve |
| Late fees | ✗ | ✅ | Viivised |

### 2.4 ACCOUNTING

| Feature | Private | PRO | Notes |
|---------|---------|-----|-------|
| Chart of accounts | ✗ | ✅ | Kontoplaan |
| Standard entries | ✗ | ✅ | Tüüpkanded |
| Balance sheet | ✗ | ✅ | Bilanss |
| Income statement | ✗ | ✅ | Tulud-kulud |
| Cash flow statement | ✗ | ✅ | Rahavood |
| Budget | ✗ | ✅ | Eelarve |

### 2.5 ADMIN & MASTER DATA

| Feature | Private | PRO |
|---------|---------|-----|
| Association CRUD | ✗ | ✅ |
| Building CRUD | ✗ | ✅ |
| Apartment CRUD | ✗ | ✅ |
| Meter CRUD | ✗ | ✅ |
| Person CRUD | ✗ | ✅ |
| Roles & permissions | ✗ | ✅ |

---

## 3. UX ANALYSIS

### 3.1 STRONG UX PATTERNS

1. **Left sidebar navigation** — clean icon+text menu, active state clearly highlighted
2. **"Koosta" floating button** — consistent FAB across all private pages for quick compose
3. **Year navigation** — consistent `← 2026 →` controls with disabled future state
4. **Period state visualization** — "(avatud)" / "(suletud)" makes period status immediately clear
5. **Multi-granularity time views** — Year → Month → Day → Hour → 15-minute for meter data
6. **Derived reading indicator** — "Tuletatud näit" signals calculated vs manually entered
7. **Drill-down data model** — table/chart toggle + detail view on click
8. **Status badges/colors** — Kinnitatud, Tehtud, Planeeritud in calendar
9. **Responsive to context** — PRO URL encodes tenant_id + period_id + screen

### 3.2 WEAK UX PATTERNS (for Kuhik to improve)

1. **Information density** — PRO screens are extremely dense, many tables with minimal visual separation
2. **Hierarchy clarity** — Sub-tabs within PRO sections are not always visually distinct from content
3. **State feedback** — Period transitions (avatud→suletud) lack clear workflow visualization
4. **Mobile experience** — Private view is relatively clean, but PRO is clearly desktop-only
5. **Search/discovery** — No global search across all data entities
6. **Empty states** — Läbipääsud shows "Ühtegi aktiivset läbipääsu ei leitud" - adequate but minimal guidance
7. **No bulk operations** — Individual actions predominately single-row
8. **Toast/notification system** — Cookie consent is persistent modal, where elsewhere alerts dismiss
9. **Missing contextual help** — PRO has "Abi" link but it navigates away from current context
10. **No undo mechanism** — Delete operations appear to be immediate with no soft-delete indication

---

## 4. BUSINESS LOGIC MODEL

### 4.1 END-TO-END BILLING CYCLE (KORTO'S CORE DOMAIN)

```
Month M-1: Supplier invoices arrive
  ↓
PRO: Sisesta tulud ja kulud (expense transactions by vendor)
  ↓
PRO: Period M activated (avatud)
  ↓
PRO: Cost types have allocation rules configured (one-time setup)
  ├── 010 Haldustasu → fixed price × apartment area
  ├── 020 Hooldustasu → fixed price × apartment area  
  ├── 030 Prügivedu → passthrough × apartment area
  ├── 040 Raamatupidamine → passthrough ÷ equally per apartment
  ├── 050 Üldvesi → passthrough × apartment area
  ├── 051 Vesi → meter reading × unit price
  ├── 060 Üldelekter → passthrough × area
  ├── 061 Elekter (päev) → meter reading × unit price
  ├── 062 Elekter (öö) → meter reading × unit price
  └── 070 Remondifond → fixed price × apartment area
  ↓
PRO: "Jaota kulud" (Cost distribution engine)
  ── Reads period expense transactions
  ── Reads meter readings for meter-based cost types
  ── Applies allocation rules per cost type
  ── Generates allocation shares per apartment
  ── Generates individual invoices
  ↓
PRO: Invoices generated → Arved ready
  ↓
PRIVATE: Owner sees invoice in list + PDF
  ↓
PRO: Payments (Laekumised) tracked → matched to invoices
  ↓
PRO: Balance per apartment updated → Saldod
  ↓
Period M closed (suletud)
  ↓
Month M+1: Cycle repeats
```

### 4.2 STATE MACHINES IDENTIFIED

**Period State Machine:**
```
[avatud] → (kulu sisestamine, jaotus, arved) → [suletud]
```

**Event/Work Item State Machine:**
```
[planeeritud] → [kinnitatud] → [tehtud]
```

**Invoice Payment State:**
```
[esitatud] → [osaliselt laekunud] → [laekunud] / [tähtaeg ületatud] → [viivis]
```

**Meter Reading State:**
```
[manually entered] / [tuletatud (derived)] / [remote IoT reading]
```

### 4.3 ACCOUNTING MODEL

The accounting in Korto appears to support:
- **Double-entry bookkeeping** — Kontoplaan chart of accounts with standard numbering
- **Standard journal entry templates** — Tüüpkanded for recurring entries
- **Three financial statements** — Bilanss, Tulud-kulud, Rahavood
- **Budget integration** — Eelarve for planned vs actual comparison

### 4.4 DATA MODEL IMPLIED FROM UI

**Core Entities:**
```
Association (Ühistu)
├── id
├── name, type, registry_code, vat_number
├── package (pricing tier)
└── active boolean

Building (Maja)
├── association_id
├── street, city, postal_code, country
└── buildings within association

Apartment (Korter)
├── building_id
├── unit_number (e.g., "Pikk 3-10")
├── area_m2
└── ownership mapping

Person (Isik)
├── apartment_id (via ownership/residency)
├── role: omanik | elanik
├── personal_code, phone, email
├── notification preferences (readings, messages, invoices)
├── e-invoice preferences
└── paper invoice flag

Meter (Arvesti)
├── apartment_id
├── type: water_cold | water_hot | electricity_day | electricity_night
├── unit: m³ | kWh
├── remote reading capability flag
└── latest reading value

Meter Reading (Näit)
├── meter_id
├── period_id | date
├── value
├── calculated_usage
└── source: manual | derived | iot

Period (Periood)
├── association_id
├── year, month
├── status: avatud | suletud
├── invoice_date, due_date
└── late_fee_config

Cost Type (Kululiik)
├── association_id
├── code: 010, 020, ..., 070
├── name
├── period_binding: jooksev kuu | eelmine kuu
├── allocation_basis: area | equal | meter_reading
├── unit: m² | krt | m³ | kWh
├── pricing_type: fixed_price | invoice_passthrough
└── unit_price (for fixed price)

Allocation Share (Osalus)
├── cost_type_id
├── apartment_id
├── share_value (e.g., area in m²)
└── valid_from/to

Invoice (Arve)
├── association_id
├── period_id
├── apartment_id
├── number, date, due_date
├── total_amount
├── line items (cost type × allocation)
├── invoice_pdf_hash
└── status

Payment (Laekumine)
├── invoice_id
├── date, amount
├── payment_method
└── reference_number

Transaction (Tehing — Tulud ja kulud)
├── association_id
├── period_id
├── counterparty (vendor)
├── amount (debit/credit)
├── date
├── account mapping (from kontoplaan)
└── attachments

Account (Konto — from kontoplaan)
├── association_id
├── account_code, account_name
├── type: asset | liability | income | expense
└── opening_balance

Journal Entry (Tüüpkanne)
├── association_id
├── template_id
├── debit_account, credit_account
├── amount
└── period_id
```

---

## 5. KUHIK-CORE COMPARISON

### Mapping to Kuhik-core's Current Structure (derived from Wave docs & backend schema)

| Domain | Korto Feature | Kuhik-core Status | Priority |
|--------|--------------|-------------------|----------|
| **Master Data** | | | |
| | Association CRUD | ⚠️ Partially (tenant/association concept exists) | HIGH |
| | Building CRUD | ⚠️ Partially (building entity in migrations) | HIGH |
| | Apartment CRUD | ✅ EXISTS | HIGH |
| | Meter CRUD | ⚠️ Partially (meter_type, meter_device exist) | HIGH |
| | Person CRUD | ✅ EXISTS | HIGH |
| | Roles & Permissions | ⚠️ Partially (ROLE_* enums exist) | HIGH |
| **Metering** | | | |
| | Manual reading submission | ✅ EXISTS | HIGH |
| | Reading history | ✅ EXISTS | HIGH |
| | Reading charts/granularity | ❌ MISSING | MEDIUM |
| | Remote/IoT meter integration | ❌ MISSING | LOW |
| | Derived readings | ❌ MISSING | MEDIUM |
| **Billing** | | | |
| | Period management (state machine) | ⚠️ Partially (period table exists) | CRITICAL |
| | Cost type catalog | ❌ MISSING | CRITICAL |
| | Cost allocation rules | ❌ MISSING | CRITICAL |
| | Allocation engine ("Jaota kulud") | ❌ MISSING | CRITICAL |
| | Invoice generation | ⚠️ Partially (invoice create exists) | CRITICAL |
| | Invoice PDF | ⚠️ Partially (PDF gen exists in Merit) | HIGH |
| | Payment tracking | ❌ MISSING | HIGH |
| | Balance per apartment | ❌ MISSING | CRITICAL |
| | Late fees | ❌ MISSING | MEDIUM |
| **Accounting** | | | |
| | Chart of accounts | ❌ MISSING | HIGH |
| | Standard journal entries | ❌ MISSING | HIGH |
| | Balance sheet | ❌ MISSING | HIGH |
| | Income statement | ❌ MISSING | HIGH |
| | Cash flow | ⚠️ Partially (some reporting exists) | HIGH |
| | Budget | ❌ MISSING | MEDIUM |
| **Communication** | | | |
| | Discussion threads | ✅ EXISTS | HIGH |
| | Issue tracking | ✅ EXISTS | HIGH |
| | Voting | ❌ MISSING | MEDIUM |
| | Email notifications | ⚠️ Partially (email MCP exists) | HIGH |
| **UX/UI** | | | |
| | Dashboard with KPIs (raha, reservid, nõuded) | ❌ MISSING | HIGH |
| | Cash flow chart | ❌ MISSING | MEDIUM |
| | Period state visualization | ❌ MISSING | HIGH |
| | Invoice PDF download | ✅ EXISTS | HIGH |
| | FAB (floating compose button) | ❌ MISSING | LOW |
| **Integration** | | | |
| | Merit Aktiva sync | ✅ EXISTS | CRITICAL |
| | LHV LinkPay | ❌ MISSING | LOW |
| | Swedbank integration | ❌ MISSING | LOW |
| | E-invoice | ❌ MISSING | MEDIUM |
| | Email sending | ⚠️ Partially (email MCP exists) | HIGH |

**Legend:** ✅ EXISTS (fully or mostly), ⚠️ Partially (some model exists but incomplete), ❌ MISSING

---

## 6. GAP ANALYSIS & RECOMMENDATIONS

### 6.1 CRITICAL GAPS (MUST FIX BEFORE PRODUCTION)

| # | Gap | Impact | Solution |
|---|-----|--------|----------|
| 1 | **No cost type/allocation engine** | Cannot generate proper invoices | Build cost_type table, allocation_basis enum, allocation_matrix, distribution algorithm |
| 2 | **No period state machine** | No billing cycle control | Implement period status (draft → active → closed), enforce state transitions with guards |
| 3 | **No balance/receivables per apartment** | Cannot show owner's total debt | Implement running balance calculation per apartment per period |
| 4 | **No cost distribution engine** | "Jaota kulud" is the core billing function | Build allocation engine that reads expenses, applies rules, generates shares |
| 5 | **No double-entry accounting** | Cannot produce financial statements | Build chart of accounts + journal entry engine + financial reports |

### 6.2 HIGH PRIORITY (NEXT AFTER CORE)

| # | Gap | Impact | Solution |
|---|------|--------|----------|
| 1 | **Chart of accounts** | No proper financial reporting | Implement standard Estonian kontoplaan (0100-9999) |
| 2 | **Payment/matching tracking** | Cannot track who has paid | Build payment_invoice matching system |
| 3 | **Person roles & permissions granularity** | Cannot separate owner vs resident | Implement role-based access per apartment |
| 4 | **Email notification delivery** | Owners not notified of invoices | Fully integrate email MCP into billing workflow |
| 5 | **Dashboard KPIs** | No quick financial overview | Build summary cards (cash, reserves, receivables, cash flow chart) |
| 6 | **Period visualization** | Confusing billing state | Add timeline/progress visualization for current period |

### 6.3 MEDIUM PRIORITY (POST-MVP)

| # | Gap | Solution |
|---|------|----------|
| 1 | Voting/hääletus engine | Build poll model + vote recording + quorum calculation |
| 2 | Late fee automation | Implement viivis calculation based on overdue days |
| 3 | Reading charts with drill-down | Add Chart.js/Recharts for consumption visualization |
| 4 | E-invoice (e-arve) support | Integrate with Estonian e-invoice standard |
| 5 | Budget planning | Add budget vs actual comparison |
| 6 | CSV export | Implement data export (table to CSV) |
| 7 | Reading derived calculation | Auto-calculate usage from previous reading |

### 6.4 LOW PRIORITY / IGNORE

| Feature | Rationale |
|---------|-----------|
| LHV LinkPay integration | Payment method - out of core scope for now |
| Swedbank direct integration | Bank integration - complex, out of scope |
| Remote/IoT metering | Hardware level - focus on manual + API-based readings |
| Cross-association comparison (Võrdlus) | Nice-to-have analytics feature |
| Mobile app (Android/iOS) | Focus on responsive web first |
| Access control (Läbipääsud) | Physical hardware integration |
| Standard cost type library | Simple seed data suffices |

### 6.5 UX MUST-HAVES FOR KUHIK

1. **Clear period workflow visualization** — Show current step in billing cycle (expenses entered → allocated → invoiced → payments tracked)
2. **Balance dashboard cards** — Like Korto's Raha/Reservid/Nõuded summary at top of association view
3. **Status badges with colors** — Period avatud/suletud, invoice status
4. **Year/month navigation** — Consistent `← YYYY →` controls across all time-based views
5. **Meter reading with +/- buttons** — Polished input UX with derived reading hint
6. **Table + chart toggle** — For consumption data visualization
7. **Drill-down from dashboard** — Click summary card → detail view

---

## 7. DOMAIN INSIGHTS FOR KUHIK ARCHITECTURE

### 7.1 CRITICAL ARCHITECTURAL DECISIONS

```
1. Period is the CORE orchestrator
   ─ Every financial operation is scoped to a period
   ─ Period state machine drives the entire billing lifecycle
   ─ All queries (transactions, invoices, readings, balances) filter by period

2. Cost type + allocation = THE billing config
   ─ Cost types define what to bill
   ─ Allocation basis defines how to split
   ─ Meter-based allocation requires meter reading integration
   ─ Area-based requires apartment.area_m2 to always exist

3. Billing cycle flow:
   [Expenses enter] → [Allocation run] → [Invoices generated] → [Payments tracked]
   This is NOT a simple CRUD - it's a workflow engine

4. Accounting is double-entry throughout
   ─ Every transaction maps to accounts
   ─ Invoice generation creates both receivable and income entries
   ─ Payment creates cash and receivable reduction entries
```

### 7.2 KEY INSIGHTS FROM KORTO'S IMPLEMENTATION

1. **PDF invoices via hash URL** — `https://pro.korto.ee/arve/{md5_hash}` — simple secure file access
2. **Screen-based PHP routing** — `?screen=yyriarvestus.kululiigid` pattern — flat routing
3. **Period-dependent views** — Most screens require `perioodi_id` parameter
4. **CSV export built-in** — "Salvesta tabel CSV-faili" on every table
5. **Print/PDF/email actions** — Consistent toolbar on every PRO page
6. **Per-person notification matrix** — Each person has 3 checkboxes: readings, messages, invoices + e-invoice preference + paper invoice flag
7. **Two apartment roles** — "Omanik" (owner) and "Elanik" (resident) — with different permissions
8. **No document versioning visible** — Dokumendid appears to be simple file storage

### 7.3 KORTO DATA MODEL NUANCES MISSING FROM CURRENT KUHIK-CORE

1. **No electricity_time_of_day split** — Korto has day/night electricity as separate meters
2. **No area-based allocation** — Critical for Estonian apartment associations (most costs split by m²)
3. **No equal split** — For costs like accounting services split equally per apartment regardless of size
4. **No "kuluarvete summa" pricing** — Passthrough pricing where supplier invoice total can be auto-calculated per cost type
5. **No period binding** — "eelmine kuu" vs "jooksev kuu" for cost type application timing
6. **No viivis (late fee) engine** — Separate tab shows late fee configuration per period
7. **No expense attachments** — Tehingud supports "mitme manuse tugi" per news update
8. **No budget vs actual** — Eelarve is a separate accounting section

---

## 8. STRUCTURED RECOMMENDATIONS

### PHASE 1 — CORE BILLING ENGINE (IMMEDIATE)

```
1. Period State Machine
   Table: period
   Fields: id, association_id, year, month, status (draft|active|closed), invoice_date, due_date
   
2. Cost Type Model
   Table: cost_type
   Fields: id, association_id, code, name, allocation_basis (area|equal|meter|flat),
           unit, pricing_type (fixed|passthrough), unit_price, period_binding (current|previous)
           
3. Allocation Matrix
   Table: allocation_share
   Fields: id, cost_type_id, apartment_id, period_id, share_value
   
4. Cost Distribution Engine
   Algorithm:
     For each cost_type in period:
       Get period expenses for this cost type
       Get allocation shares for all apartments
       Calculate: cost per apartment = total_expense × (share / total_shares)
       Generate invoice line item per apartment

5. Balance/Receivables
   Table: receivable (or compute from invoices - payments)
   View: invoice_total - SUM(payments) = balance per apartment
```

### PHASE 2 — ACCOUNTING FOUNDATION (NEXT)

```
1. Chart of Accounts (kontoplaan)
   - Seed standard Estonian apartment association accounts
   - Link cost types to default accounts
   
2. Double-entry generation
   - On invoice creation → debit Receivables, credit Income
   - On payment → debit Cash, credit Receivables
   - On expense → debit Expense, credit Accounts Payable

3. Financial statements
   - Balance sheet = asset + liability + equity accounts with balances
   - Income statement = income - expense accounts by period
   - Cash flow = cash account movements
```

### PHASE 3 — UX & INTEGRATION (THEN)

```
1. Dashboard with period workflow visualization
2. Reading chart with drill-down
3. CSV export
4. Email notification workflow
5. Invoice PDF generation and delivery
```

---

**END OF ANALYSIS**

The core takeaway: **Korto is fundamentally a billing + accounting platform that happens to have communication features.** Kuhik-core's current implementation has the communication and basic metering in good shape, but the billing engine (cost types, allocation, period state machine, double-entry accounting) is the critical missing piece that must be built before the platform can function as a real apartment association management system.

The period-based billing cycle is the heartbeat of the entire system — everything else (dashboard, reporting, notifications, balance tracking) depends on it.