"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";

export default function ApartmentMetersPage({ params }: { params: Promise<{ id: string; buildingId: string; aptId: string }> }) {
  const [orgId, setOrgId] = useState("");
  const [aptId, setAptId] = useState("");
  const [meters, setMeters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [meterType, setMeterType] = useState("water");
  const [unit, setUnit] = useState("m3");
  const [serialNumber, setSerialNumber] = useState("");
  const [label, setLabel] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    params.then(p => { setOrgId(p.id); setAptId(p.aptId); });
  }, [params]);

  useEffect(() => {
    if (!aptId) return;
    const token = localStorage.getItem("kuhik_token");
    if (!token) return;
    fetch(`/api/v1/apartments/${aptId}/meters`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then(r => r.json()).then(data => {
      if (data.success) setMeters(data.data);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [aptId]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const token = localStorage.getItem("kuhik_token");
    if (!token) return;
    try {
      const res = await fetch(`/api/v1/apartments/${aptId}/meters`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ meterType, unit, serialNumber: serialNumber || null, label: label || null }),
      });
      const data = await res.json();
      if (data.success) { setMeters(prev => [...prev, data.data]); setShowForm(false); setLabel(""); setSerialNumber(""); }
    } catch {}
    setSaving(false);
  }

  const typeNames: Record<string, string> = { water: "Vesi", electricity: "Elekter", heating: "Küte", gas: "Gaas" };

  return (
    <div className="p-8">
      <Link href={`/haldur/uhistud/${orgId}/hooned/${aptId.split('').join('')}`} className="text-sm text-brand-600 hover:underline">← Tagasi</Link>
      <div className="mt-4 mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Arvestid</h1>
        <button onClick={() => setShowForm(!showForm)} className="inline-flex items-center gap-1 rounded-lg bg-brand-600 px-4 py-2 text-sm text-white hover:bg-brand-700">
          <Plus className="h-4 w-4" /> {showForm ? "Sulge" : "Lisa arvesti"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="mb-8 rounded-xl border border-brand-200 bg-brand-50 p-6 space-y-3">
          <div className="grid gap-4 sm:grid-cols-4">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Tüüp</label>
              <select value={meterType} onChange={e => setMeterType(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm">
                <option value="water">Vesi</option>
                <option value="electricity">Elekter</option>
                <option value="heating">Küte</option>
                <option value="gas">Gaas</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Ühik</label>
              <select value={unit} onChange={e => setUnit(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm">
                <option value="m3">m³</option>
                <option value="kWh">kWh</option>
                <option value="MWh">MWh</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Seerianumber</label>
              <input value={serialNumber} onChange={e => setSerialNumber(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" placeholder="123456" />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Nimetus</label>
              <input value={label} onChange={e => setLabel(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" placeholder="nt külm vesi" />
            </div>
          </div>
          <button type="submit" disabled={saving} className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50">
            {saving ? "..." : "Salvesta"}
          </button>
        </form>
      )}

      {loading && <div className="text-slate-600">Laen...</div>}

      {!loading && meters.length === 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-slate-600">Sellel korteril pole arvesteid.</div>
      )}

      {meters.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {meters.map((m: any) => (
            <Link key={m.id} href={`/haldur/uhistud/${orgId}/hooned/${aptId.split('').join('')}/korter/${aptId}/arvestid/${m.id}`}
              className="rounded-xl border border-slate-200 bg-white p-5 hover:shadow-md transition-all hover:-translate-y-0.5">
              <div className="text-lg font-bold text-brand-700">{typeNames[m.meterType] || m.meterType}</div>
              <div className="text-sm text-slate-500 mt-1">{m.unit}</div>
              {m.label && <div className="text-xs text-slate-400 mt-1">{m.label}</div>}
              {m.serialNumber && <div className="text-xs text-slate-400">SN: {m.serialNumber}</div>}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}