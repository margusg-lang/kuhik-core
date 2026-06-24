"use client";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Sidebar from "@/components/haldur/Sidebar";
import { getCurrentUser, getUserRole, getRedirectPath, getToken, type KuhikRole } from "@/lib/auth";

export default function HaldurLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [auth, setAuth] = useState<{
    checked: boolean;
    valid: boolean;
    orgId?: string;
    orgName?: string;
    role: KuhikRole | null;
  }>({
    checked: false,
    valid: false,
    role: null,
  });

  useEffect(() => {
    const token = localStorage.getItem("kuhik_token");
    if (!token) {
      router.push("/login");
      return;
    }

    // Extract role from JWT
    const user = getCurrentUser();
    const role = user?.role ?? null;

    // Role check — redirect korteriomanik to resident portal
    if (role === "korteriomanik") {
      router.push(getRedirectPath("korteriomanik"));
      return;
    }

    // Extract orgId from pathname
    const match = pathname.match(/\/haldur\/uhistud\/([^\/]+)/);
    const orgId = match ? match[1] : undefined;

    if (orgId && orgId !== "uus") {
      // Fetch org name for sidebar context
      fetch(`/api/v1/organizations/${orgId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.success) {
            setAuth({ checked: true, valid: true, orgId, orgName: data.data.name, role });
          } else {
            setAuth({ checked: true, valid: true, orgId, role });
          }
        })
        .catch(() => {
          setAuth({ checked: true, valid: true, orgId, role });
        });
    } else {
      setAuth({ checked: true, valid: true, orgId, role });
    }
  }, [pathname, router]);

  if (!auth.checked) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="text-slate-500">Laen...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar orgId={auth.orgId} orgName={auth.orgName} role={auth.role} />
      <main className="ml-64 min-h-screen">
        {children}
      </main>
    </div>
  );
}