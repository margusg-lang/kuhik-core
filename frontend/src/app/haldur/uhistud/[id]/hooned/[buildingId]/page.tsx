"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";

export default function BuildingDetailPage({ params }: { params: Promise<{ id: string; buildingId: string }> }) {
  const [orgId, setOrgId] = useState("");
  const [buildingId, setBuildingId] = useState("");
  const [building, setBuilding] = useState<any>(null);
  const [apartments, setApartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    params.then(p => { setOrgId(p.id); setBuildingId(p.buildingId); });
  }, [params]);

  useEffect(() => {
    if (!buildingId) return;
    const token = localStorage.getItem("kuhik_token");
    if (!token) return;

    Promise.all([
      fetch(`/api/v1/buildings/${buildingId}`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      fetch(`/api/v1/buildings/${buildingId}/apartments`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
    ])
      .then(([bldData, aptData]) => {
        if (bldData.success) setBuilding(bldData.data);
        if (aptData.success) setApartments(aptData.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [buildingId]);

  if (loading) return <div className="p-8 text-slate-600">Laen...</div>;
  if (!building) return <div className="p-8 text-slate-600">Hoonet ei leitud.</div>;

  return (
    <div className="p-8">
      <Link href={`/haldur/uhistud/${orgId}`} className="text-sm text-brand-600 hover:underline">← Tagasi ühistu juurde</Link>
      <div className="mt-2 mb-8">
        <h1 className="text-2xl font-bold text-slate-900">{building.name}</h1>
        {building.address && <p className="text-slate-600 text-sm mt-1">{building.address}</p>}
      </div>

      {/* Apartments */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
            Korterid ({apartments.length})
          </h2>
          <div className="flex gap-2">
            <Link href={`/haldur/uhistud/${orgId}/hooned/${buildingId}/muuda`} className="text-sm text-brand-600 hover:underline">Muuda hoonet</Link>
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
                  <tr key={apt.id} className="hover:bg-slate-50">
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