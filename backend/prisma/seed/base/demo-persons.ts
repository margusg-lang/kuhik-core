// kuhik-core/backend/prisma/seed/base/demo-persons.ts
// Creates 8 people and links them to apartments
// Each apartment gets 1 primary resident/owner

import { createPerson, linkPersonApartment, createOwnershipHistory } from "../utils/helpers.js";
import { setSeedIds, getSeedIds } from "../utils/ids.js";

interface PersonInput {
  fullName: string;
  email: string;
  phone: string;
  personalCode: string;
}

interface LinkInput {
  name: string;
  aptIndex: number; // index into apartmentIds
  relationshipType: "OWNER" | "RESIDENT";
  isPrimary: boolean;
}

const people: PersonInput[] = [
  { fullName: "Mari Maasikas", email: "mari@example.ee", phone: "+37251111111", personalCode: "48001011234" },
  { fullName: "Jaan Jõgi", email: "jaan@example.ee", phone: "+37252222222", personalCode: "37502021234" },
  { fullName: "Kadri Kask", email: "kadri@example.ee", phone: "+37253333333", personalCode: "48503031234" },
  { fullName: "Peeter Pärn", email: "peeter@example.ee", phone: "+37254444444", personalCode: "37404041234" },
  { fullName: "Liisa Lill", email: "liisa@example.ee", phone: "+37255555555", personalCode: "49005051234" },
  { fullName: "Toomas Tamm", email: "toomas@example.ee", phone: "+37256666666", personalCode: "37306061234" },
  { fullName: "Anu Ader", email: "anu@example.ee", phone: "+37257777777", personalCode: "48707071234" },
  { fullName: "Margus Mets", email: "margus@example.ee", phone: "+37258888888", personalCode: "37608081234" },
];

const links: LinkInput[] = [
  { name: "Mari Maasikas", aptIndex: 0, relationshipType: "OWNER", isPrimary: true },
  { name: "Jaan Jõgi", aptIndex: 1, relationshipType: "OWNER", isPrimary: true },
  { name: "Kadri Kask", aptIndex: 2, relationshipType: "OWNER", isPrimary: true },
  { name: "Peeter Pärn", aptIndex: 3, relationshipType: "OWNER", isPrimary: true },
  { name: "Liisa Lill", aptIndex: 4, relationshipType: "OWNER", isPrimary: true },
  { name: "Toomas Tamm", aptIndex: 5, relationshipType: "OWNER", isPrimary: true },
  { name: "Anu Ader", aptIndex: 6, relationshipType: "OWNER", isPrimary: true },
  { name: "Margus Mets", aptIndex: 7, relationshipType: "OWNER", isPrimary: true },
];

export async function seedDemoPersons(): Promise<{ personIds: string[]; linkIds: string[] }> {
  const { tenantId, apartmentIds } = getSeedIds();
  if (!tenantId) throw new Error("tenantId not set");
  if (!apartmentIds || apartmentIds.length === 0) throw new Error("apartmentIds not set — run seedDemoApartments first");

  console.log("[seed] Creating people...");

  const personIds: string[] = [];
  const linkIds: string[] = [];

  // Create people
  for (const p of people) {
    const person = await createPerson({
      tenantId,
      fullName: p.fullName,
      email: p.email,
      phone: p.phone,
      personalCode: p.personalCode,
    });
    personIds.push(person.id);
    console.log(`  Person: ${person.fullName} (${person.email})`);
  }

  // Link people to apartments
  for (const link of links) {
    const personIndex = people.findIndex((p) => p.fullName === link.name);
    if (personIndex === -1) throw new Error(`Person ${link.name} not found`);
    if (link.aptIndex >= apartmentIds.length) throw new Error(`Apartment index ${link.aptIndex} out of range`);

    const ap = await linkPersonApartment({
      tenantId,
      apartmentId: apartmentIds[link.aptIndex],
      personId: personIds[personIndex],
      relationshipType: link.relationshipType,
      isPrimary: link.isPrimary,
      validFrom: new Date("2020-01-01"),
    });
    linkIds.push(ap.id);

    // Add ownership history
    await createOwnershipHistory({
      tenantId,
      apartmentId: apartmentIds[link.aptIndex],
      ownerId: personIds[personIndex],
      ownerName: link.name,
      share: 1.0,
      startDate: new Date("2020-01-01"),
      isCurrent: true,
      reason: "purchase",
    });
    console.log(`  Link: ${link.name} → apartment index ${link.aptIndex} (${link.relationshipType})`);
  }

  setSeedIds({ personIds, apartmentPersonIds: linkIds });
  return { personIds, linkIds };
}