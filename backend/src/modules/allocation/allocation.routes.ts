// kuhik-core/backend/src/modules/allocation/allocation.routes.ts

import { FastifyInstance } from 'fastify';
import { runAllocation, listAllocationRuns, getAllocationRun } from './allocation.service.js';
import { runAllocationSchema } from './allocation.schema.js';

export async function registerAllocationRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', app.authenticate);

  // POST /api/v1/organizations/:orgId/allocation/run — run allocation
  app.post('/api/v1/organizations/:orgId/allocation/run', async (request, reply) => {
    const { orgId } = request.params as { orgId: string };
    const body = runAllocationSchema.parse(request.body);
    const result = await runAllocation(orgId, body, request.userId);
    return reply.send({ success: true, data: result });
  });

  // GET /api/v1/organizations/:orgId/allocation/runs — list runs
  app.get('/api/v1/organizations/:orgId/allocation/runs', async (request, reply) => {
    const { orgId } = request.params as { orgId: string };
    const runs = await listAllocationRuns(orgId, request.userId);
    return reply.send({ success: true, data: runs });
  });

  // GET /api/v1/organizations/:orgId/allocation/runs/:id — get run with items
  app.get('/api/v1/organizations/:orgId/allocation/runs/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const run = await getAllocationRun(id, request.userId);
    return reply.send({ success: true, data: run });
  });
}