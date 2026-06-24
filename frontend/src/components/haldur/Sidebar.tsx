"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { DOMAIN_GROUPS } from "./constants";
import { Icon } from "./Icons";
import type { KuhikRole } from "@/lib/auth";
import { logout } from "@/lib/auth";

interface SidebarProps {
  orgId?: string;
  orgName?: string;
  role?: KuhikRole | null;
}

export default function Sidebar({ orgId, orgName, role }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set(["ulevaade"]));

  const isOrgDetail = !!orgId && orgId !== "uus";

  // Auto-open the relevant domain group based on current path
  useEffect(() => {
    if (!isOrgDetail || !orgId) return;
    for (const group of DOMAIN_GROUPS) {
      for (const child of group.children) {
        const childPath = `/haldur/uhistud/${orgId}${child.href}`;
        if (child.href === "" && pathname === `/haldur/uhistud/${orgId}`) {
          setOpenGroups((prev) => new Set(prev).add(group.id));
          return;
        }
        if (child.href && pathname.startsWith(childPath)) {
          setOpenGroups((prev) => new Set(prev).add(group.id));
          return;
        }
      }
    }
  }, [pathname, orgId, isOrgDetail]);

  // Filter domain groups by role
  const visibleGroups = DOMAIN_GROUPS.filter((g) => {
    if (!role) return false;
    return g.roles.includes(role);
  });

  function toggleGroup(id: string) {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleLogoutClick() {
    logout(router);
  }

  function isChildActive(childHref: string, standalone?: boolean): boolean {
    if (standalone) {
      // Standalone pages live under /haldur/{path}
      return pathname === `/haldur${childHref}` || pathname.startsWith(`/haldur${childHref}/`);
    }
    if (!orgId) return false;
    const fullPath = childHref === ""
      ? `/haldur/uhistud/${orgId}`
      : `/haldur/uhistud/${orgId}${childHref}`;
    if (childHref === "") return pathname === fullPath;
    return pathname.startsWith(fullPath);
  }

  // Build a service page href: if standalone, link directly under /haldur/{path}
  function childHref(groupId: string, childHrefPath: string, standalone?: boolean): string {
    if (standalone) {
      return childHrefPath === "" ? "/haldur" : `/haldur${childHrefPath}`;
    }
    if (isOrgDetail && orgId) {
      return childHrefPath === ""
        ? `/haldur/uhistud/${orgId}`
        : `/haldur/uhistud/${orgId}${childHrefPath}`;
    }
    // No org selected — link to org listing so user picks one
    return "/haldur/uhistud";
  }

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-64 bg-slate-900 text-white flex flex-col z-30">
      {/* Brand — eesti.ee style: clean, minimal */}
      <div className="px-5 py-4 border-b border-slate-700">
        <Link href="/haldur" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500 text-white text-sm font-bold">KH</div>
          <span className="font-bold text-white">Kuhik — Haldur</span>
        </Link>
      </div>

      {/* Org context — shown when inside an organization */}
      {orgName && (
        <div className="px-5 py-2 bg-slate-800/50 border-b border-slate-700">
          <p className="text-xs text-slate-400">Aktiivne ühistu</p>
          <p className="text-sm font-medium text-white truncate">{orgName}</p>
        </div>
      )}

      {/* Navigation — eesti.ee 3-level hierarchy: ALWAYS visible */}
      <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-1">
        {/* Level 1: Entry Portal (Ülevaade) */}
        <Link
          href="/haldur"
          className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
            pathname === "/haldur" && !orgId
              ? "bg-brand-600 text-white"
              : "text-slate-300 hover:bg-slate-800 hover:text-white"
          }`}
        >
          <Icon name="LayoutDashboard" />
          <span>Ülevaade</span>
        </Link>

        {/* Level 2 + Level 3: Domain groups and service pages */}
        <div className="mt-1 space-y-0.5">
          <p className="px-3 pt-3 pb-1 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Teenused
          </p>

          {visibleGroups.map((group) => {
            const isOpen = openGroups.has(group.id);
            return (
              <div key={group.id}>
                {/* Level 2: Domain group header */}
                <button
                  onClick={() => toggleGroup(group.id)}
                  className="flex w-full items-center justify-between px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
                >
                  <span className="flex items-center gap-3">
                    <Icon name={group.icon} />
                    <span>{group.label}</span>
                  </span>
                  <svg
                    className={`w-4 h-4 transition-transform ${isOpen ? "rotate-90" : ""}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>

                {/* Level 3: Service pages */}
                {isOpen && (
                  <div className="ml-4 pl-2 border-l border-slate-700 space-y-0.5 mt-0.5">
                    {group.children.map((child) => (
                      <Link
                        key={child.href}
                        href={childHref(group.id, child.href, child.standalone)}
                        className={`flex items-center gap-3 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                          isChildActive(child.href, child.standalone)
                            ? "bg-brand-600/20 text-brand-300 font-medium"
                            : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                        }`}
                      >
                        {child.icon && <Icon name={child.icon} />}
                        <span>{child.label}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* If no org selected, show hint */}
        {!isOrgDetail && (
          <div className="mt-4 mx-3 px-3 py-2 rounded-lg bg-slate-800/50 border border-slate-700">
            <p className="text-xs text-slate-400">
              Vali ühistu, et näha andmeid
            </p>
            <Link
              href="/haldur/uhistud"
              className="mt-1 text-xs text-brand-400 hover:text-brand-300 inline-flex items-center gap-1"
            >
              <Icon name="Building2" /> Ava korteriühistud
            </Link>
          </div>
        )}
      </nav>

      {/* Logout */}
      <div className="px-3 py-3 border-t border-slate-700">
        <button
          onClick={handleLogoutClick}
          className="flex w-full items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
        >
          <Icon name="LogOut" />
          <span>Logi välja</span>
        </button>
      </div>
    </aside>
  );
}