// kuhik-core/backend/src/modules/utility-costs/cost.routes.ts

import { FastifyInstance } from 'fastify';
import { listCosts, getCost, createCost, updateCost, deleteCost } from './cost.service.js';
import { createCostSchema, updateCostSchema } from './cost.schema.js';

export async function registerCostRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', app.authenticate);

  // GET /api/v1/organizations/:orgId/costs — list costs for org
  app.get('/api/v1/organizations/:orgId/costs', async (request, reply) => {
    const { orgId } = request.params as { orgId: string };
    const costs = await listCosts(orgId, request.userId);
    return reply.send({ success: true, data: costs });
  });

  // GET /api/v1/utility-costs/:id — get single cost
  app.get('/api/v1/utility-costs/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const cost = await getCost(id, request.userId);
    return reply.send({ success: true, data: cost });
  });

  // POST /api/v1/organizations/:orgId/costs — create cost
  app.post('/api/v1/organizations/:orgId/costs', async (request, reply) => {
    const { orgId } = request.params as { orgId: string };
    const body = createCostSchema.parse(request.body);
    const cost = await createCost(orgId, body, request.userId);
    return reply.status(201).send({ success: true, data: cost });
  });

  // PUT /api/v1/utility-costs/:id — update cost
  app.put('/api/v1/utility-costs/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = updateCostSchema.parse(request.body);
    const cost = await updateCost(id, body, request.userId);
    return reply.send({ success: true, data: cost });
  });

  // DELETE /api/v1/utility-costs/:id — delete cost
  app.delete('/api/v1/utility-costs/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = await deleteCost(id, request.userId);
    return reply.send({ success: true, data: result });
  });
}