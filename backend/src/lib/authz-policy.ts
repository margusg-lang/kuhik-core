// kuhik-core/backend/src/lib/authz-policy.ts
// Central authorization policy layer — can(user, action, resource)
// SINGLE SOURCE OF TRUTH for all permission checks in Kuhik
// Every route, service, UI, and future API goes through this function.

import { AppError } from '../plugins/error-handler.js';

// ============================================================
// TYPES
// ============================================================

export type AuthUser = {
  userId: string;
  role: string;
  tenantIds: string[];
  isAdmin: boolean;
};

export type Action =
  // Organization management
  | "organization.read"
  | "organization.create"
  | "organization.update"
  | "organization.delete"
  // Building management
  | "building.read"
  | "building.create"
  | "building.update"
  | "building.delete"
  // Apartment management
  | "apartment.read"
  | "apartment.create"
  | "apartment.update"
  | "apartment.delete"
  // People management
  | "person.read"
  | "person.create"
  | "person.update"
  | "person.delete"
  | "person.link"
  | "person.unlink"
  // Meter management
  | "meter.read"
  | "meter.create"
  | "meter.update"
  | "meter.delete"
  // Meter readings
  | "reading.read"
  | "reading.create"
  | "reading.update"
  | "reading.delete"
  // Utility costs
  | "cost.read"
  | "cost.create"
  | "cost.update"
  | "cost.delete"
  // Allocations
  | "allocation.run"
  | "allocation.rollback"
  | "allocation.read"
  // Invoices
  | "invoice.read"
  | "invoice.generate"
  | "invoice.update"
  // Payments
  | "payment.read"
  | "payment.create"
  | "payment.reverse"
  // User management
  | "user.invite"
  | "user.role.change";

export type ResourceContext = {
  tenantId?: string;
  apartmentId?: string;
  buildingId?: string;
  invoiceId?: string;
  organizationId?: string;
  ownerId?: string;
};

// ============================================================
// ROLE CONSTANTS
// ============================================================

export const ROLES = {
  SYSTEM_ADMIN: "system_admin",
  ADMIN: "admin",
  BOARD_MEMBER: "board_member",
  RESIDENT: "resident",
  TENANT: "tenant",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

const ADMIN_ROLES = new Set<string>([ROLES.SYSTEM_ADMIN, ROLES.ADMIN, ROLES.BOARD_MEMBER]);
const FULL_ACCESS_ROLES = new Set<string>([ROLES.SYSTEM_ADMIN, ROLES.ADMIN]);

// ============================================================
// POLICY DEFINITIONS
// ============================================================

type PolicyRule = {
  description: string;
  check: (user: AuthUser, resource: ResourceContext) => boolean;
};

const policies: Record<string, PolicyRule> = {
  // ---- ORGANIZATION ----
  "organization.read": {
    description: "User dapat melihat organisasi tempat mereka anggota",
    check: (user) => user.isAdmin || user.tenantIds.length > 0,
  },
  "organization.create": {
    description: "Siapa pun dapat membuat organisasi baru",
    check: () => true,
  },
  "organization.update": {
    description: "Hanya admin organisasi yang dapat mengubah",
    check: (user, resource) =>
      FULL_ACCESS_ROLES.has(user.role as Role) &&
      user.tenantIds.includes(resource.tenantId ?? ""),
  },
  "organization.delete": {
    description: "Hanya admin sistem yang dapat menghapus organisasi",
    check: (user) => user.role === ROLES.SYSTEM_ADMIN,
  },

  // ---- BUILDING ----
  "building.read": {
    description: "Anggota organisasi dapat melihat bangunan",
    check: (user, resource) =>
      FULL_ACCESS_ROLES.has(user.role as Role) ||
      (resource.tenantId ? user.tenantIds.includes(resource.tenantId) : false),
  },
  "building.create": {
    description: "Hanya admin yang dapat membuat bangunan",
    check: (user, resource) =>
      ADMIN_ROLES.has(user.role as Role) &&
      user.tenantIds.includes(resource.tenantId ?? ""),
  },
  "building.update": {
    description: "Hanya admin yang dapat mengubah bangunan",
    check: (user, resource) =>
      ADMIN_ROLES.has(user.role as Role) &&
      user.tenantIds.includes(resource.tenantId ?? ""),
  },
  "building.delete": {
    description: "Hanya admin sistem yang dapat menghapus bangunan",
    check: (user) => user.role === ROLES.SYSTEM_ADMIN,
  },

  // ---- APARTMENT ----
  "apartment.read": {
    description: "Admin dapat melihat semua korter, pemilik hanya miliknya sendiri",
    check: (user, resource) => {
      if (ADMIN_ROLES.has(user.role as Role)) {
        return resource.tenantId ? user.tenantIds.includes(resource.tenantId) : true;
      }
      // Owner — only own apartment
      return resource.ownerId === user.userId;
    },
  },
  "apartment.create": {
    description: "Hanya admin yang dapat membuat korter",
    check: (user, resource) =>
      ADMIN_ROLES.has(user.role as Role) &&
      user.tenantIds.includes(resource.tenantId ?? ""),
  },
  "apartment.update": {
    description: "Hanya admin yang dapat mengubah korter",
    check: (user, resource) =>
      ADMIN_ROLES.has(user.role as Role) &&
      user.tenantIds.includes(resource.tenantId ?? ""),
  },
  "apartment.delete": {
    description: "Hanya admin sistem yang dapat menghapus korter",
    check: (user) => user.role === ROLES.SYSTEM_ADMIN,
  },

  // ---- PEOPLE ----
  "person.read": {
    description: "Admin dapat melihat semua orang, pemilik hanya miliknya sendiri",
    check: (user, resource) => {
      if (ADMIN_ROLES.has(user.role as Role)) {
        return resource.tenantId ? user.tenantIds.includes(resource.tenantId) : true;
      }
      return resource.ownerId === user.userId;
    },
  },
  "person.create": {
    description: "Hanya admin yang dapat menambahkan orang",
    check: (user, resource) =>
      ADMIN_ROLES.has(user.role as Role) &&
      user.tenantIds.includes(resource.tenantId ?? ""),
  },
  "person.update": {
    description: "Hanya admin yang dapat mengubah data orang",
    check: (user, resource) =>
      ADMIN_ROLES.has(user.role as Role) &&
      user.tenantIds.includes(resource.tenantId ?? ""),
  },
  "person.delete": {
    description: "Hanya admin yang dapat menghapus orang",
    check: (user, resource) =>
      ADMIN_ROLES.has(user.role as Role) &&
      user.tenantIds.includes(resource.tenantId ?? ""),
  },
  "person.link": {
    description: "Hubungkan pemilik ke korter — hanya admin",
    check: (user, resource) =>
      ADMIN_ROLES.has(user.role as Role) &&
      user.tenantIds.includes(resource.tenantId ?? ""),
  },
  "person.unlink": {
    description: "Putuskan hubungan pemilik dari korter — hanya admin",
    check: (user, resource) =>
      ADMIN_ROLES.has(user.role as Role) &&
      user.tenantIds.includes(resource.tenantId ?? ""),
  },

  // ---- METERS ----
  "meter.read": {
    description: "Admin dapat melihat semua meter, pemilik hanya milik korter sendiri",
    check: (user, resource) => {
      if (ADMIN_ROLES.has(user.role as Role)) {
        return resource.tenantId ? user.tenantIds.includes(resource.tenantId) : true;
      }
      return resource.ownerId === user.userId;
    },
  },
  "meter.create": {
    description: "Hanya admin yang dapat membuat meter",
    check: (user, resource) =>
      ADMIN_ROLES.has(user.role as Role) &&
      user.tenantIds.includes(resource.tenantId ?? ""),
  },
  "meter.update": {
    description: "Hanya admin yang dapat mengubah meter",
    check: (user, resource) =>
      ADMIN_ROLES.has(user.role as Role) &&
      user.tenantIds.includes(resource.tenantId ?? ""),
  },
  "meter.delete": {
    description: "Hanya admin yang dapat menghapus meter",
    check: (user, resource) =>
      ADMIN_ROLES.has(user.role as Role) &&
      user.tenantIds.includes(resource.tenantId ?? ""),
  },

  // ---- READINGS ----
  "reading.read": {
    description: "Admin dapat melihat semua pembacaan, pemilik hanya milik sendiri",
    check: (user, resource) => {
      if (ADMIN_ROLES.has(user.role as Role)) {
        return resource.tenantId ? user.tenantIds.includes(resource.tenantId) : true;
      }
      return resource.ownerId === user.userId;
    },
  },
  "reading.create": {
    description: "Pemilik dapat membuat pembacaan untuk korter sendiri, admin untuk semua",
    check: (user, resource) => {
      if (ADMIN_ROLES.has(user.role as Role)) {
        return resource.tenantId ? user.tenantIds.includes(resource.tenantId) : true;
      }
      return resource.ownerId === user.userId;
    },
  },
  "reading.update": {
    description: "Admin dapat memperbarui pembacaan apa pun, pemilik hanya milik sendiri",
    check: (user, resource) => {
      if (ADMIN_ROLES.has(user.role as Role)) {
        return resource.tenantId ? user.tenantIds.includes(resource.tenantId) : true;
      }
      return resource.ownerId === user.userId;
    },
  },
  "reading.delete": {
    description: "Hanya admin yang dapat menghapus pembacaan",
    check: (user, resource) =>
      ADMIN_ROLES.has(user.role as Role) &&
      user.tenantIds.includes(resource.tenantId ?? ""),
  },

  // ---- COSTS ----
  "cost.read": {
    description: "Hanya admin yang dapat melihat biaya utilitas",
    check: (user, resource) =>
      ADMIN_ROLES.has(user.role as Role) &&
      user.tenantIds.includes(resource.tenantId ?? ""),
  },
  "cost.create": {
    description: "Hanya admin yang dapat membuat biaya",
    check: (user, resource) =>
      ADMIN_ROLES.has(user.role as Role) &&
      user.tenantIds.includes(resource.tenantId ?? ""),
  },
  "cost.update": {
    description: "Hanya admin yang dapat memperbarui biaya",
    check: (user, resource) =>
      ADMIN_ROLES.has(user.role as Role) &&
      user.tenantIds.includes(resource.tenantId ?? ""),
  },
  "cost.delete": {
    description: "Hanya admin yang dapat menghapus biaya",
    check: (user, resource) =>
      ADMIN_ROLES.has(user.role as Role) &&
      user.tenantIds.includes(resource.tenantId ?? ""),
  },

  // ---- ALLOCATIONS ----
  "allocation.read": {
    description: "Hanya admin yang dapat melihat alokasi",
    check: (user, resource) =>
      ADMIN_ROLES.has(user.role as Role) &&
      user.tenantIds.includes(resource.tenantId ?? ""),
  },
  "allocation.run": {
    description: "Hanya anggota dewan yang dapat menjalankan alokasi",
    check: (user, resource) =>
      ADMIN_ROLES.has(user.role as Role) &&
      user.tenantIds.includes(resource.tenantId ?? ""),
  },
  "allocation.rollback": {
    description: "Hanya admin sistem yang dapat membatalkan alokasi",
    check: (user) => user.role === ROLES.SYSTEM_ADMIN,
  },

  // ---- INVOICES ----
  "invoice.read": {
    description: "Admin dapat melihat semua faktur, pemilik hanya milik sendiri",
    check: (user, resource) => {
      if (ADMIN_ROLES.has(user.role as Role)) {
        return resource.tenantId ? user.tenantIds.includes(resource.tenantId) : true;
      }
      return resource.ownerId === user.userId;
    },
  },
  "invoice.generate": {
    description: "Hanya anggota dewan yang dapat menghasilkan faktur",
    check: (user, resource) =>
      ADMIN_ROLES.has(user.role as Role) &&
      user.tenantIds.includes(resource.tenantId ?? ""),
  },
  "invoice.update": {
    description: "Hanya anggota dewan yang dapat memperbarui faktur",
    check: (user, resource) =>
      ADMIN_ROLES.has(user.role as Role) &&
      user.tenantIds.includes(resource.tenantId ?? ""),
  },

  // ---- PAYMENTS ----
  "payment.read": {
    description: "Admin dapat melihat semua pembayaran, pemilik hanya milik sendiri",
    check: (user, resource) => {
      if (ADMIN_ROLES.has(user.role as Role)) {
        return resource.tenantId ? user.tenantIds.includes(resource.tenantId) : true;
      }
      return resource.ownerId === user.userId;
    },
  },
  "payment.create": {
    description: "Hanya admin yang dapat mencatat pembayaran",
    check: (user, resource) =>
      ADMIN_ROLES.has(user.role as Role) &&
      user.tenantIds.includes(resource.tenantId ?? ""),
  },
  "payment.reverse": {
    description: "Hanya admin sistem yang dapat membatalkan pembayaran",
    check: (user) => user.role === ROLES.SYSTEM_ADMIN,
  },

  // ---- USER MANAGEMENT ----
  "user.invite": {
    description: "Hanya admin yang dapat mengundang pengguna",
    check: (user, resource) =>
      ADMIN_ROLES.has(user.role as Role) &&
      user.tenantIds.includes(resource.tenantId ?? ""),
  },
  "user.role.change": {
    description: "Hanya admin yang dapat mengubah peran pengguna",
    check: (user, resource) =>
      FULL_ACCESS_ROLES.has(user.role as Role) &&
      user.tenantIds.includes(resource.tenantId ?? ""),
  },
};

// ============================================================
// MAIN API
// ============================================================

/**
 * Check if a user is authorized to perform an action on a resource.
 * This is the SINGLE entry point for all authorization decisions.
 *
 * Usage:
 *   if (!can(user, "invoice.read", { tenantId, apartmentId })) throw forbidden()
 *
 * Returns true/false — never throws on its own.
 */
export function can(user: AuthUser, action: Action, resource: ResourceContext = {}): boolean {
  const policy = policies[action];
  if (!policy) {
    console.warn(`[authz-policy] Unknown action: "${action}" — defaulting to DENY`);
    return false;
  }

  return policy.check(user, resource);
}

/**
 * Like can(), but throws AppError 403 if denied.
 * Use in route handlers and services.
 */
export function requireCan(user: AuthUser, action: Action, resource: ResourceContext = {}): void {
  if (!can(user, action, resource)) {
    throw new AppError(403, "FORBIDDEN", "Tegevus pole lubatud");
  }
}

/**
 * Build AuthUser from Fastify request + Prisma lookup.
 * Use this in route handlers to construct the user context.
 */
export function buildAuthUser(userId: string, role: string, tenantIds: string[]): AuthUser {
  return {
    userId,
    role: normalizeRole(role),
    tenantIds,
    isAdmin: ADMIN_ROLES.has(normalizeRole(role) as Role),
  };
}

function normalizeRole(role: string): string {
  switch (role) {
    case "Admin":
      return ROLES.ADMIN;
    case "BoardMember":
      return ROLES.BOARD_MEMBER;
    case "Owner":
    case "owner":
    case "korteriomanik":
    case "Tenant":
    case "tenant":
      return ROLES.RESIDENT;
    default:
      return role;
  }
}

/**
 * Get all actions for a user — useful for frontend to know what's allowed.
 */
export function getAllowedActions(user: AuthUser, resource: ResourceContext): Action[] {
  return (Object.keys(policies) as Action[]).filter((action) => can(user, action, resource));
}