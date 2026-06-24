// kuhik-core/backend/src/modules/me/me.routes.ts
// Wave 8: Self-service profile — thin read-only wrapper over existing data
// No new business logic — only exposes existing User + TenantUser data

import { FastifyInstance } from 'fastify';
import { prisma } from '../../lib/prisma.js';

export async function registerMeRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', app.authenticate);

  // GET /api/v1/me/profile — authenticated user's profile + orgs
  app.get('/api/v1/me/profile', async (request, reply) => {
    const user = await prisma.user.findUnique({
      where: { id: request.userId },
      select: {
        id: true,
        name: true,
        email: true,
        tenants: {
          where: { isActive: true },
          select: {
            role: true,
            tenant: {
              select: {
                id: true,
                name: true,
                slug: true,
                registryCode: true,
                address: true,
                contactEmail: true,
                contactPhone: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      return reply.status(404).send({ success: false, error: 'Kasutajat ei leitud' });
    }

    return reply.send({
      success: true,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        organizations: user.tenants.map(t => ({
          id: t.tenant.id,
          name: t.tenant.name,
          slug: t.tenant.slug,
          registryCode: t.tenant.registryCode,
          address: t.tenant.address,
          contactEmail: t.tenant.contactEmail,
          contactPhone: t.tenant.contactPhone,
          role: t.role,
        })),
      },
    });
  });

  // GET /api/v1/me/organizations/:orgId/apartment — find resident's apartment
  // Scans ApartmentPerson → Person relations to find user's apartment
  app.get('/api/v1/me/organizations/:orgId/apartment', async (request, reply) => {
    const { orgId } = request.params as { orgId: string };

    // Find user by email match with Person
    const user = await prisma.user.findUnique({
      where: { id: request.userId },
      select: { name: true, email: true },
    });
    if (!user) {
      return reply.status(404).send({ success: false, error: 'Kasutajat ei leitud' });
    }

    // Try to find person by email first, then by name
    let person = null;
    if (user.email) {
      person = await prisma.person.findFirst({
        where: { tenantId: orgId, email: user.email, isActive: true },
        include: {
          apartments: {
            include: {
              apartment: {
                include: { building: { select: { id: true, name: true, address: true } } },
              },
            },
            orderBy: { createdAt: 'desc' },
          },
        },
      });
    }

    if (!person && user.name) {
      person = await prisma.person.findFirst({
        where: { tenantId: orgId, fullName: user.name, isActive: true },
        include: {
          apartments: {
            include: {
              apartment: {
                include: { building: { select: { id: true, name: true, address: true } } },
              },
            },
            orderBy: { createdAt: 'desc' },
          },
        },
      });
    }

    if (!person || person.apartments.length === 0) {
      return reply.send({
        success: true,
        data: null,
        message: 'Selle kasutajaga seotud korterit ei leitud',
      });
    }

    const rel = person.apartments[0];
    return reply.send({
      success: true,
      data: {
        personId: person.id,
        personName: person.fullName,
        relationshipType: rel.relationshipType,
        isPrimary: rel.isPrimary,
        apartment: {
          id: rel.apartment.id,
          unitLabel: rel.apartment.unitLabel,
          buildingId: rel.apartment.buildingId,
          building: rel.apartment.building,
          floor: rel.apartment.floor,
          areaSqm: rel.apartment.areaSqm,
          heatedAreaSqm: rel.apartment.heatedAreaSqm,
        },
      },
    });
  });
}