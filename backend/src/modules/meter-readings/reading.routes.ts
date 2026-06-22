// kuhik-core/backend/src/modules/meter-readings/reading.routes.ts

import { FastifyInstance } from 'fastify';
import { listReadingsByMeter, listReadingsByApartment, createReading } from './reading.service.js';
import { createReadingSchema } from './reading.schema.js';

export async function registerReadingRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', app.authenticate);

  // GET /api/v1/meters/:meterId/readings — list readings for a meter
  app.get('/api/v1/meters/:meterId/readings', async (request, reply) => {
    const { meterId } = request.params as { meterId: string };
    const readings = await listReadingsByMeter(meterId, request.userId);
    return reply.send({ success: true, data: readings });
  });

  // GET /api/v1/apartments/:aptId/readings — list all readings for an apartment (across all meters)
  app.get('/api/v1/apartments/:aptId/readings', async (request, reply) => {
    const { aptId } = request.params as { aptId: string };
    const readings = await listReadingsByApartment(aptId, request.userId);
    return reply.send({ success: true, data: readings });
  });

  // POST /api/v1/meters/:meterId/readings — create a reading
  app.post('/api/v1/meters/:meterId/readings', async (request, reply) => {
    const { meterId } = request.params as { meterId: string };
    const body = createReadingSchema.parse(request.body);
    const reading = await createReading(meterId, body, request.userId);
    return reply.status(201).send({ success: true, data: reading });
  });
}