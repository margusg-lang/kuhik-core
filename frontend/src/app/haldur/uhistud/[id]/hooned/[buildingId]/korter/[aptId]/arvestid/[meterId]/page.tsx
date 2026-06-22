"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

export default function MeterDetailPage({ params }: { params: Promise<{ id: string; buildingId: string; aptId: string; meterId: string }> }) {
  const [orgId, setOrgId] = useState("");
  const [meterId, setMeterId] = useState("");
  const [meter, setMeter] = useState<any>(null);
  const [readings, setReadings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newValue, setNewValue] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    params.then(p => { setOrgId(p.id); setMeterId(p.meterId); });
  }, [params]);

  useEffect(() => {
    if (!meterId) return;
    const token = localStorage.getItem("kuhik_token");
    if (!token) return;

    Promise.all([
      fetch(`/api/v1/meters/${meterId}`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      fetch(`/api/v1/meters/${meterId}/readings`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
    ]).then(([meterData, readingData]) => {
      if (meterData.success) setMeter(meterData.data);
      if (readingData.success) setReadings(readingData.data);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [meterId]);

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

  const typeNames: Record<string, string> = { water: "Vesi", electricity: "Elekter", heating: "Küte", gas: "Gaas" };

  if (loading) return <div className="p-8 text-slate-600">Laen...</div>;
  if (!meter) return <div className="p-8 text-slate-600">Arvestit ei leitud.</div>;

  return (
    <div className="p-8">
      <Link href={`/haldur/uhistud/${orgId}/hooned/${orgId}/korter/${meterId.split('').join('')}/arvestid`} className="text-sm text-brand-600 hover:underline">← Tagasi arvestite juurde</Link>

      <div className="mt-4 mb-6">
        <h1 className="text-2xl font-bold text-slate-900">{typeNames[meter.meterType] || meter.meterType}</h1>
        <div className="flex flex-wrap gap-4 text-sm text-slate-600 mt-1">
          <span>Ühik: {meter.unit}</span>
          {meter.serialNumber && <span>SN: {meter.serialNumber}</span>}
          {meter.label && <span>{meter.label}</span>}
        </div>
      </div>

      {/* Add reading form */}
      <form onSubmit={handleAddReading} className="mb-8 flex items-end gap-3">
        <div>
          <label className="block text-xs text-slate-500 mb-1">Lisa näit ({meter.unit})</label>
          <input type="number" step="0.001" value={newValue} onChange={e => setNewValue(e.target.value)} required className="w-40 px-3 py-2 border border-slate-300 rounded-lg text-sm" placeholder="0.000" />
        </div>
        <button type="submit" disabled={saving} className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50">
          {saving ? "..." : "Salvesta"}
        </button>
      </form>

      {/* Reading history */}
      <section>
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Näitude ajalugu ({readings.length})</h2>
        {readings.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-600">Näite pole veel lisatud.</div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Väärtus</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Aeg</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Allikas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {readings.map((r: any) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">{r.value} {meter.unit}</td>
                    <td className="px-4 py-3 text-slate-600">{new Date(r.timestamp).toLocaleDateString("et-EE")}</td>
                    <td className="px-4 py-3 text-slate-600">{r.source === "manual" ? "Käsitsi" : "Import"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}