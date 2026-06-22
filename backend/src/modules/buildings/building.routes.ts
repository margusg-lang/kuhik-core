// kuhik-core/backend/src/modules/buildings/building.routes.ts

import { FastifyInstance } from 'fastify';
import {
  listBuildings,
  getBuilding,
  createBuilding,
  updateBuilding,
} from './building.service.js';
import { createBuildingSchema, updateBuildingSchema } from './building.schema.js';

export async function registerBuildingRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', app.authenticate);

  // GET /api/v1/organizations/:orgId/buildings — list buildings under org
  app.get('/api/v1/organizations/:orgId/buildings', async (request, reply) => {
    const { orgId } = request.params as { orgId: string };
    const buildings = await listBuildings(orgId, request.userId);
    return reply.send({ success: true, data: buildings });
  });

  // GET /api/v1/buildings/:id — get single building
  app.get('/api/v1/buildings/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const building = await getBuilding(id, request.userId);
    return reply.send({ success: true, data: building });
  });

  // POST /api/v1/organizations/:orgId/buildings — create building under org
  app.post('/api/v1/organizations/:orgId/buildings', async (request, reply) => {
    const { orgId } = request.params as { orgId: string };
    const body = createBuildingSchema.parse(request.body);
    const building = await createBuilding(orgId, body, request.userId);
    return reply.status(201).send({ success: true, data: building });
  });

  // PUT /api/v1/buildings/:id — update building
  app.put('/api/v1/buildings/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = updateBuildingSchema.parse(request.body);
    const building = await updateBuilding(id, body, request.userId);
    return reply.send({ success: true, data: building });
  });
}