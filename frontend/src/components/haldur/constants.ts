// frontend/src/components/haldur/constants.ts
// Navigation structure — pure data, no JSX
// eesti.ee-inspired 3-level hierarchy: Domain Groups → Service Pages

import type { DomainGroup } from "@/lib/rbac";

/**
 * Standalone pages that live at /haldur/{path} rather than inside org context
 */
const STANDALONE_PATHS = ["/kulud", "/jaotused", "/arved", "/maksed"];
function isStandalone(href: string): boolean {
  return STANDALONE_PATHS.includes(href);
}

/**
 * Top-level navigation for haldur portal.
 * This is the Level 2 domain grouping.
 * Service pages (Level 3) are children of these groups.
 *
 * Groups match eesti.ee information architecture:
 * - Ülevaade (overview dashboard)
 * - Ühistu andmed (organization data — members, buildings)
 * - Finants (financial domain — costs, allocations, invoices, payments)
 * - Tehniline (technical domain — meters, readings)
 * - Seaded (settings — users, roles, config)
 */
export const DOMAIN_GROUPS: DomainGroup[] = [
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
      { href: "/kulud", label: "Kulud", icon: "Coins", standalone: true },
      { href: "/jaotused", label: "Jaotused", icon: "Scale", standalone: true },
      { href: "/arved", label: "Arved", icon: "FileText", standalone: true },
      { href: "/maksed", label: "Maksed", icon: "Euro", standalone: true },
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
  {
    id: "seaded",
    label: "Seaded",
    icon: "Settings",
    roles: ["admin"],
    children: [
      { href: "/seaded", label: "Üldseaded", icon: "Settings" },
    ],
  },
];

/**
 * Default visible domain IDs for non-admin roles.
 */
export const DEFAULT_OPEN_DOMAINS = ["ulevaade"];