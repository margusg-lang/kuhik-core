// kuhik-core/backend/src/modules/people/person.service.ts

import { prisma } from '../../index.js';
import { requireTenantAccess, requireTenantAdmin, assertTenantScope } from '../../lib/authz.js';
import { AppError } from '../../plugins/error-handler.js';
import type {
  CreatePersonInput,
  UpdatePersonInput,
  CreateApartmentPersonInput,
  UpdateApartmentPersonInput,
} from './person.schema.js';

// ============================================================
// PERSON CRUD
// ============================================================

export async function listPeople(tenantId: string, userId: string) {
  await requireTenantAccess(tenantId, userId);
  return prisma.person.findMany({
    where: { tenantId, isActive: true },
    orderBy: { fullName: 'asc' },
  });
}

export async function getPerson(id: string, userId: string) {
  const person = await prisma.person.findUnique({
    where: { id },
    include: {
      apartments: {
        include: { apartment: true },
        orderBy: { createdAt: 'desc' },
      },
    },
  });
  if (!person) throw new AppError(404, 'NOT_FOUND', 'Isikut ei leitud');
  await assertTenantScope(person.tenantId, userId);
  return person;
}

export async function createPerson(tenantId: string, input: CreatePersonInput, userId: string) {
  await requireTenantAdmin(tenantId, userId);
  const person = await prisma.person.create({
    data: {
      tenantId,
      fullName: input.fullName,
      email: input.email || null,
      phone: input.phone || null,
      personalCode: input.personalCode || null,
      notes: input.notes || null,
    },
  });
  return person;
}

export async function updatePerson(id: string, input: UpdatePersonInput, userId: string) {
  const person = await prisma.person.findUnique({ where: { id } });
  if (!person) throw new AppError(404, 'NOT_FOUND', 'Isikut ei leitud');
  await requireTenantAdmin(person.tenantId, userId);

  const updated = await prisma.person.update({
    where: { id },
    data: {
      fullName: input.fullName,
      email: input.email,
      phone: input.phone,
      personalCode: input.personalCode,
      notes: input.notes,
      isActive: input.isActive,
    },
  });
  return updated;
}

// ============================================================
// APARTMENT-PERSON RELATIONS
// ============================================================

export async function listApartmentPeople(apartmentId: string, userId: string) {
  const apartment = await prisma.apartment.findUnique({ where: { id: apartmentId } });
  if (!apartment) throw new AppError(404, 'NOT_FOUND', 'Korterit ei leitud');
  await requireTenantAccess(apartment.tenantId, userId);

  return prisma.apartmentPerson.findMany({
    where: { apartmentId },
    include: { person: true },
    orderBy: [{ isPrimary: 'desc' }, { createdAt: 'desc' }],
  });
}

export async function addApartmentPerson(apartmentId: string, input: CreateApartmentPersonInput, userId: string) {
  const apartment = await prisma.apartment.findUnique({ where: { id: apartmentId } });
  if (!apartment) throw new AppError(404, 'NOT_FOUND', 'Korterit ei leitud');
  await requireTenantAdmin(apartment.tenantId, userId);

  // Verify person exists and belongs to same tenant
  const person = await prisma.person.findUnique({ where: { id: input.personId } });
  if (!person || person.tenantId !== apartment.tenantId) {
    throw new AppError(400, 'INVALID_PERSON', 'Isikut ei leitud selles organisatsioonis');
  }

  // Check for duplicate
  const existing = await prisma.apartmentPerson.findUnique({
    where: { apartmentId_personId_relationshipType: { apartmentId, personId: input.personId, relationshipType: input.relationshipType } },
  });
  if (existing) throw new AppError(409, 'DUPLICATE', 'See isik on juba selle seosega korteriga seotud');

  const relation = await prisma.apartmentPerson.create({
    data: {
      tenantId: apartment.tenantId,
      apartmentId,
      personId: input.personId,
      relationshipType: input.relationshipType,
      isPrimary: input.isPrimary || false,
      validFrom: input.validFrom ? new Date(input.validFrom) : null,
      validTo: input.validTo ? new Date(input.validTo) : null,
    },
    include: { person: true },
  });
  return relation;
}

export async function updateApartmentPerson(id: string, input: UpdateApartmentPersonInput, userId: string) {
  const relation = await prisma.apartmentPerson.findUnique({
    where: { id },
    include: { apartment: true, person: true },
  });
  if (!relation) throw new AppError(404, 'NOT_FOUND', 'Seost ei leitud');
  await requireTenantAdmin(relation.tenantId, userId);

  const updated = await prisma.apartmentPerson.update({
    where: { id },
    data: {
      relationshipType: input.relationshipType,
      isPrimary: input.isPrimary,
      validFrom: input.validFrom ? new Date(input.validFrom) : undefined,
      validTo: input.validTo ? new Date(input.validTo) : undefined,
    },
    include: { person: true },
  });
  return updated;
}

export async function removeApartmentPerson(id: string, userId: string) {
  const relation = await prisma.apartmentPerson.findUnique({
    where: { id },
    include: { apartment: true },
  });
  if (!relation) throw new AppError(404, 'NOT_FOUND', 'Seost ei leitud');
  await requireTenantAdmin(relation.tenantId, userId);

  await prisma.apartmentPerson.delete({ where: { id } });
  return { success: true };
}