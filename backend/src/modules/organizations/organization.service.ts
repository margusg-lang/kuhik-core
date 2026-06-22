// kuhik-core/backend/src/modules/organizations/organization.service.ts
// Service layer for organization CRUD

import { prisma } from '../../index.js';
import type { CreateOrganizationInput, UpdateOrganizationInput } from './organization.schema.js';
import { AppError } from '../../plugins/error-handler.js';

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50);
}

export async function listOrganizations(userId: string) {
  // Find organizations where user is a member
  const memberships = await prisma.tenantUser.findMany({
    where: { userId, isActive: true },
    include: { tenant: true },
  });
  return memberships.map(m => ({
    id: m.tenant.id,
    name: m.tenant.name,
    slug: m.tenant.slug,
    registryCode: m.tenant.registryCode,
    address: m.tenant.address,
    contactEmail: m.tenant.contactEmail,
    contactPhone: m.tenant.contactPhone,
    role: m.role,
    isActive: m.tenant.isActive,
    createdAt: m.tenant.createdAt,
  }));
}

export async function getOrganization(id: string, userId: string) {
  const membership = await prisma.tenantUser.findFirst({
    where: { tenantId: id, userId, isActive: true },
    include: { tenant: true },
  });
  if (!membership) throw new AppError(404, 'NOT_FOUND', 'Ühistut ei leitud');
  return {
    id: membership.tenant.id,
    name: membership.tenant.name,
    slug: membership.tenant.slug,
    registryCode: membership.tenant.registryCode,
    address: membership.tenant.address,
    contactEmail: membership.tenant.contactEmail,
    contactPhone: membership.tenant.contactPhone,
    role: membership.role,
    isActive: membership.tenant.isActive,
    settings: membership.tenant.settings,
    createdAt: membership.tenant.createdAt,
    updatedAt: membership.tenant.updatedAt,
  };
}

export async function createOrganization(input: CreateOrganizationInput, userId: string) {
  const slug = input.slug || generateSlug(input.name);

  const existing = await prisma.tenant.findUnique({ where: { slug } });
  if (existing) throw new AppError(409, 'SLUG_EXISTS', 'Selle nimega ühistu on juba olemas');

  const tenant = await prisma.tenant.create({
    data: {
      name: input.name,
      slug,
      registryCode: input.registryCode || null,
      address: input.address || null,
      contactEmail: input.contactEmail || null,
      contactPhone: input.contactPhone || null,
      users: {
        create: { userId, role: 'admin' },
      },
    },
  });

  return { id: tenant.id, name: tenant.name, slug: tenant.slug };
}

export async function updateOrganization(id: string, input: UpdateOrganizationInput, userId: string) {
  const membership = await prisma.tenantUser.findFirst({
    where: { tenantId: id, userId, isActive: true, role: 'admin' },
  });
  if (!membership) throw new AppError(403, 'FORBIDDEN', 'Ainult admin saab ühistut muuta');

  const tenant = await prisma.tenant.update({
    where: { id },
    data: {
      name: input.name,
      registryCode: input.registryCode,
      address: input.address,
      contactEmail: input.contactEmail,
      contactPhone: input.contactPhone,
      isActive: input.isActive,
    },
  });

  return { id: tenant.id, name: tenant.name, slug: tenant.slug };
}