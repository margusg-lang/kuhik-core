// kuhik-core/backend/prisma/seed/index.ts
// Main seed entrypoint — deterministic Prisma seed system
//
// Usage:
//   npx tsx prisma/seed/index.ts                    → base seed only
//   SEED_MODE=full npx tsx prisma/seed/index.ts     → base + all scenarios
//   SEED_MODE=scenario:winter-billing ...            → base + specific scenario
//   SEED_MODE=scenario:tenant-change ...             → base + specific scenario
//   SEED_MODE=scenario:late-payments ...             → base + specific scenario
//   SEED_MODE=scenario:high-consumption ...          → base + specific scenario

import { connect, disconnect, getPrisma } from "./utils/db.js";

// Base seed
import { seedDemoOrg } from "./base/demo-org.js";
import { seedDemoBuildings } from "./base/demo-buildings.js";
import { seedDemoApartments } from "./base/demo-apartments.js";
import { seedDemoPersons } from "./base/demo-persons.js";
import { seedDemoMeters } from "./base/demo-meters.js";
import { seedDemoOperations } from "./base/demo-operations.js";

// Scenario seeds
import { seedWinterBilling } from "./scenarios/winter-billing.js";
import { seedTenantChange } from "./scenarios/tenant-change.js";
import { seedLatePayments } from "./scenarios/late-payments.js";
import { seedHighConsumption } from "./scenarios/high-consumption.js";

type ScenarioName = "winter-billing" | "tenant-change" | "late-payments" | "high-consumption";

const SCENARIO_MAP: Record<ScenarioName, () => Promise<void>> = {
  "winter-billing": seedWinterBilling,
  "tenant-change": seedTenantChange,
  "late-payments": seedLatePayments,
  "high-consumption": seedHighConsumption,
};

async function runBaseSeed(): Promise<void> {
  const prisma = getPrisma();

  // Idempotency: skip if tenant already exists
  const existingTenant = await prisma.tenant.findUnique({ where: { slug: "demo-uhistu" } });
  if (existingTenant) {
    // Load existing IDs from database for scenario seeds
    const buildings = await prisma.building.findMany({ where: { tenantId: existingTenant.id }, orderBy: { name: "asc" } });
    const apartments = await prisma.apartment.findMany({ where: { tenantId: existingTenant.id }, orderBy: { unitLabel: "asc" } });
    const people = await prisma.person.findMany({ where: { tenantId: existingTenant.id }, orderBy: { fullName: "asc" } });
    const apartmentMeters = await prisma.apartmentMeter.findMany({ where: { tenantId: existingTenant.id } });
    const resourceTypes = await prisma.resourceType.findMany({ where: { tenantId: existingTenant.id } });

    const { setSeedIds } = await import("./utils/ids.js");
    setSeedIds({
      tenantId: existingTenant.id,
      buildingIds: buildings.map((b) => b.id),
      apartmentIds: apartments.map((a) => a.id),
      personIds: people.map((p) => p.id),
      apartmentMeterIds: apartmentMeters.map((m) => m.id),
      resourceTypeIds: resourceTypes.map((r) => r.id),
    });

    console.log("\n=== BASE SEED ALREADY DONE — SKIPPING ===\n");
    return;
  }

  console.log("\n========================================");
  console.log("  KUHIK SEED SYSTEM — BASE SEED");
  console.log("========================================\n");

  await seedDemoOrg();
  await seedDemoBuildings();
  await seedDemoApartments();
  await seedDemoPersons();
  await seedDemoMeters();
  await seedDemoOperations();

  console.log("\n=== BASE SEED COMPLETE ===\n");
}

async function runScenarioSeed(scenario: ScenarioName): Promise<void> {
  console.log(`\n--- Running scenario: ${scenario} ---\n`);
  await SCENARIO_MAP[scenario]();
  console.log(`\n--- Scenario ${scenario} complete ---\n`);
}

function parseSeedMode(): {
  runBase: boolean;
  scenarios: ScenarioName[];
} {
  // Support both SEED_MODE env var and --mode CLI argument (for Windows compat)
  let mode = process.env.SEED_MODE || "base";
  const args = process.argv.slice(2);
  for (const arg of args) {
    const match = arg.match(/^--mode=(.+)$/);
    if (match) {
      mode = match[1];
      break;
    }
  }

  if (mode === "base") {
    return { runBase: true, scenarios: [] };
  }

  if (mode === "full") {
    return {
      runBase: true,
      scenarios: Object.keys(SCENARIO_MAP) as ScenarioName[],
    };
  }

  const scenarioMatch = mode.match(/^scenario:(.+)$/);
  if (scenarioMatch) {
    const name = scenarioMatch[1] as ScenarioName;
    if (!SCENARIO_MAP[name]) {
      console.error(`Unknown scenario: ${name}`);
      console.error(`Available: ${Object.keys(SCENARIO_MAP).join(", ")}`);
      process.exit(1);
    }
    return { runBase: true, scenarios: [name] };
  }

  console.error(`Invalid SEED_MODE: ${mode}`);
  console.error('Valid modes: "base", "full", "scenario:<name>"');
  process.exit(1);
}

async function main(): Promise<void> {
  await connect();

  const config = parseSeedMode();

  if (config.runBase) {
    await runBaseSeed();
  }

  if (config.scenarios.length > 0) {
    for (const scenario of config.scenarios) {
      await runScenarioSeed(scenario);
    }
  }

  console.log("=== SEED COMPLETE ===");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await disconnect();
  });