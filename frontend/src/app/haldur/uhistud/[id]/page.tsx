"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Icon } from "@/components/haldur/Icons";
import Breadcrumb from "@/components/haldur/Breadcrumb";
import ContextHeader from "@/components/haldur/ContextHeader";

export default function OrgDetailPage({ params }: { params: { id: string } }) {
  const [orgId, setOrgId] = useState("");

  useEffect(() => {
    // params is a plain object in Next.js 14 client components
    if (params && typeof params === "object") {
      setOrgId((params as { id: string }).id || "");
    }
  }, [params]);

  const [org, setOrg] = useState<any>(null);
  const [buildings, setBuildings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orgId) return;
    const token = localStorage.getItem("kuhik_token");
    if (!token) return;

    Promise.all([
      fetch(`/api/v1/organizations/${orgId}`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      fetch(`/api/v1/organizations/${orgId}/buildings`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
    ])
      .then(([orgData, bldData]) => {
        if (orgData.success) setOrg(orgData.data);
        if (bldData.success) setBuildings(bldData.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [orgId]);

  if (loading) return <div className="p-8 text-slate-600">Laen...</div>;
  if (!org) return <div className="p-8 text-slate-600">Ühistut ei leitud.</div>;

  return (
    <div className="p-8">
      <Breadcrumb segments={[
        { label: "Haldur", href: "/haldur" },
        { label: "Korteriühistud", href: "/haldur/uhistud" },
        { label: org.name },
      ]} />

      <ContextHeader
        entityName={org.name}
        entityType="Ühistu"
        actions={[
          { label: "Ava hooned", href: `#hooned`, variant: "primary" as const, icon: "Building2" },
        ]}
      />

      {/* Buildings */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
            <Icon name="Building2" /> Hooned ({buildings.length})
          </h2>
          <Link href={`/haldur/uhistud/${orgId}/hooned/new`} className="inline-flex items-center gap-1 text-sm text-brand-600 hover:underline">
            <Icon name="Plus" /> Lisa hoone
          </Link>
        </div>

        {buildings.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-600">Hooned pole veel lisatud.</div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {buildings.map((b: any) => (
              <Link key={b.id} href={`/haldur/uhistud/${orgId}/hooned/${b.id}`} className="rounded-xl border border-slate-200 bg-white p-5 hover:shadow-md transition-all hover:-translate-y-0.5">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600"><Icon name="Building2" /></div>
                <h3 className="font-semibold text-slate-900">{b.name}</h3>
                {b.address && <p className="mt-1 text-xs text-slate-500">{b.address}</p>}
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}