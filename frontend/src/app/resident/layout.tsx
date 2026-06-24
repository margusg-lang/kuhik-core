"use client";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Home, FileText, Gauge, Building2, LogOut } from "lucide-react";
import { getCurrentUser, getRedirectPath, logout } from "@/lib/auth";
import type { KuhikRole } from "@/lib/auth";

export default function ResidentLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [orgId, setOrgId] = useState<string>("");
  const [role, setRole] = useState<KuhikRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("kuhik_token");
    if (!token) {
      router.push("/login");
      return;
    }

    // Role check — redirect haldur/admin to haldur portal
    const currentUser = getCurrentUser();
    const userRole = currentUser?.role ?? null;
    setRole(userRole);

    if (userRole === "admin" || userRole === "haldur") {
      router.push(getRedirectPath("haldur"));
      return;
    }

    fetch("/api/v1/me/profile", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          setUser(data.data);
          if (data.data.organizations.length > 0) {
            setOrgId(data.data.organizations[0].id);
          }
        } else {
          router.push("/login");
        }
      })
      .catch(() => router.push("/login"))
      .finally(() => setLoading(false));
  }, [router]);

  function handleLogoutClick() {
    logout(router);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-500">Laen...</div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-6 py-3 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-600 text-white text-sm font-bold">KH</div>
            <span className="font-bold text-slate-800">Kuhik — Korteriomaniku portaal</span>
            {user.organizations.length > 0 && (
              <span className="text-sm text-slate-500 ml-2">| {user.organizations[0].name}</span>
            )}
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-600">{user.name || user.email}</span>
            <button onClick={handleLogoutClick} className="flex items-center gap-1 text-sm text-slate-500 hover:text-red-600 transition-colors">
              <LogOut className="h-4 w-4" /> Välju
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-4">
        {/* eesti.ee-style: context-aware navigation tabs */}
        <nav className="flex items-center gap-1 mb-6 text-sm">
          <Link href="/resident" className={`px-3 py-2 rounded-lg transition-colors flex items-center gap-1.5 ${typeof window !== "undefined" && window.location.pathname === "/resident" ? "bg-teal-100 text-teal-800 font-medium" : "text-slate-600 hover:bg-slate-100"}`}>
            <Home className="h-4 w-4" /> Ülevaade
          </Link>
          <Link href="/resident/apartment" className={`px-3 py-2 rounded-lg transition-colors flex items-center gap-1.5 ${typeof window !== "undefined" && window.location.pathname.startsWith("/resident/apartment") ? "bg-teal-100 text-teal-800 font-medium" : "text-slate-600 hover:bg-slate-100"}`}>
            <Building2 className="h-4 w-4" /> Minu korter
          </Link>
          <Link href="/resident/meters" className={`px-3 py-2 rounded-lg transition-colors flex items-center gap-1.5 ${typeof window !== "undefined" && window.location.pathname.startsWith("/resident/meters") ? "bg-teal-100 text-teal-800 font-medium" : "text-slate-600 hover:bg-slate-100"}`}>
            <Gauge className="h-4 w-4" /> Näidud
          </Link>
          <Link href="/resident/invoices" className={`px-3 py-2 rounded-lg transition-colors flex items-center gap-1.5 ${typeof window !== "undefined" && window.location.pathname.startsWith("/resident/invoices") ? "bg-teal-100 text-teal-800 font-medium" : "text-slate-600 hover:bg-slate-100"}`}>
            <FileText className="h-4 w-4" /> Arved
          </Link>
        </nav>

        <main>{children}</main>
      </div>
    </div>
  );
}