// kuhik-core/backend/src/modules/invoices/invoices.routes.ts

import { FastifyInstance } from 'fastify';
import { generateInvoices, listInvoices, getInvoice, listApartmentInvoices } from './invoices.service.js';

export async function registerInvoiceRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', app.authenticate);

  // POST /api/v1/invoices/generate/:allocationRunId — generate invoices from allocation
  app.post('/api/v1/invoices/generate/:allocationRunId', async (request, reply) => {
    const { allocationRunId } = request.params as { allocationRunId: string };
    const invoices = await generateInvoices(allocationRunId, request.userId);
    return reply.send({ success: true, data: invoices });
  });

  // GET /api/v1/organizations/:orgId/invoices — list invoices for org
  app.get('/api/v1/organizations/:orgId/invoices', async (request, reply) => {
    const { orgId } = request.params as { orgId: string };
    const invoices = await listInvoices(orgId, request.userId);
    return reply.send({ success: true, data: invoices });
  });

  // GET /api/v1/invoices/:id — get invoice detail
  app.get('/api/v1/invoices/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const invoice = await getInvoice(id, request.userId);
    return reply.send({ success: true, data: invoice });
  });

  // GET /api/v1/apartments/:aptId/invoices — apartment invoice history
  app.get('/api/v1/apartments/:aptId/invoices', async (request, reply) => {
    const { aptId } = request.params as { aptId: string };
    const invoices = await listApartmentInvoices(aptId, request.userId);
    return reply.send({ success: true, data: invoices });
  });
}