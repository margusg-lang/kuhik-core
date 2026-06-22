// kuhik-core/backend/src/modules/people/person.routes.ts

import { FastifyInstance } from 'fastify';
import {
  listPeople,
  getPerson,
  createPerson,
  updatePerson,
  listApartmentPeople,
  addApartmentPerson,
  updateApartmentPerson,
  removeApartmentPerson,
} from './person.service.js';
import {
  createPersonSchema,
  updatePersonSchema,
  createApartmentPersonSchema,
  updateApartmentPersonSchema,
} from './person.schema.js';

export async function registerPersonRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', app.authenticate);

  // ============================================================
  // PEOPLE
  // ============================================================

  // GET /api/v1/organizations/:orgId/people — list people in org
  app.get('/api/v1/organizations/:orgId/people', async (request, reply) => {
    const { orgId } = request.params as { orgId: string };
    const people = await listPeople(orgId, request.userId);
    return reply.send({ success: true, data: people });
  });

  // GET /api/v1/people/:id — get person + their apartment relations
  app.get('/api/v1/people/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const person = await getPerson(id, request.userId);
    return reply.send({ success: true, data: person });
  });

  // POST /api/v1/organizations/:orgId/people — create person in org
  app.post('/api/v1/organizations/:orgId/people', async (request, reply) => {
    const { orgId } = request.params as { orgId: string };
    const body = createPersonSchema.parse(request.body);
    const person = await createPerson(orgId, body, request.userId);
    return reply.status(201).send({ success: true, data: person });
  });

  // PUT /api/v1/people/:id — update person
  app.put('/api/v1/people/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = updatePersonSchema.parse(request.body);
    const person = await updatePerson(id, body, request.userId);
    return reply.send({ success: true, data: person });
  });

  // ============================================================
  // APARTMENT-PERSON RELATIONS
  // ============================================================

  // GET /api/v1/apartments/:aptId/people — list people linked to apartment
  app.get('/api/v1/apartments/:aptId/people', async (request, reply) => {
    const { aptId } = request.params as { aptId: string };
    const relations = await listApartmentPeople(aptId, request.userId);
    return reply.send({ success: true, data: relations });
  });

  // POST /api/v1/apartments/:aptId/people — link person to apartment
  app.post('/api/v1/apartments/:aptId/people', async (request, reply) => {
    const { aptId } = request.params as { aptId: string };
    const body = createApartmentPersonSchema.parse(request.body);
    const relation = await addApartmentPerson(aptId, body, request.userId);
    return reply.status(201).send({ success: true, data: relation });
  });

  // PUT /api/v1/apartment-people/:id — update relation
  app.put('/api/v1/apartment-people/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = updateApartmentPersonSchema.parse(request.body);
    const relation = await updateApartmentPerson(id, body, request.userId);
    return reply.send({ success: true, data: relation });
  });

  // DELETE /api/v1/apartment-people/:id — remove relation
  app.delete('/api/v1/apartment-people/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = await removeApartmentPerson(id, request.userId);
    return reply.send({ success: true, data: result });
  });
}