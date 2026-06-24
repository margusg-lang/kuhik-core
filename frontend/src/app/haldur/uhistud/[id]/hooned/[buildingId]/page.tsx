"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/haldur/Icons";
import Breadcrumb from "@/components/haldur/Breadcrumb";
import ContextHeader from "@/components/haldur/ContextHeader";

export default function BuildingDetailPage({ params }: { params: { id: string; buildingId: string } }) {
  const router = useRouter();
  const [orgId, setOrgId] = useState("");
  const [buildingId, setBuildingId] = useState("");
  const [building, setBuilding] = useState<any>(null);
  const [orgName, setOrgName] = useState("");
  const [apartments, setApartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (params && typeof params === "object") {
      const p = params as { id: string; buildingId: string };
      setOrgId(p.id || "");
      setBuildingId(p.buildingId || "");
    }
  }, [params]);

  useEffect(() => {
    if (!buildingId || !orgId) return;
    const token = localStorage.getItem("kuhik_token");
    if (!token) return;

    Promise.all([
      fetch(`/api/v1/buildings/${buildingId}`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      fetch(`/api/v1/buildings/${buildingId}/apartments`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      fetch(`/api/v1/organizations/${orgId}`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
    ])
      .then(([bldData, aptData, orgData]) => {
        if (bldData.success) setBuilding(bldData.data);
        if (aptData.success) setApartments(aptData.data);
        if (orgData.success) setOrgName(orgData.data.name);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [buildingId, orgId]);

  if (loading) return <div className="p-8 text-slate-600">Laen...</div>;
  if (!building) return <div className="p-8 text-slate-600">Hoonet ei leitud.</div>;

  return (
    <div className="p-8">
      <Breadcrumb segments={[
        { label: "Haldur", href: "/haldur" },
        { label: "Korteriühistud", href: "/haldur/uhistud" },
        { label: orgName || "Ühistu", href: `/haldur/uhistud/${orgId}` },
        { label: building.name },
      ]} />

      <ContextHeader
        entityName={building.name}
        entityType="Hoone"
        parentContext={orgName ? `${orgName}` : undefined}
        actions={[
          { label: "Ava korterid", href: `#apartments`, variant: "primary" as const, icon: "Home" },
        ]}
      />

      {/* Apartments */}
      <section id="apartments">
        <div className="flex items-center justify-between mb-4">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
            Korterid ({apartments.length})
          </h2>
          <div className="flex gap-2">
            <details className="relative">
              <summary className="text-sm text-slate-500 hover:text-slate-700 cursor-pointer list-none">Veel ▾</summary>
              <div className="absolute right-0 top-6 z-10 bg-white border border-slate-200 rounded-lg shadow-lg p-1 min-w-[140px]">
                <Link href={`/haldur/uhistud/${orgId}/hooned/${buildingId}/muuda`} className="block px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-md">Muuda hoonet</Link>
              </div>
            </details>
          </div>
        </div>

        {apartments.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-600">
            Kortereid pole veel lisatud.
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Nr</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Korrus</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Pind m²</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Elanikke</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {apartments.map((apt: any) => (
                  <tr key={apt.id} className="hover:bg-slate-50 cursor-pointer"
                    onClick={() => router.push(`/haldur/uhistud/${orgId}/hooned/${buildingId}/korter/${apt.id}`)}>
                    <td className="px-4 py-3 font-medium text-slate-900">{apt.unitLabel}</td>
                    <td className="px-4 py-3 text-slate-600">{apt.floor ?? "—"}</td>
                    <td className="px-4 py-3 text-slate-600">{apt.areaSqm ?? "—"}</td>
                    <td className="px-4 py-3 text-slate-600">{apt.occupancy}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Inline create apartment form — simple */}
        <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6">
          <h3 className="font-semibold text-slate-700 mb-3">Lisa korter</h3>
          <ApartmentCreateForm buildingId={buildingId} orgId={orgId} onCreated={() => window.location.reload()} />
        </div>
      </section>
    </div>
  );
}

function ApartmentCreateForm({ buildingId, orgId, onCreated }: { buildingId: string; orgId: string; onCreated: () => void }) {
  const [unitLabel, setUnitLabel] = useState("");
  const [floor, setFloor] = useState("");
  const [areaSqm, setAreaSqm] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!unitLabel.trim()) return;
    setLoading(true);
    const token = localStorage.getItem("kuhik_token");
    if (!token) return;

    try {
      const res = await fetch(`/api/v1/buildings/${buildingId}/apartments`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ unitLabel: unitLabel.trim(), floor: floor ? parseInt(floor) : null, areaSqm: areaSqm ? parseFloat(areaSqm) : null }),
      });
      const data = await res.json();
      if (data.success) {
        setUnitLabel(""); setFloor(""); setAreaSqm("");
        onCreated();
      }
    } catch {}
    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap gap-3 items-end">
      <div>
        <label className="block text-xs text-slate-500 mb-1">Korteri nr *</label>
        <input value={unitLabel} onChange={e => setUnitLabel(e.target.value)} required className="w-24 px-3 py-2 border border-slate-300 rounded-lg text-sm" placeholder="A1" />
      </div>
      <div>
        <label className="block text-xs text-slate-500 mb-1">Korrus</label>
        <input type="number" value={floor} onChange={e => setFloor(e.target.value)} className="w-20 px-3 py-2 border border-slate-300 rounded-lg text-sm" />
      </div>
      <div>
        <label className="block text-xs text-slate-500 mb-1">Pind m²</label>
        <input type="number" step="0.1" value={areaSqm} onChange={e => setAreaSqm(e.target.value)} className="w-24 px-3 py-2 border border-slate-300 rounded-lg text-sm" />
      </div>
      <button type="submit" disabled={loading} className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50">
        {loading ? "..." : "Lisa"}
      </button>
    </form>
  );
}