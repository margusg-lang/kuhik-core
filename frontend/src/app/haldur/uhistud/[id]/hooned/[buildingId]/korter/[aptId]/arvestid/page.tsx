"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/haldur/Icons";
import Breadcrumb from "@/components/haldur/Breadcrumb";
import ContextHeader from "@/components/haldur/ContextHeader";

export default function ApartmentMetersPage({ params }: { params: { id: string; buildingId: string; aptId: string } }) {
  const router = useRouter();
  const [orgId, setOrgId] = useState("");
  const [buildingId, setBuildingId] = useState("");
  const [aptId, setAptId] = useState("");

  useEffect(() => {
    if (params && typeof params === "object") {
      const p = params as { id: string; buildingId: string; aptId: string };
      setOrgId(p.id || "");
      setBuildingId(p.buildingId || "");
      setAptId(p.aptId || "");
    }
  }, [params]);

  const [aptLabel, setAptLabel] = useState("");
  const [buildingName, setBuildingName] = useState("");
  const [orgName, setOrgName] = useState("");
  const [meters, setMeters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [meterType, setMeterType] = useState("water");
  const [unit, setUnit] = useState("m3");
  const [serialNumber, setSerialNumber] = useState("");
  const [label, setLabel] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!aptId || !orgId) return;
    const token = localStorage.getItem("kuhik_token");
    if (!token) return;
    Promise.all([
      fetch(`/api/v1/apartments/${aptId}`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      fetch(`/api/v1/buildings/${buildingId}`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      fetch(`/api/v1/organizations/${orgId}`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      fetch(`/api/v1/apartments/${aptId}/meters`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
    ]).then(([aptData, bldData, orgData, meterData]) => {
      if (aptData.success) setAptLabel(aptData.data.unitLabel);
      if (bldData.success) setBuildingName(bldData.data.name);
      if (orgData.success) setOrgName(orgData.data.name);
      if (meterData.success) setMeters(meterData.data);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [aptId, orgId, buildingId]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const token = localStorage.getItem("kuhik_token");
    if (!token) return;
    try {
      const res = await fetch(`/api/v1/apartments/${aptId}/meters`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ meterType, serialNumber: serialNumber || null, unit, label: label || null }),
      });
      const data = await res.json();
      if (data.success) { setMeters(prev => [...prev, data.data]); setShowForm(false); setSerialNumber(""); setLabel(""); }
    } catch {}
    setSaving(false);
  }

  return (
    <div className="p-8">
      <Breadcrumb segments={[
        { label: "Haldur", href: "/haldur" },
        { label: "Korteriühistud", href: "/haldur/uhistud" },
        { label: orgName || "Ühistu", href: `/haldur/uhistud/${orgId}` },
        { label: buildingName || "Hoone", href: `/haldur/uhistud/${orgId}/hooned/${buildingId}` },
        { label: aptLabel ? `Korter ${aptLabel}` : "Korter", href: `/haldur/uhistud/${orgId}/hooned/${buildingId}/korter/${aptId}` },
        { label: "Arvestid" },
      ]} />

      <ContextHeader
        entityName={aptLabel ? `Korter ${aptLabel} — Arvestid` : "Arvestid"}
        entityType="Arvesti"
        parentContext={buildingName ? `${buildingName} / ${orgName || ""}` : undefined}
        actions={[
          { label: "Sisesta näit", variant: "primary" as const, icon: "Gauge", onClick: () => {
            if (meters.length > 0) {
              router.push(`/haldur/uhistud/${orgId}/hooned/${buildingId}/korter/${aptId}/arvestid/${meters[0].id}`);
            }
          }},
          { label: showForm ? "Sulge" : "Lisa arvesti", icon: "Plus" },
        ]}
      />

      {showForm && (
        <form onSubmit={handleAdd} className="mb-8 rounded-xl border border-blue-200 bg-blue-50 p-4 flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs text-slate-500 mb-1">Tüüp</label>
            <select value={meterType} onChange={e => setMeterType(e.target.value)} className="px-3 py-2 border border-slate-300 rounded-lg text-sm">
              <option value="water">Vesi</option><option value="electricity">Elekter</option><option value="heating">Küte</option><option value="gas">Gaas</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Seerianumber</label>
            <input value={serialNumber} onChange={e => setSerialNumber(e.target.value)} className="w-36 px-3 py-2 border border-slate-300 rounded-lg text-sm" />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Ühik</label>
            <input value={unit} onChange={e => setUnit(e.target.value)} className="w-20 px-3 py-2 border border-slate-300 rounded-lg text-sm" />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Nimetus</label>
            <input value={label} onChange={e => setLabel(e.target.value)} className="w-40 px-3 py-2 border border-slate-300 rounded-lg text-sm" />
          </div>
          <button type="submit" disabled={saving} className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50">
            {saving ? "..." : "Salvesta"}
          </button>
        </form>
      )}

      {loading && <div className="text-slate-600">Laen...</div>}

      {!loading && meters.length === 0 && !showForm && (
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-slate-600">Sellel korteril pole arvesteid.</div>
      )}

      {meters.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {meters.map((m: any) => (
            <Link key={m.id} href={`/haldur/uhistud/${orgId}/hooned/${buildingId}/korter/${aptId}/arvestid/${m.id}`}
              className="rounded-xl border border-slate-200 bg-white p-5 hover:shadow-md transition-all hover:-translate-y-0.5">
              <div className="flex items-center gap-3 mb-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-50 text-cyan-600"><Icon name="Gauge" /></div>
                <div>
                  <h3 className="font-semibold text-slate-900">{m.meterType}</h3>
                  <p className="text-xs text-slate-500">{m.label || m.serialNumber || "—"}</p>
                </div>
              </div>
              <p className="text-xs text-slate-400">Ühik: {m.unit}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}