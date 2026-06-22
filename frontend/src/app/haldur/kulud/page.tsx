"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, Trash2 } from "lucide-react";

const typeNames: Record<string, string> = { electricity: "Elekter", water: "Vesi", heating: "Küte", gas: "Gaas", other: "Muu" };

export default function CostsPage() {
  const [orgs, setOrgs] = useState<any[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState("");
  const [costs, setCosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [type, setType] = useState("electricity");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("kuhik_token");
    if (!token) return;
    fetch("/api/v1/organizations", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(data => { if (data.success) { setOrgs(data.data); if (data.data.length > 0) setSelectedOrgId(data.data[0].id); } })
      .catch(() => {}).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedOrgId) return;
    const token = localStorage.getItem("kuhik_token");
    if (!token) return;
    fetch(`/api/v1/organizations/${selectedOrgId}/costs`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(data => { if (data.success) setCosts(data.data); })
      .catch(() => {});
  }, [selectedOrgId]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const token = localStorage.getItem("kuhik_token");
    if (!token) return;
    try {
      const res = await fetch(`/api/v1/organizations/${selectedOrgId}/costs`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ type, periodStart, periodEnd, totalAmount: parseFloat(totalAmount), supplierName: supplierName || null, description: description || null }),
      });
      const data = await res.json();
      if (data.success) { setCosts(prev => [data.data, ...prev]); setShowForm(false); setTotalAmount(""); setSupplierName(""); setDescription(""); }
    } catch {}
    setSaving(false);
  }

  async function handleDelete(id: string) {
    const token = localStorage.getItem("kuhik_token");
    if (!token) return;
    try {
      const res = await fetch(`/api/v1/utility-costs/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.success) setCosts(prev => prev.filter((c: any) => c.id !== id));
    } catch {}
  }

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Kulud</h1>
          <p className="text-sm text-slate-600 mt-1">Organisatsiooni kommunaalkulude arvestus</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="inline-flex items-center gap-1 rounded-lg bg-brand-600 px-4 py-2 text-sm text-white hover:bg-brand-700">
          <Plus className="h-4 w-4" /> {showForm ? "Sulge" : "Lisa kulu"}
        </button>
      </div>

      {/* Org selector */}
      <div className="mb-6">
        <select value={selectedOrgId} onChange={e => setSelectedOrgId(e.target.value)} className="px-3 py-2 border border-slate-300 rounded-lg text-sm">
          {orgs.map((o: any) => <option key={o.id} value={o.id}>{o.name}</option>)}
        </select>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="mb-8 rounded-xl border border-brand-200 bg-brand-50 p-6 space-y-3">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Tüüp</label>
              <select value={type} onChange={e => setType(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm">
                {Object.entries(typeNames).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Periood algus *</label>
              <input type="date" value={periodStart} onChange={e => setPeriodStart(e.target.value)} required className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Periood lõpp *</label>
              <input type="date" value={periodEnd} onChange={e => setPeriodEnd(e.target.value)} required className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Summa (EUR) *</label>
              <input type="number" step="0.01" value={totalAmount} onChange={e => setTotalAmount(e.target.value)} required className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" placeholder="0.00" />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Tarnija</label>
              <input value={supplierName} onChange={e => setSupplierName(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" placeholder="nt Eesti Energia" />
            </div>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Kirjeldus</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" rows={2} />
          </div>
          <button type="submit" disabled={saving} className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50">
            {saving ? "..." : "Salvesta"}
          </button>
        </form>
      )}

      {costs.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-slate-600">Kulusid pole veel lisatud.</div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Tüüp</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Periood</th>
                <th className="px-4 py-3 text-right font-medium text-slate-600">Summa</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Tarnija</th>
                <th className="px-4 py-3 text-right font-medium text-slate-600"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {costs.map((c: any) => (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">{typeNames[c.type] || c.type}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {new Date(c.periodStart).toLocaleDateString("et-EE")} – {new Date(c.periodEnd).toLocaleDateString("et-EE")}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-slate-900">{c.totalAmount.toFixed(2)} €</td>
                  <td className="px-4 py-3 text-slate-600">{c.supplierName || "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => handleDelete(c.id)} className="text-red-500 hover:text-red-700"><Trash2 className="h-4 w-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}