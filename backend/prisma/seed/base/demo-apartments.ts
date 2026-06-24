// kuhik-core/backend/prisma/seed/base/demo-apartments.ts
// Creates 8 apartments across 2 buildings with realistic values

import { createApartment } from "../utils/helpers.js";
import { setSeedIds, getSeedIds } from "../utils/ids.js";

export async function seedDemoApartments(): Promise<string[]> {
  const { tenantId, buildingIds } = getSeedIds();
  if (!tenantId) throw new Error("tenantId not set");
  if (!buildingIds || buildingIds.length < 2) throw new Error("buildingIds not set — run seedDemoBuildings first");

  const [bA, bB] = buildingIds;
  console.log("[seed] Creating apartments...");

  // Building A (Pärnu mnt 10) — 5 apartments
  const aptsA = [
    { unit: "1", floor: 1, area: 45.5, heated: 42.0, calc: 44.0, share: 0.125 },
    { unit: "2", floor: 1, area: 62.0, heated: 58.0, calc: 60.0, share: 0.150 },
    { unit: "3", floor: 2, area: 55.0, heated: 52.0, calc: 53.5, share: 0.140 },
    { unit: "4", floor: 2, area: 78.0, heated: 72.0, calc: 75.0, share: 0.185 },
    { unit: "5", floor: 3, area: 35.0, heated: 33.0, calc: 34.0, share: 0.100 },
  ];

  // Building B (Pärnu mnt 12) — 3 apartments
  const aptsB = [
    { unit: "1", floor: 1, area: 52.0, heated: 48.0, calc: 50.0, share: 0.100 },
    { unit: "2", floor: 2, area: 68.0, heated: 64.0, calc: 66.0, share: 0.120 },
    { unit: "3", floor: 3, area: 42.0, heated: 39.0, calc: 41.0, share: 0.080 },
  ];

  const allApts = [
    ...aptsA.map((a) => ({
      ...a,
      tenantId,
      buildingId: bA,
      unitLabel: `A-${a.unit}`,
    })),
    ...aptsB.map((a) => ({
      ...a,
      tenantId,
      buildingId: bB,
      unitLabel: `B-${a.unit}`,
    })),
  ];

  const apartmentIds: string[] = [];
  for (const apt of allApts) {
    const created = await createApartment({
      tenantId: apt.tenantId,
      buildingId: apt.buildingId,
      unitLabel: apt.unitLabel,
      floor: apt.floor,
      areaSqm: apt.area,
      heatedAreaSqm: apt.heated,
      calculatedAreaSqm: apt.calc,
      occupancy: 2,
      ownershipShare: apt.share,
    });
    apartmentIds.push(created.id);
    console.log(`  Apartment: ${created.unitLabel} (${apt.area}m², floor ${apt.floor})`);
  }

  setSeedIds({ apartmentIds });
  return apartmentIds;
}