// kuhik-core/backend/prisma/seed/scenarios/tenant-change.ts
// Tenant change scenario: remove person from apartment, add new one, preserve history

import { createPerson, linkPersonApartment, createOwnershipHistory } from "../utils/helpers.js";
import { getSeedIds, setSeedIds } from "../utils/ids.js";

export async function seedTenantChange(): Promise<void> {
  const { tenantId, apartmentIds, personIds } = getSeedIds();
  if (!tenantId) throw new Error("tenantId not set");
  if (!apartmentIds || apartmentIds.length < 2) throw new Error("apartmentIds not set");
  if (!personIds || personIds.length < 2) throw new Error("personIds not set — run base seed first");

  console.log("[scenario] Tenant change — simulating resident move...");

  // Scenario: Apartment index 0 (A-1) gets a new resident
  // Old resident (Mari Maasikas) moves out
  // New resident moves in

  const targetAptId = apartmentIds[0];
  const oldPersonId = personIds[0]; // Mari Maasikas

  // End the old resident's relationship
  await linkPersonApartment({
    tenantId,
    apartmentId: targetAptId,
    personId: oldPersonId,
    relationshipType: "RESIDENT",
    isPrimary: false,
    validFrom: new Date("2020-01-01"),
    validTo: new Date("2026-05-31"), // moved out
  });
  console.log(`  Old link ended: person ${personIds[0]} → apt ${targetAptId} (valid_to: 2026-05-31)`);

  // End ownership history for old owner
  await createOwnershipHistory({
    tenantId,
    apartmentId: targetAptId,
    ownerId: oldPersonId,
    ownerName: "Mari Maasikas",
    share: 1.0,
    startDate: new Date("2020-01-01"),
    endDate: new Date("2026-05-31"),
    isCurrent: false,
    reason: "sale",
  });
  console.log(`  Old ownership ended: Mari Maasikas moved out`);

  // Create new person (new resident)
  const newPerson = await createPerson({
    tenantId,
    fullName: "Kalle Karu",
    email: "kalle@example.ee",
    phone: "+37259999999",
    personalCode: "37809091234",
  });
  console.log(`  New person: ${newPerson.fullName} (${newPerson.id})`);

  // Link new person to apartment as owner
  await linkPersonApartment({
    tenantId,
    apartmentId: targetAptId,
    personId: newPerson.id,
    relationshipType: "OWNER",
    isPrimary: true,
    validFrom: new Date("2026-06-01"), // moved in
  });
  console.log(`  New link: ${newPerson.fullName} → ${targetAptId} (from 2026-06-01)`);

  // New ownership history
  await createOwnershipHistory({
    tenantId,
    apartmentId: targetAptId,
    ownerId: newPerson.id,
    ownerName: "Kalle Karu",
    share: 1.0,
    startDate: new Date("2026-06-01"),
    isCurrent: true,
    reason: "purchase",
  });
  console.log(`  New ownership: ${newPerson.fullName} current owner`);

  // Update seed IDs
  setSeedIds({ personIds: [...personIds, newPerson.id] });

  console.log("[scenario] Tenant change complete");
}