// kuhik-core/backend/src/modules/apartment-meters/meter.routes.ts

import { FastifyInstance } from 'fastify';
import { listApartmentMeters, getMeter, createMeter, updateMeter } from './meter.service.js';
import { createMeterSchema, updateMeterSchema } from './meter.schema.js';

export async function registerMeterRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', app.authenticate);

  // GET /api/v1/apartments/:aptId/meters — list meters for apartment
  app.get('/api/v1/apartments/:aptId/meters', async (request, reply) => {
    const { aptId } = request.params as { aptId: string };
    const meters = await listApartmentMeters(aptId, request.userId);
    return reply.send({ success: true, data: meters });
  });

  // GET /api/v1/meters/:id — get single meter
  app.get('/api/v1/meters/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const meter = await getMeter(id, request.userId);
    return reply.send({ success: true, data: meter });
  });

  // POST /api/v1/apartments/:aptId/meters — create meter
  app.post('/api/v1/apartments/:aptId/meters', async (request, reply) => {
    const { aptId } = request.params as { aptId: string };
    const body = createMeterSchema.parse(request.body);
    const meter = await createMeter(aptId, body, request.userId);
    return reply.status(201).send({ success: true, data: meter });
  });

  // PUT /api/v1/meters/:id — update meter
  app.put('/api/v1/meters/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = updateMeterSchema.parse(request.body);
    const meter = await updateMeter(id, body, request.userId);
    return reply.send({ success: true, data: meter });
  });
}