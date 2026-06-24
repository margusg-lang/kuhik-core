"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Icon } from "@/components/haldur/Icons";
import Breadcrumb from "@/components/haldur/Breadcrumb";
import ContextHeader from "@/components/haldur/ContextHeader";

const typeNames: Record<string, string> = { water: "Vesi", electricity: "Elekter", heating: "Küte", gas: "Gaas" };

export default function OrgMetersPage({ params }: { params: { id: string } }) {
  const [orgId, setOrgId] = useState("");

  useEffect(() => {
    if (params && typeof params === "object") {
      setOrgId((params as { id: string }).id || "");
    }
  }, [params]);

  const [orgName, setOrgName] = useState("");
  const [buildings, setBuildings] = useState<any[]>([]);
  const [selectedBuildingId, setSelectedBuildingId] = useState("");
  const [apartments, setApartments] = useState<any[]>([]);
  const [selectedApartmentId, setSelectedApartmentId] = useState("");
  const [meters, setMeters] = useState<any[]>([]);
  const [selectedMeter, setSelectedMeter] = useState<any>(null);
  const [readings, setReadings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [showMeterForm, setShowMeterForm] = useState(false);
  const [meterType, setMeterType] = useState("water");
  const [serialNumber, setSerialNumber] = useState("");
  const [unit, setUnit] = useState("m³");
  const [label, setLabel] = useState("");
  const [saving, setSaving] = useState(false);

  const [readingValue, setReadingValue] = useState("");
  const [readingDate, setReadingDate] = useState("");
  const [savingReading, setSavingReading] = useState(false);

  useEffect(() => {
    if (!orgId) return;
    const token = localStorage.getItem("kuhik_token");
    if (!token) return;
    Promise.all([
      fetch(`/api/v1/organizations/${orgId}`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      fetch(`/api/v1/organizations/${orgId}/buildings`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
    ]).then(([orgData, bldData]) => {
      if (orgData.success) setOrgName(orgData.data.name);
      if (bldData.success) setBuildings(bldData.data);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [orgId]);

  useEffect(() => {
    if (!selectedBuildingId) { setApartments([]); return; }
    const token = localStorage.getItem("kuhik_token");
    if (!token) return;
    fetch(`/api/v1/buildings/${selectedBuildingId}/apartments`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(data => { if (data.success) setApartments(data.data); })
      .catch(() => {});
  }, [selectedBuildingId]);

  useEffect(() => {
    if (!selectedApartmentId) { setMeters([]); return; }
    const token = localStorage.getItem("kuhik_token");
    if (!token) return;
    fetch(`/api/v1/apartments/${selectedApartmentId}/meters`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(data => { if (data.success) setMeters(data.data); })
      .catch(() => {});
  }, [selectedApartmentId]);

  async function loadReadings(meterId: string) {
    const token = localStorage.getItem("kuhik_token");
    if (!token) return;
    const res = await fetch(`/api/v1/meters/${meterId}/readings`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    if (data.success) { setReadings(data.data); }
  }

  return (
    <div className="p-8">
      <Breadcrumb segments={[
        { label: "Haldur", href: "/haldur" },
        { label: "Korteriühistud", href: "/haldur/uhistud" },
        { label: orgName || "Ühistu", href: `/haldur/uhistud/${orgId}` },
        { label: "Arvestid ja näidud" },
      ]} />

      <ContextHeader
        entityName="Arvestid ja näidud"
        entityType="Arvesti"
        parentContext={orgName || undefined}
        actions={[]}
      />

      <div className="mb-6 flex flex-wrap gap-3">
        <div>
          <label className="block text-xs text-slate-500 mb-1">Hoone</label>
          <select value={selectedBuildingId} onChange={e => { setSelectedBuildingId(e.target.value); setSelectedApartmentId(""); setSelectedMeter(null); }}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm min-w-[200px]">
            <option value="">Vali hoone...</option>
            {buildings.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Korter</label>
          <select value={selectedApartmentId} onChange={e => { setSelectedApartmentId(e.target.value); setSelectedMeter(null); }}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm min-w-[200px]">
            <option value="">Vali korter...</option>
            {apartments.map((a: any) => <option key={a.id} value={a.id}>{a.unitLabel}</option>)}
          </select>
        </div>
      </div>

      {selectedApartmentId && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
              <Icon name="Gauge" /> Arvestid ({meters.length})
            </h2>
            <button onClick={() => setShowMeterForm(!showMeterForm)} className="inline-flex items-center gap-1 text-sm text-brand-600 hover:underline">
              <Icon name="Plus" /> {showMeterForm ? "Sulge" : "Lisa arvesti"}
            </button>
          </div>

          {showMeterForm && (
            <MeterCreateForm
              apartmentId={selectedApartmentId}
              onCreated={(m) => { setMeters(prev => [...prev, m]); setShowMeterForm(false); }}
            />
          )}

          {meters.length === 0 && !showMeterForm && (
            <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-600">Sellel korteril pole arvesteid.</div>
          )}

          <div className="grid gap-4 lg:grid-cols-2">
            <div>
              {meters.length > 0 && (
                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                  <table className="w-full text-sm">
                    <thead className="border-b border-slate-200 bg-slate-50">
                      <tr>
                        <th className="px-4 py-3 text-left font-medium text-slate-600">Tüüp</th>
                        <th className="px-4 py-3 text-left font-medium text-slate-600">Nimetus</th>
                        <th className="px-4 py-3 text-left font-medium text-slate-600">Ühik</th>
                        <th className="px-4 py-3 text-right font-medium text-slate-600"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {meters.map((m: any) => (
                        <tr key={m.id} className={`hover:bg-slate-50 cursor-pointer ${selectedMeter?.id === m.id ? "bg-blue-50" : ""}`}
                          onClick={() => { setSelectedMeter(m); setReadings([]); loadReadings(m.id); }}>
                          <td className="px-4 py-3 font-medium text-slate-900">{typeNames[m.meterType] || m.meterType}</td>
                          <td className="px-4 py-3 text-slate-600">{m.label || m.serialNumber || "—"}</td>
                          <td className="px-4 py-3 text-slate-600">{m.unit}</td>
                          <td className="px-4 py-3 text-right text-brand-600 text-xs">{selectedMeter?.id === m.id ? "✓" : ""}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div>
              {selectedMeter && (
                <ReadingPanel
                  meter={selectedMeter}
                  readings={readings}
                  onReadingAdded={() => loadReadings(selectedMeter.id)}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {loading && <div className="text-slate-600">Laen...</div>}
      {!loading && !selectedBuildingId && (
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-slate-600">
          <div className="mx-auto h-12 w-12 text-slate-300 flex items-center justify-center"><Icon name="Gauge" /></div>
          <p className="mt-4">Vali hoone ja korter, et näha arvesteid.</p>
        </div>
      )}
    </div>
  );
}

function MeterCreateForm({ apartmentId, onCreated }: { apartmentId: string; onCreated: (m: any) => void }) {
  const [meterType, setMeterType] = useState("water");
  const [serialNumber, setSerialNumber] = useState("");
  const [unit, setUnit] = useState("m³");
  const [label, setLabel] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const token = localStorage.getItem("kuhik_token");
    if (!token) return;
    try {
      const res = await fetch(`/api/v1/apartments/${apartmentId}/meters`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ meterType, serialNumber: serialNumber || null, unit: unit || "m³", label: label || null }),
      });
      const data = await res.json();
      if (data.success) onCreated(data.data);
    } catch {}
    setSaving(false);
  }

  return (
    <form onSubmit={handleSubmit} className="mb-4 rounded-xl border border-blue-200 bg-blue-50 p-4 flex flex-wrap gap-3 items-end">
      <div>
        <label className="block text-xs text-slate-500 mb-1">Tüüp *</label>
        <select value={meterType} onChange={e => setMeterType(e.target.value)} className="px-3 py-2 border border-slate-300 rounded-lg text-sm">
          <option value="water">Vesi</option><option value="electricity">Elekter</option><option value="heating">Küte</option><option value="gas">Gaas</option>
        </select>
      </div>
      <div>
        <label className="block text-xs text-slate-500 mb-1">Seerianumber</label>
        <input value={serialNumber} onChange={e => setSerialNumber(e.target.value)} className="w-40 px-3 py-2 border border-slate-300 rounded-lg text-sm" placeholder="SN-001" />
      </div>
      <div>
        <label className="block text-xs text-slate-500 mb-1">Ühik</label>
        <input value={unit} onChange={e => setUnit(e.target.value)} className="w-20 px-3 py-2 border border-slate-300 rounded-lg text-sm" />
      </div>
      <div>
        <label className="block text-xs text-slate-500 mb-1">Nimetus</label>
        <input value={label} onChange={e => setLabel(e.target.value)} className="w-40 px-3 py-2 border border-slate-300 rounded-lg text-sm" placeholder="nt Köögi vesi" />
      </div>
      <button type="submit" disabled={saving} className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50">
        {saving ? "..." : "Salvesta"}
      </button>
    </form>
  );
}

function ReadingPanel({ meter, readings, onReadingAdded }: { meter: any; readings: any[]; onReadingAdded: () => void }) {
  const [readingValue, setReadingValue] = useState("");
  const [readingDate, setReadingDate] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!readingValue) return;
    setSaving(true);
    const token = localStorage.getItem("kuhik_token");
    if (!token) return;
    try {
      const res = await fetch(`/api/v1/meters/${meter.id}/readings`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ value: parseFloat(readingValue), timestamp: readingDate || new Date().toISOString().split("T")[0] }),
      });
      const data = await res.json();
      if (data.success) { setReadingValue(""); setReadingDate(""); onReadingAdded(); }
    } catch {}
    setSaving(false);
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
        <h3 className="font-semibold text-slate-900">{typeNames[meter.meterType] || meter.meterType} — {meter.label || meter.serialNumber || "Arvesti"}</h3>
      </div>
      <form onSubmit={handleSubmit} className="px-4 py-3 border-b border-slate-100 flex flex-wrap gap-2 items-end">
        <div>
          <label className="block text-xs text-slate-500 mb-1">Näit *</label>
          <input type="number" step="0.1" value={readingValue} onChange={e => setReadingValue(e.target.value)} required
            className="w-28 px-3 py-2 border border-slate-300 rounded-lg text-sm" placeholder="0.0" />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Kuupäev</label>
          <input type="date" value={readingDate} onChange={e => setReadingDate(e.target.value)}
            className="w-36 px-3 py-2 border border-slate-300 rounded-lg text-sm" />
        </div>
        <button type="submit" disabled={saving} className="bg-brand-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50">
          {saving ? "..." : "Sisesta"}
        </button>
      </form>
      {readings.length === 0 && <div className="px-4 py-6 text-center text-sm text-slate-400">Näite pole veel sisestatud.</div>}
      {readings.length > 0 && (
        <div className="divide-y divide-slate-50">
          {readings.map((r: any) => (
            <div key={r.id} className="flex justify-between px-4 py-2 text-sm">
              <span className="text-slate-500">{new Date(r.timestamp).toLocaleDateString("et-EE")}</span>
              <span className="font-medium text-slate-900">{r.value.toFixed(1)} {meter.unit}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}