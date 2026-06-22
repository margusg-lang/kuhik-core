// kuhik-core/backend/src/modules/payments/payments.routes.ts

import { FastifyInstance } from 'fastify';
import { addPayment, listInvoicePayments, listAllPayments } from './payments.service.js';
import { createPaymentSchema } from './payments.schema.js';

export async function registerPaymentRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', app.authenticate);

  // POST /api/v1/invoices/:invoiceId/payments — add payment
  app.post('/api/v1/invoices/:invoiceId/payments', async (request, reply) => {
    const { invoiceId } = request.params as { invoiceId: string };
    const body = createPaymentSchema.parse(request.body);
    const payment = await addPayment(invoiceId, body, request.userId);
    return reply.status(201).send({ success: true, data: payment });
  });

  // GET /api/v1/invoices/:invoiceId/payments — list invoice payments
  app.get('/api/v1/invoices/:invoiceId/payments', async (request, reply) => {
    const { invoiceId } = request.params as { invoiceId: string };
    const payments = await listInvoicePayments(invoiceId, request.userId);
    return reply.send({ success: true, data: payments });
  });

  // GET /api/v1/organizations/:orgId/payments — list all payments
  app.get('/api/v1/organizations/:orgId/payments', async (request, reply) => {
    const { orgId } = request.params as { orgId: string };
    const payments = await listAllPayments(orgId, request.userId);
    return reply.send({ success: true, data: payments });
  });
}