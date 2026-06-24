// kuhik-core/backend/prisma/seed/base/demo-meters.ts
// Creates resource types + apartment meters with realistic readings
// Each apartment gets a WATER and an ELECTRICITY meter

import {
  createResourceType,
  createApartmentMeter,
  createApartmentMeterReading,
} from "../utils/helpers.js";
import { setSeedIds, getSeedIds } from "../utils/ids.js";

// Each entry: unit, initialReading, monthlyConsumption
// Even indexes = WATER (m3), Odd indexes = ELECTRICITY (kWh)
const meterConfigs: { unit: string; initialReading: number; monthlyConsumption: number }[] = [
  { unit: "m3", initialReading: 1250, monthlyConsumption: 8 },    // apt 0: A-1 — WATER
  { unit: "kWh", initialReading: 8900, monthlyConsumption: 120 }, // apt 0: A-1 — ELECTRICITY
  { unit: "m3", initialReading: 980, monthlyConsumption: 12 },    // apt 1: A-2 — WATER
  { unit: "kWh", initialReading: 12500, monthlyConsumption: 180 },// apt 1: A-2 — ELECTRICITY
  { unit: "m3", initialReading: 1100, monthlyConsumption: 10 },   // apt 2: A-3 — WATER
  { unit: "kWh", initialReading: 7600, monthlyConsumption: 150 }, // apt 2: A-3 — ELECTRICITY
  { unit: "m3", initialReading: 1450, monthlyConsumption: 15 },   // apt 3: A-4 — WATER
  { unit: "kWh", initialReading: 15800, monthlyConsumption: 220 },// apt 3: A-4 — ELECTRICITY
  { unit: "m3", initialReading: 780, monthlyConsumption: 6 },     // apt 4: A-5 — WATER
  { unit: "kWh", initialReading: 5400, monthlyConsumption: 90 },  // apt 4: A-5 — ELECTRICITY
  { unit: "m3", initialReading: 1050, monthlyConsumption: 9 },    // apt 5: B-1 — WATER
  { unit: "kWh", initialReading: 6800, monthlyConsumption: 130 }, // apt 5: B-1 — ELECTRICITY
  { unit: "m3", initialReading: 1350, monthlyConsumption: 11 },   // apt 6: B-2 — WATER
  { unit: "kWh", initialReading: 11200, monthlyConsumption: 200 },// apt 6: B-2 — ELECTRICITY
  { unit: "m3", initialReading: 920, monthlyConsumption: 7 },     // apt 7: B-3 — WATER
  { unit: "kWh", initialReading: 6100, monthlyConsumption: 110 }, // apt 7: B-3 — ELECTRICITY
];

export async function seedDemoMeters(): Promise<{
  resourceTypeIds: string[];
  apartmentMeterIds: string[];
}> {
  const { tenantId, buildingIds, apartmentIds } = getSeedIds();
  if (!tenantId) throw new Error("tenantId not set");
  if (!buildingIds || buildingIds.length === 0) throw new Error("buildingIds not set");
  if (!apartmentIds || apartmentIds.length === 0) throw new Error("apartmentIds not set — run seedDemoApartments first");

  console.log("[seed] Creating resource types...");

  // Create resource types (per building)
  const resourceTypeIds: string[] = [];
  for (const bId of buildingIds) {
    const water = await createResourceType({
      tenantId,
      buildingId: bId,
      name: "Vesi",
      code: `WATER-${bId.slice(-6)}`,
      category: "utility",
      unitLabel: "m³",
    });
    resourceTypeIds.push(water.id);

    const electricity = await createResourceType({
      tenantId,
      buildingId: bId,
      name: "Elekter",
      code: `ELECTRICITY-${bId.slice(-6)}`,
      category: "utility",
      unitLabel: "kWh",
    });
    resourceTypeIds.push(electricity.id);
    console.log(`  Resource types for building ${bId.slice(-6)}: WATER, ELECTRICITY`);
  }

  setSeedIds({ resourceTypeIds });

  console.log("[seed] Creating apartment meters and readings...");

  const apartmentMeterIds: string[] = [];

  for (let aptIdx = 0; aptIdx < apartmentIds.length; aptIdx++) {
    const aptId = apartmentIds[aptIdx];
    const baseIdx = aptIdx * 2;

    // WATER meter
    const waterCfg = meterConfigs[baseIdx];
    const waterMeter = await createApartmentMeter({
      tenantId,
      apartmentId: aptId,
      meterType: "water",
      unit: "m3",
      serialNumber: `WTR-${String(aptIdx + 1).padStart(3, "0")}`,
      label: `Veearvesti korter ${aptIdx + 1}`,
    });
    apartmentMeterIds.push(waterMeter.id);

    // 6 months of historical readings for WATER
    for (let month = 5; month >= 0; month--) {
      const readingDate = new Date(2026, 0 + month, 15);
      const monthsSinceStart = 5 - month;
      const readingValue =
        waterCfg.initialReading +
        waterCfg.monthlyConsumption * (6 - monthsSinceStart) -
        waterCfg.monthlyConsumption * monthsSinceStart;
      await createApartmentMeterReading({
        meterId: waterMeter.id,
        tenantId,
        value: Math.round(readingValue * 100) / 100,
        timestamp: readingDate,
        source: "manual",
      });
    }

    // ELECTRICITY meter
    const elecCfg = meterConfigs[baseIdx + 1];
    const elecMeter = await createApartmentMeter({
      tenantId,
      apartmentId: aptId,
      meterType: "electricity",
      unit: "kWh",
      serialNumber: `ELC-${String(aptIdx + 1).padStart(3, "0")}`,
      label: `Elektrarvesti korter ${aptIdx + 1}`,
    });
    apartmentMeterIds.push(elecMeter.id);

    // 6 months of historical readings for ELECTRICITY
    for (let month = 5; month >= 0; month--) {
      const readingDate = new Date(2026, 0 + month, 15);
      const monthsSinceStart = 5 - month;
      const readingValue =
        elecCfg.initialReading +
        elecCfg.monthlyConsumption * (6 - monthsSinceStart) -
        elecCfg.monthlyConsumption * monthsSinceStart;
      await createApartmentMeterReading({
        meterId: elecMeter.id,
        tenantId,
        value: Math.round(readingValue * 100) / 100,
        timestamp: readingDate,
        source: "manual",
      });
    }

    console.log(
      `  Meters for apt ${aptIdx + 1}: WATER (last: ${waterCfg.initialReading}m³), ` +
        `ELECTRICITY (last: ${elecCfg.initialReading}kWh)`
    );
  }

  setSeedIds({ apartmentMeterIds });
  return { resourceTypeIds, apartmentMeterIds };
}