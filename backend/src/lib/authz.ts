// kuhik-core/backend/src/lib/authz.ts
// Organization-scoped authorization helpers

import { prisma } from './prisma.js';
import { AppError } from '../plugins/error-handler.js';

// Role hierarchy used for access control
export const ROLES = {
  SYSTEM_ADMIN: 'system_admin',
  ADMIN: 'admin',
  BOARD_MEMBER: 'board_member',
  RESIDENT: 'resident',
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

/**
 * Verify that a user has access to a tenant (organization).
 * Throws AppError 404 if not found (to avoid leaking existence).
 * Returns the membership record.
 */
export async function requireTenantAccess(tenantId: string, userId: string) {
  const membership = await prisma.tenantUser.findFirst({
    where: { tenantId, userId, isActive: true },
  });
  if (!membership) {
    throw new AppError(404, 'NOT_FOUND', 'Organisatsiooni ei leitud');
  }
  return membership;
}

/**
 * Verify that a user has admin-level access to a tenant.
 * Admin roles: system_admin, admin, board_member
 */
export async function requireTenantAdmin(tenantId: string, userId: string) {
  const membership = await requireTenantAccess(tenantId, userId);
  if (!['system_admin', 'admin', 'board_member'].includes(membership.role)) {
    throw new AppError(403, 'FORBIDDEN', 'Ainult haldur saab seda teha');
  }
  return membership;
}

/**
 * Get all tenant IDs that a user has access to.
 */
export async function getUserTenantIds(userId: string): Promise<string[]> {
  const memberships = await prisma.tenantUser.findMany({
    where: { userId, isActive: true },
    select: { tenantId: true },
  });
  return memberships.map((m) => m.tenantId);
}

/**
 * Check if a resource's tenantId is within the user's allowed scope.
 * Throws 404 if not (to avoid leaking existence).
 */
export async function assertTenantScope(resourceTenantId: string, userId: string) {
  const tenantIds = await getUserTenantIds(userId);
  if (!tenantIds.includes(resourceTenantId)) {
    throw new AppError(404, 'NOT_FOUND', 'Ressurssi ei leitud');
  }
}