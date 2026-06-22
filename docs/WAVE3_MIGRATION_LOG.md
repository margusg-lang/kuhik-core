# Wave 3 Migration Log — Metering Data Layer

## Summary

Wave 3 adds pure measurement models: ApartmentMeter and ApartmentMeterReading. No billing, cost, allocation, or invoice logic.

## Migration Actions

### Prisma Schema

| Item | Source | Destination | Action | Notes |
|------|--------|-------------|--------|-------|
| ApartmentMeter model | New | `backend/prisma/schema.prisma` | CREATED | Pure measurement: meterType, unit, serialNumber, label. Linked to Apartment + Tenant. |
| ApartmentMeterReading model | New | `backend/prisma/schema.prisma` | CREATED | Pure reading: value, timestamp, source. No cost/price fields. Unique index on (meterId, timestamp). |
| Existing legacy Meter/MeterReading | Kept | `backend/prisma/schema.prisma` | KEPT | Legacy models preserved. Not used by Wave 3. |

### Backend: Apartment Meters module

| Item | Source | Destination | Action | Notes |
|------|--------|-------------|--------|-------|
| Meter schema | New | `backend/src/modules/apartment-meters/meter.schema.ts` | CREATED | Zod: meterType enum (water/electricity/heating/gas), unit enum (m3/kWh/MWh), serialNumber, label |
| Meter service | New | `backend/src/modules/apartment-meters/meter.service.ts` | CREATED | CRUD + list by apartment. Org-scoped via authz helpers. |
| Meter routes | New | `backend/src/modules/apartment-meters/meter.routes.ts` | CREATED | 4 endpoints: GET list, GET by id, POST create, PUT update |

### Backend: Meter Readings module

| Item | Source | Destination | Action | Notes |
|------|--------|-------------|--------|-------|
| Reading schema | New | `backend/src/modules/meter-readings/reading.schema.ts` | CREATED | Zod: value (positive number), timestamp (optional), source (manual/import) |
| Reading service | New | `backend/src/modules/meter-readings/reading.service.ts` | CREATED | Create, list by meter, list by apartment (via meter join). Org-scoped. |
| Reading routes | New | `backend/src/modules/meter-readings/reading.routes.ts` | CREATED | 3 endpoints: GET list by meter, GET list by apartment, POST create |

### Backend: Route registration

| Item | Source | Destination | Action | Notes |
|------|--------|-------------|--------|-------|
| index.ts | `backend/src/index.ts` | `backend/src/index.ts` | UPDATED | Added registerMeterRoutes + registerReadingRoutes |

### Frontend: Pages

| Item | Source | Destination | Action | Notes |
|------|--------|-------------|--------|-------|
| Apartment meters list | New | `frontend/src/app/haldur/uhistud/[id]/hooned/[buildingId]/korter/[aptId]/arvestid/page.tsx` | CREATED | List meters per apartment. Inline create form with type/unit/SN/label. |
| Meter detail + readings | New | `frontend/src/app/haldur/uhistud/[id]/hooned/[buildingId]/korter/[aptId]/arvestid/[meterId]/page.tsx` | CREATED | Meter info + reading input + reading history table. |

## Billing/cost/invoice check

Searched all new files for forbidden terms: cost, invoice, allocation, payment, price, billingPeriod, currency. None found.