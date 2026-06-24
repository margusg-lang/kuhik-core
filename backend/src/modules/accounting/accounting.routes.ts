// kuhik-core/backend/src/modules/accounting/accounting.routes.ts
// Accounting API endpoints — financial reports from the journal ledger.
// Read-only — journal entries are created automatically by invoice/payment flows.
//
// Architecture: ALL data from JournalEntryLines, NEVER from live tables.
// This ensures reports are auditable and match the posted journal.

import { FastifyInstance } from 'fastify';
import { prisma } from '../../lib/prisma.js';
import { requireTenantAccess } from '../../lib/authz.js';
import { createReportsService } from './reports.service.js';

export async function registerAccountingRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', app.authenticate);

  // GET /api/v1/organizations/:orgId/accounting/trial-balance — Trial balance
  app.get('/api/v1/organizations/:orgId/accounting/trial-balance', async (request, reply) => {
    const { orgId } = request.params as { orgId: string };
    const { periodId } = request.query as { periodId?: string };
    await requireTenantAccess(orgId, request.userId);

    const reportService = createReportsService(prisma as any);
    const data = await reportService.getTrialBalance(orgId, periodId);
    return reply.send({ success: true, data });
  });

  // GET /api/v1/organizations/:orgId/accounting/balance-sheet — Balance sheet
  app.get('/api/v1/organizations/:orgId/accounting/balance-sheet', async (request, reply) => {
    const { orgId } = request.params as { orgId: string };
    const { periodId } = request.query as { periodId?: string };
    await requireTenantAccess(orgId, request.userId);

    const reportService = createReportsService(prisma as any);
    const data = await reportService.getBalanceSheet(orgId, periodId);
    return reply.send({ success: true, data });
  });

  // GET /api/v1/organizations/:orgId/accounting/income-statement — Income statement
  app.get('/api/v1/organizations/:orgId/accounting/income-statement', async (request, reply) => {
    const { orgId } = request.params as { orgId: string };
    const { periodId } = request.query as { periodId?: string };
    await requireTenantAccess(orgId, request.userId);

    const reportService = createReportsService(prisma as any);
    const data = await reportService.getIncomeStatement(orgId, periodId);
    return reply.send({ success: true, data });
  });

  // GET /api/v1/accounting/accounts/:accountId/ledger — Account ledger detail
  app.get('/api/v1/accounting/accounts/:accountId/ledger', async (request, reply) => {
    const { accountId } = request.params as { accountId: string };
    const { periodId } = request.query as { periodId?: string };

    // Check tenant access via account
    const account = await prisma.chartAccount.findUnique({
      where: { id: accountId },
      select: { tenantId: true },
    });
    if (!account) {
      return reply.status(404).send({ success: false, error: 'Kontot ei leitud', code: 'NOT_FOUND' });
    }
    await requireTenantAccess(account.tenantId, request.userId);

    const reportService = createReportsService(prisma as any);
    const data = await reportService.getAccountLedger(account.tenantId, accountId, periodId);
    return reply.send({ success: true, data });
  });

  // GET /api/v1/organizations/:orgId/accounting/chart-of-accounts — List chart of accounts
  app.get('/api/v1/organizations/:orgId/accounting/chart-of-accounts', async (request, reply) => {
    const { orgId } = request.params as { orgId: string };
    await requireTenantAccess(orgId, request.userId);

    const accounts = await prisma.chartAccount.findMany({
      where: { tenantId: orgId, isActive: true },
      include: {
        accountClass: { select: { code: true, name: true, statementType: true } },
        cashflowGroup: { select: { code: true, name: true, direction: true } },
        defaultCostCategory: { select: { code: true, name: true } },
      },
      orderBy: { accountNumber: 'asc' },
    });

    return reply.send({ success: true, data: accounts });
  });

  // GET /api/v1/organizations/:orgId/accounting/journal-entries — List journal entries
  app.get('/api/v1/organizations/:orgId/accounting/journal-entries', async (request, reply) => {
    const { orgId } = request.params as { orgId: string };
    const { periodId, limit } = request.query as { periodId?: string; limit?: string };
    await requireTenantAccess(orgId, request.userId);

    const where: any = { tenantId: orgId };
    if (periodId) where.periodId = periodId;

    const entries = await prisma.journalEntry.findMany({
      where,
      include: {
        lines: {
          include: {
            account: { select: { accountNumber: true, name: true } },
            costCategory: { select: { code: true, name: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { entryDate: 'desc' },
      take: Math.min(parseInt(limit || '50'), 200),
    });

    return reply.send({ success: true, data: entries });
  });
}