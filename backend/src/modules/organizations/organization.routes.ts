// kuhik-core/backend/src/modules/organizations/organization.routes.ts
// Organization CRUD routes — protected by JWT auth

import { FastifyInstance } from 'fastify';
import {
  listOrganizations,
  getOrganization,
  createOrganization,
  updateOrganization,
} from './organization.service.js';
import { createOrganizationSchema, updateOrganizationSchema } from './organization.schema.js';

export async function registerOrganizationRoutes(app: FastifyInstance): Promise<void> {
  // All routes require authentication
  app.addHook('preHandler', app.authenticate);

  // GET /api/v1/organizations — list user's organizations
  app.get('/api/v1/organizations', async (request, reply) => {
    const orgs = await listOrganizations(request.userId);
    return reply.send({ success: true, data: orgs });
  });

  // GET /api/v1/organizations/:id — get single organization
  app.get('/api/v1/organizations/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const org = await getOrganization(id, request.userId);
    return reply.send({ success: true, data: org });
  });

  // POST /api/v1/organizations — create new organization
  app.post('/api/v1/organizations', async (request, reply) => {
    const body = createOrganizationSchema.parse(request.body);
    const org = await createOrganization(body, request.userId);
    return reply.status(201).send({ success: true, data: org });
  });

  // PUT /api/v1/organizations/:id — update organization
  app.put('/api/v1/organizations/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = updateOrganizationSchema.parse(request.body);
    const org = await updateOrganization(id, body, request.userId);
    return reply.send({ success: true, data: org });
  });
}