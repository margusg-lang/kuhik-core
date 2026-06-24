// frontend/src/lib/rbac.ts
// RBAC definitions — role hierarchy, domain permissions, UI visibility rules
// eesti.ee-inspired: users never see unauthorized content

import type { KuhikRole } from "./auth";

/**
 * Domain groups — the 3-level hierarchy:
 * LEVEL 1: Entry portal (Dashboard)
 * LEVEL 2: Domain groups (Ühistu andmed, Finants, Tehniline)
 * LEVEL 3: Service pages within each domain
 */
export interface DomainChild {
  href: string; // relative to org context, e.g. "/hooned" or standalone e.g. "/arved"
  label: string;
  icon?: string;
  standalone?: boolean; // if true, link is /haldur/{href} instead of /haldur/uhistud/{orgId}{href}
}

export interface DomainGroup {
  id: string;
  label: string;
  icon: string;
  roles: KuhikRole[]; // which roles can see this domain
  children: DomainChild[];
}

/**
 * Top-level navigation items (Level 2) for haldur/admin.
 */
export const HALDUR_DOMAINS: DomainGroup[] = [
  {
    id: "ulevaade",
    label: "Ülevaade",
    icon: "LayoutDashboard",
    roles: ["admin", "haldur"],
    children: [
      { href: "", label: "Ülevaade", icon: "Home" },
    ],
  },
  {
    id: "uhistu-andmed",
    label: "Ühistu andmed",
    icon: "Building2",
    roles: ["admin", "haldur"],
    children: [
      { href: "/hooned", label: "Hooned", icon: "Building2" },
      { href: "/inimesed", label: "Inimesed", icon: "Users" },
    ],
  },
  {
    id: "finants",
    label: "Finants",
    icon: "Euro",
    roles: ["admin", "haldur"],
    children: [
      { href: "/kulud", label: "Kulud", icon: "Coins" },
      { href: "/jaotused", label: "Jaotused", icon: "Scale" },
      { href: "/arved", label: "Arved", icon: "FileText" },
      { href: "/maksed", label: "Maksed", icon: "Euro" },
    ],
  },
  {
    id: "tehniline",
    label: "Tehniline",
    icon: "Gauge",
    roles: ["admin", "haldur"],
    children: [
      { href: "/arvestid", label: "Arvestid", icon: "Gauge" },
    ],
  },
];

/**
 * Top-level navigation items for owner (korteriomanik).
 */
export const OWNER_DOMAINS: DomainGroup[] = [
  {
    id: "ulevaade",
    label: "Ülevaade",
    icon: "Home",
    roles: ["korteriomanik"],
    children: [
      { href: "", label: "Ülevaade", icon: "Home" },
    ],
  },
  {
    id: "minu-andmed",
    label: "Minu andmed",
    icon: "Building2",
    roles: ["korteriomanik"],
    children: [
      { href: "/apartment", label: "Minu korter", icon: "Building2" },
    ],
  },
  {
    id: "tehniline",
    label: "Näidud",
    icon: "Gauge",
    roles: ["korteriomanik"],
    children: [
      { href: "/meters", label: "Arvestid", icon: "Gauge" },
    ],
  },
  {
    id: "finants",
    label: "Arved",
    icon: "FileText",
    roles: ["korteriomanik"],
    children: [
      { href: "/invoices", label: "Minu arved", icon: "FileText" },
    ],
  },
];

/**
 * Check if a role has access to a specific domain group.
 */
export function canAccessDomain(domain: DomainGroup, role: KuhikRole | null): boolean {
  if (!role) return false;
  return domain.roles.includes(role);
}

/**
 * Filter domain groups by role -> only return visible ones.
 */
export function getVisibleDomains(role: KuhikRole | null, isAdmin: boolean): DomainGroup[] {
  if (!role) return [];
  const source = isAdmin ? HALDUR_DOMAINS : OWNER_DOMAINS;
  return source.filter((d) => canAccessDomain(d, role));
}

/**
 * Role hierarchy for authorization (higher = more access).
 */
export const ROLE_HIERARCHY: Record<KuhikRole, number> = {
  korteriomanik: 1,
  haldur: 2,
  admin: 3,
};

/**
 * Check if a user's role has sufficient privilege.
 */
export function hasMinRole(userRole: KuhikRole | null, minimumRole: KuhikRole): boolean {
  if (!userRole) return false;
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[minimumRole];
}