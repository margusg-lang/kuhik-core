// kuhik-core/backend/prisma/seed/utils/ids.ts
// Deterministic ID tracking — avoids hardcoded IDs while keeping references

export interface SeedIds {
  tenantId: string;
  buildingIds: string[];
  apartmentIds: string[];
  personIds: string[];
  apartmentPersonIds: string[];
  apartmentMeterIds: string[];
  resourceTypeIds: string[];
  meterIds: string[];
  userId: string;
  tenantUserId: string;
}

const ids: SeedIds = {
  tenantId: "",
  buildingIds: [],
  apartmentIds: [],
  personIds: [],
  apartmentPersonIds: [],
  apartmentMeterIds: [],
  resourceTypeIds: [],
  meterIds: [],
  userId: "",
  tenantUserId: "",
};

export function setSeedIds(partial: Partial<SeedIds>): void {
  Object.assign(ids, partial);
}

export function getSeedIds(): Readonly<SeedIds> {
  return ids;
}