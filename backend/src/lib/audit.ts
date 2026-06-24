// kuhik-core/backend/src/lib/audit.ts
// Central audit logging service for financial-critical operations
// Every create/update/delete on financial entities goes through here.
// Features: before/after snapshots, correlation IDs, tenant-scoped

import { prisma } from './prisma.js';
import { Prisma } from '@prisma/client';

export type AuditAction =
  | "reading.create"
  | "reading.update"
  | "reading.delete"
  | "cost.create"
  | "cost.update"
  | "cost.delete"
  | "allocation.run"
  | "allocation.rollback"
  | "invoice.generate"
  | "invoice.update"
  | "payment.create"
  | "payment.reverse"
  | "person.link"
  | "person.unlink"
  | "role.change"
  | "membership.create"
  | "membership.remove"
  | "organization.update"
  | "organization.delete"
  | "meter.create"
  | "meter.update"
  | "meter.delete"
  | "apartment.update"
  | "apartment.create"
  | "building.create"
  | "building.update"
  | "building.delete";

export type AuditEvent = {
  action: AuditAction;
  targetType: string; // Prisma model name: "UtilityCost" | "KuhikInvoice" | etc.
  targetId: string;
  tenantId: string;
  userId: string;
  correlationId: string;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  source?: string;
};

let correlationCounter = 0;

/**
 * Generate a unique correlation ID for a request chain.
 * Use this at the route handler level to trace all audit events from one request.
 */
export function generateCorrelationId(): string {
  correlationCounter++;
  return `${Date.now()}-${correlationCounter}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Log an audit event.
 * This is the SINGLE entry point for all audit logging.
 *
 * Usage:
 *   await audit.log({
 *     action: "cost.create",
 *     targetType: "UtilityCost",
 *     targetId: cost.id,
 *     tenantId: orgId,
 *     userId: request.userId,
 *     correlationId: request.correlationId,
 *     after: { type, amount, periodStart, periodEnd },
 *   });
 */
export async function log(event: AuditEvent): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        tenantId: event.tenantId,
        userId: event.userId,
        action: event.action,
        entityType: event.targetType,
        entityId: event.targetId,
        correlationId: event.correlationId,
        oldValues: (event.before ?? Prisma.JsonNull) as any,
        newValues: (event.after ?? Prisma.JsonNull) as any,
        source: event.source ?? "api",
      },
    });
  } catch (err) {
    // Audit should never crash the main operation
    console.error(`[audit] Failed to log ${event.action} for ${event.targetType}/${event.targetId}:`, err);
  }
}

/**
 * Query audit logs for a specific entity.
 */
export async function getEntityHistory(targetType: string, targetId: string) {
  return prisma.auditLog.findMany({
    where: { entityType: targetType, entityId: targetId },
    orderBy: { createdAt: "desc" },
    include: { user: { select: { name: true, email: true } } },
  });
}

/**
 * Query audit logs for a tenant.
 */
export async function getTenantAuditLogs(
  tenantId: string,
  options?: { action?: string; limit?: number; offset?: number }
) {
  return prisma.auditLog.findMany({
    where: {
      tenantId,
      ...(options?.action ? { action: options.action } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: options?.limit ?? 50,
    skip: options?.offset ?? 0,
    include: { user: { select: { name: true, email: true } } },
  });
}