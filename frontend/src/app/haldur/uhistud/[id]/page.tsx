"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Building2, Home, Plus } from "lucide-react";

export default function OrgDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [orgId, setOrgId] = useState("");
  const [org, setOrg] = useState<any>(null);
  const [buildings, setBuildings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    params.then(p => setOrgId(p.id));
  }, [params]);

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
      <Link href="/haldur/uhistud" className="text-sm text-brand-600 hover:underline">← Tagasi ühistute juurde</Link>
      <div className="mt-2 mb-8">
        <h1 className="text-2xl font-bold text-slate-900">{org.name}</h1>
        <div className="mt-2 flex flex-wrap gap-4 text-sm text-slate-600">
          {org.registryCode && <span>Reg: {org.registryCode}</span>}
          {org.address && <span>{org.address}</span>}
          {org.contactEmail && <span>{org.contactEmail}</span>}
        </div>
      </div>

      {/* Wave 1 module cards */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link href={`/haldur/uhistud/${orgId}`} className="rounded-xl border border-brand-200 bg-brand-50 p-5 hover:shadow-md transition-all">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-brand-100 text-brand-600"><Home className="h-5 w-5" /></div>
          <h3 className="font-semibold text-slate-900">Hooned ja korterid</h3>
          <p className="mt-1 text-xs text-slate-500">{buildings.length} hoonet</p>
        </Link>
        <div className="rounded-xl border border-slate-200 bg-white p-5 opacity-50">
          <h3 className="font-semibold text-slate-400">Elanikud</h3>
          <p className="mt-1 text-xs text-slate-400">📋 Wave 2</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 opacity-50">
          <h3 className="font-semibold text-slate-400">Näidud</h3>
          <p className="mt-1 text-xs text-slate-400">📋 Wave 2+</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 opacity-50">
          <h3 className="font-semibold text-slate-400">Arveldus</h3>
          <p className="mt-1 text-xs text-slate-400">📋 Wave 3+</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 opacity-50">
          <h3 className="font-semibold text-slate-400">Arved</h3>
          <p className="mt-1 text-xs text-slate-400">📋 Wave 4+</p>
        </div>
      </div>

      {/* Buildings */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
            <Building2 className="h-5 w-5" />Hooned ({buildings.length})
          </h2>
          <Link href={`/haldur/uhistud/${orgId}/hooned/new`} className="inline-flex items-center gap-1 text-sm text-brand-600 hover:underline">
            <Plus className="h-4 w-4" /> Lisa hoone
          </Link>
        </div>

        {buildings.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-600">Hooned pole veel lisatud.</div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {buildings.map((b: any) => (
              <Link key={b.id} href={`/haldur/uhistud/${orgId}/hooned/${b.id}`} className="rounded-xl border border-slate-200 bg-white p-5 hover:shadow-md transition-all hover:-translate-y-0.5">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600"><Building2 className="h-5 w-5" /></div>
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