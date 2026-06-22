# Wave 3 Status — Metering Data Layer

## What Wave 3 delivers

A logged-in manager/admin can:

1. Open an apartment → access "Arvestid" section
2. View all meters for that apartment (type, unit, serial number, label)
3. Add a new meter (type: water/electricity/heating/gas, unit: m³/kWh/MWh)
4. Open a meter → see its detail + reading history
5. Add a reading (numeric value, auto-timestamped)
6. View readings in chronological order (newest first)
7. All data org-scoped (same authz layer as Wave 1+2)

## What it explicitly does NOT include

- ❌ No utility cost tracking
- ❌ No billing or invoice logic
- ❌ No payment processing
- ❌ No allocation or split logic
- ❌ No consumption pricing
- ❌ No financial calculations
- ❌ No dashboards or charts
- ❌ No anomaly detection

Wave 3 is a pure measurement/sensor layer.

## Backend modules and routes

### ApartmentMeters module — 4 endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/apartments/:aptId/meters` | List meters for apartment |
| GET | `/api/v1/meters/:id` | Get single meter |
| POST | `/api/v1/apartments/:aptId/meters` | Create meter |
| PUT | `/api/v1/meters/:id` | Update meter |

### MeterReadings module — 3 endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/meters/:meterId/readings` | List readings by meter |
| GET | `/api/v1/apartments/:aptId/readings` | List readings by apartment |
| POST | `/api/v1/meters/:meterId/readings` | Create reading |

### Total Wave 3 endpoints: 7
### Cumulative API endpoints: 27 (Wave 0: 2 + Wave 1: 10 + Wave 2: 8 + Wave 3: 7)

## Prisma schema changes

**New models (clean, no billing coupling):**
- `ApartmentMeter` — meterType (enum), unit (m3/kWh/MWh), serialNumber, label, isActive
- `ApartmentMeterReading` — value (Float), timestamp (DateTime), source (manual/import)

**Legacy models preserved unchanged:**
- `Meter` — linked to ResourceType, kept for backward compatibility
- `MeterReading` — linked to legacy Meter, includes anomaly fields

## Frontend pages added

| Route | Description |
|-------|-------------|
| `/haldur/uhistud/[id]/hooned/[buildingId]/korter/[aptId]/arvestid` | Meters list + create form |
| `/haldur/uhistud/[id]/hooned/[buildingId]/korter/[aptId]/arvestid/[meterId]` | Meter detail + reading history |

## Files created in Wave 3

```
backend/src/modules/apartment-meters/meter.schema.ts     (NEW — 20 lines)
backend/src/modules/apartment-meters/meter.service.ts    (NEW — 60 lines)
backend/src/modules/apartment-meters/meter.routes.ts     (NEW — 42 lines)
backend/src/modules/meter-readings/reading.schema.ts     (NEW — 11 lines)
backend/src/modules/meter-readings/reading.service.ts    (NEW — 50 lines)
backend/src/modules/meter-readings/reading.routes.ts     (NEW — 35 lines)
frontend/src/app/.../korter/[aptId]/arvestid/page.tsx           (NEW — 118 lines)
frontend/src/app/.../korter/[aptId]/arvestid/[meterId]/page.tsx (NEW — 112 lines)
docs/WAVE3_MIGRATION_LOG.md                              (NEW)
docs/WAVE3_STATUS.md                                     (NEW — this file)
```

**Files updated:**
- `backend/prisma/schema.prisma` — added ApartmentMeter + ApartmentMeterReading
- `backend/src/index.ts` — registered meter + reading routes

## Total repo: ~59 files

## Billing/cost check
All new files verified: zero references to cost, invoice, allocation, payment, price, billingPeriod, or currency.

## What was deferred

| Feature | Planned wave |
|---------|-------------|
| Consumption calculation | Wave 4 (billing prep) |
| Anomaly detection | Wave 4+ |
| Reading prognosis | Wave 4+ |
| Owner portal reading input | Wave 5+ |
| Meter reading reminders | Wave 6+ |

## Recommended Wave 4 scope

1. **Utility costs** — supplier invoice recording per organization
2. **Cost allocation engine** — distribute costs across apartments by rules