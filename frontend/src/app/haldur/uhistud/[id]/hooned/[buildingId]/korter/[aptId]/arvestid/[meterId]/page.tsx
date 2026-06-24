"use client";
import { useState, useEffect } from "react";
import { Icon } from "@/components/haldur/Icons";
import Breadcrumb from "@/components/haldur/Breadcrumb";
import ContextHeader from "@/components/haldur/ContextHeader";

export default function MeterDetailPage({ params }: { params: { id: string; buildingId: string; aptId: string; meterId: string } }) {
  const [orgId, setOrgId] = useState("");
  const [buildingId, setBuildingId] = useState("");
  const [aptId, setAptId] = useState("");
  const [meterId, setMeterId] = useState("");

  useEffect(() => {
    if (params && typeof params === "object") {
      const p = params as { id: string; buildingId: string; aptId: string; meterId: string };
      setOrgId(p.id || "");
      setBuildingId(p.buildingId || "");
      setAptId(p.aptId || "");
      setMeterId(p.meterId || "");
    }
  }, [params]);

  const [meter, setMeter] = useState<any>(null);
  const [aptLabel, setAptLabel] = useState("");
  const [buildingName, setBuildingName] = useState("");
  const [orgName, setOrgName] = useState("");
  const [readings, setReadings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newValue, setNewValue] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!meterId || !aptId) return;
    const token = localStorage.getItem("kuhik_token");
    if (!token) return;
    Promise.all([
      fetch(`/api/v1/meters/${meterId}`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      fetch(`/api/v1/meters/${meterId}/readings`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      fetch(`/api/v1/apartments/${aptId}`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      fetch(`/api/v1/buildings/${buildingId}`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      fetch(`/api/v1/organizations/${orgId}`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
    ]).then(([mData, rData, aptData, bldData, orgData]) => {
      if (mData.success) setMeter(mData.data);
      if (rData.success) setReadings(rData.data);
      if (aptData.success) setAptLabel(aptData.data.unitLabel);
      if (bldData.success) setBuildingName(bldData.data.name);
      if (orgData.success) setOrgName(orgData.data.name);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [meterId, aptId, buildingId, orgId]);

  async function handleAddReading(e: React.FormEvent) {
    e.preventDefault();
    if (!newValue) return;
    setSaving(true);
    const token = localStorage.getItem("kuhik_token");
    if (!token) return;
    try {
      const res = await fetch(`/api/v1/meters/${meterId}/readings`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ value: parseFloat(newValue) }),
      });
      const data = await res.json();
      if (data.success) {
        setReadings(prev => [data.data, ...prev]);
        setNewValue("");
      }
    } catch {}
    setSaving(false);
  }

  if (loading) return <div className="p-8 text-slate-600">Laen...</div>;
  if (!meter) return <div className="p-8 text-slate-600">Arvestit ei leitud.</div>;

  return (
    <div className="p-8">
      <Breadcrumb segments={[
        { label: "Haldur", href: "/haldur" },
        { label: "Korteriühistud", href: "/haldur/uhistud" },
        { label: orgName || "Ühistu", href: `/haldur/uhistud/${orgId}` },
        { label: buildingName || "Hoone", href: `/haldur/uhistud/${orgId}/hooned/${buildingId}` },
        { label: aptLabel ? `Korter ${aptLabel}` : "Korter", href: `/haldur/uhistud/${orgId}/hooned/${buildingId}/korter/${aptId}` },
        { label: "Arvestid", href: `/haldur/uhistud/${orgId}/hooned/${buildingId}/korter/${aptId}/arvestid` },
        { label: meter.label || meter.serialNumber || "Arvesti" },
      ]} />

      <ContextHeader
        entityName={meter.label || meter.serialNumber || "Arvesti"}
        entityType="Arvesti"
        parentContext={`Korter ${aptLabel} / ${buildingName || ""} / ${orgName || ""}`}
        actions={[
          { label: "Sisesta näit", variant: "primary" as const, icon: "Gauge" },
          { label: "Ava korter", href: `/haldur/uhistud/${orgId}/hooned/${buildingId}/korter/${aptId}`, icon: "Home" },
          { label: "Käivita jaotus", href: `/haldur/jaotused`, icon: "Scale" },
        ]}
      />

      <div className="mb-8">
        <p className="text-sm text-slate-500">Tüüp: {meter.meterType} · Ühik: {meter.unit}</p>
      </div>

      {/* Add reading */}
      <form onSubmit={handleAddReading} className="mb-8 flex items-end gap-3">
        <div>
          <label className="block text-xs text-slate-500 mb-1">Uus näit</label>
          <input type="number" step="0.1" value={newValue} onChange={e => setNewValue(e.target.value)} required
            className="w-32 px-3 py-2 border border-slate-300 rounded-lg text-sm" placeholder="0.0" />
        </div>
        <button type="submit" disabled={saving}
          className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50">
          {saving ? "..." : "Sisesta"}
        </button>
      </form>

      {/* Readings */}
      <h2 className="text-lg font-semibold text-slate-900 mb-3">Näidud ({readings.length})</h2>
      {readings.length === 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-600">Näite pole veel sisestatud.</div>
      )}
      {readings.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Kuupäev</th>
                <th className="px-4 py-3 text-right font-medium text-slate-600">Väärtus</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {readings.map((r: any) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-600">{new Date(r.timestamp).toLocaleDateString("et-EE")}</td>
                  <td className="px-4 py-3 text-right font-medium text-slate-900">{r.value.toFixed(1)} {meter.unit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}