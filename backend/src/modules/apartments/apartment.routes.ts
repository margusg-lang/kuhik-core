// kuhik-core/backend/src/modules/apartments/apartment.routes.ts

import { FastifyInstance } from 'fastify';
import {
  listApartments,
  getApartment,
  createApartment,
  updateApartment,
} from './apartment.service.js';
import { createApartmentSchema, updateApartmentSchema } from './apartment.schema.js';

export async function registerApartmentRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', app.authenticate);

  // GET /api/v1/buildings/:buildingId/apartments — list apartments under building
  app.get('/api/v1/buildings/:buildingId/apartments', async (request, reply) => {
    const { buildingId } = request.params as { buildingId: string };
    const apartments = await listApartments(buildingId, request.userId);
    return reply.send({ success: true, data: apartments });
  });

  // GET /api/v1/apartments/:id — get single apartment
  app.get('/api/v1/apartments/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const apartment = await getApartment(id, request.userId);
    return reply.send({ success: true, data: apartment });
  });

  // POST /api/v1/buildings/:buildingId/apartments — create apartment under building
  app.post('/api/v1/buildings/:buildingId/apartments', async (request, reply) => {
    const { buildingId } = request.params as { buildingId: string };
    const body = createApartmentSchema.parse(request.body);
    const apartment = await createApartment(buildingId, body, request.userId);
    return reply.status(201).send({ success: true, data: apartment });
  });

  // PUT /api/v1/apartments/:id — update apartment
  app.put('/api/v1/apartments/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = updateApartmentSchema.parse(request.body);
    const apartment = await updateApartment(id, body, request.userId);
    return reply.send({ success: true, data: apartment });
  });
}