// kuhik-core/backend/src/modules/payments/payments.service.ts
// Strict payment tracking — only records payments and updates invoice status

import { prisma } from '../../index.js';
import { requireTenantAccess } from '../../lib/authz.js';
import { AppError } from '../../plugins/error-handler.js';
import type { CreatePaymentInput } from './payments.schema.js';

async function recalcInvoiceStatus(invoiceId: string) {
  const invoice = await prisma.kuhikInvoice.findUnique({
    where: { id: invoiceId },
    include: { payments: { select: { amount: true } } },
  });
  if (!invoice) return;

  const totalPaid = invoice.payments.reduce((sum, p) => sum + p.amount, 0);
  let status: string;
  if (totalPaid <= 0) status = 'issued';
  else if (totalPaid < invoice.totalAmount) status = 'partially_paid';
  else status = 'paid';

  await prisma.kuhikInvoice.update({
    where: { id: invoiceId },
    data: { status },
  });
}

export async function addPayment(invoiceId: string, input: CreatePaymentInput, userId: string) {
  const invoice = await prisma.kuhikInvoice.findUnique({ where: { id: invoiceId } });
  if (!invoice) throw new AppError(404, 'NOT_FOUND', 'Arvet ei leitud');
  await requireTenantAccess(invoice.tenantId, userId);

  const payment = await prisma.kuhikPayment.create({
    data: {
      invoiceId,
      amount: input.amount,
      method: input.method || 'bank_transfer',
      reference: input.reference || null,
    },
  });

  await recalcInvoiceStatus(invoiceId);
  return payment;
}

export async function listInvoicePayments(invoiceId: string, userId: string) {
  const invoice = await prisma.kuhikInvoice.findUnique({ where: { id: invoiceId } });
  if (!invoice) throw new AppError(404, 'NOT_FOUND', 'Arvet ei leitud');
  await requireTenantAccess(invoice.tenantId, userId);

  return prisma.kuhikPayment.findMany({
    where: { invoiceId },
    orderBy: { paidAt: 'desc' },
  });
}

export async function listAllPayments(tenantId: string, userId: string) {
  await requireTenantAccess(tenantId, userId);
  return prisma.kuhikPayment.findMany({
    where: { invoice: { tenantId } },
    include: { invoice: { select: { invoiceNumber: true, apartmentId: true } } },
    orderBy: { paidAt: 'desc' },
  });
}