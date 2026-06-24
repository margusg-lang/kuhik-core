// kuhik-core/backend/prisma/seed/base/demo-buildings.ts
// Creates 2 buildings for Demo Ühistu

import { createBuilding } from "../utils/helpers.js";
import { setSeedIds, getSeedIds } from "../utils/ids.js";

import { getPrisma } from "../utils/db.js";

export async function seedDemoBuildings(): Promise<string[]> {
  const prisma = getPrisma();
  const { tenantId } = getSeedIds();
  if (!tenantId) throw new Error("tenantId not set — run seedDemoOrg first");

  // Idempotency: check if buildings already exist
  const existingBuildings = await prisma.building.findMany({ where: { tenantId }, orderBy: { name: "asc" } });
  if (existingBuildings.length >= 2) {
    const buildingIds = existingBuildings.map((b) => b.id);
    console.log(`  Buildings already exist (${existingBuildings.length}) — skipping`);
    setSeedIds({ buildingIds });
    return buildingIds;
  }

  console.log("[seed] Creating buildings...");

  const buildingA = await createBuilding({
    tenantId,
    name: "Pärnu mnt 10",
    address: "Pärnu mnt 10, Tallinn 10148",
    type: "apartment_building",
  });
  console.log(`  Building A: ${buildingA.id} (${buildingA.name})`);

  const buildingB = await createBuilding({
    tenantId,
    name: "Pärnu mnt 12",
    address: "Pärnu mnt 12, Tallinn 10149",
    type: "apartment_building",
  });
  console.log(`  Building B: ${buildingB.id} (${buildingB.name})`);

  const buildingIds = [buildingA.id, buildingB.id];
  setSeedIds({ buildingIds });

  return buildingIds;
}
