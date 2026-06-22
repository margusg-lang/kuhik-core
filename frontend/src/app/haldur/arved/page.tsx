"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { FileText } from "lucide-react";

const typeNames: Record<string, string> = { electricity: "Elekter", water: "Vesi", heating: "Küte", gas: "Gaas", other: "Muu" };

export default function InvoicesPage() {
  const [orgs, setOrgs] = useState<any[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState("");
  const [invoices, setInvoices] = useState<any[]>([]);
  const [runs, setRuns] = useState<any[]>([]);
  const [selectedRunId, setSelectedRunId] = useState("");
  const [generating, setGenerating] = useState(false);
  const [detail, setDetail] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("kuhik_token");
    if (!token) return;
    fetch("/api/v1/organizations", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(data => { if (data.success) { setOrgs(data.data); if (data.data.length > 0) setSelectedOrgId(data.data[0].id); } });
  }, []);

  useEffect(() => {
    if (!selectedOrgId) return;
    const token = localStorage.getItem("kuhik_token");
    if (!token) return;
    setLoading(true);
    Promise.all([
      fetch(`/api/v1/organizations/${selectedOrgId}/invoices`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      fetch(`/api/v1/organizations/${selectedOrgId}/allocation/runs`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
    ]).then(([invData, runData]) => {
      if (invData.success) setInvoices(invData.data);
      if (runData.success) setRuns(runData.data);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [selectedOrgId]);

  async function handleGenerate() {
    if (!selectedRunId) return;
    setGenerating(true);
    const token = localStorage.getItem("kuhik_token");
    if (!token) return;
    try {
      const res = await fetch(`/api/v1/invoices/generate/${selectedRunId}`, {
        method: "POST", headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setInvoices(prev => [...data.data, ...prev]);
        setSelectedRunId("");
      }
    } catch {}
    setGenerating(false);
  }

  async function viewDetail(id: string) {
    const token = localStorage.getItem("kuhik_token");
    if (!token) return;
    const res = await fetch(`/api/v1/invoices/${id}`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    if (data.success) setDetail(data.data);
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Arved</h1>
        <p className="text-sm text-slate-600 mt-1">Korterite arved ja nende detailid</p>
      </div>

      <div className="mb-6">
        <select value={selectedOrgId} onChange={e => setSelectedOrgId(e.target.value)} className="px-3 py-2 border border-slate-300 rounded-lg text-sm">
          {orgs.map((o: any) => <option key={o.id} value={o.id}>{o.name}</option>)}
        </select>
      </div>

      {/* Generate from allocation */}
      {runs.length > 0 && (
        <div className="mb-8 flex items-end gap-3 p-4 bg-brand-50 rounded-xl border border-brand-200">
          <div>
            <label className="block text-xs text-slate-500 mb-1">Genereeri arved jaotusest</label>
            <select value={selectedRunId} onChange={e => setSelectedRunId(e.target.value)} className="px-3 py-2 border border-slate-300 rounded-lg text-sm min-w-[200px]">
              <option value="">Vali jaotus...</option>
              {runs.map((r: any) => (
                <option key={r.id} value={r.id}>
                  {new Date(r.periodStart).toLocaleDateString("et-EE")} – {new Date(r.periodEnd).toLocaleDateString("et-EE")}
                </option>
              ))}
            </select>
          </div>
          <button onClick={handleGenerate} disabled={!selectedRunId || generating} className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50">
            {generating ? "..." : "Genereeri"}
          </button>
        </div>
      )}

      {/* Detail view */}
      {detail && (
        <div className="mb-8 rounded-xl border border-slate-200 bg-white p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Arve {detail.invoiceNumber}</h2>
              <p className="text-sm text-slate-500">
                {detail.apartment?.unitLabel || "—"} — {detail.apartment?.building?.name || ""}
              </p>
              <p className="text-xs text-slate-400">
                {new Date(detail.periodStart).toLocaleDateString("et-EE")} – {new Date(detail.periodEnd).toLocaleDateString("et-EE")}
              </p>
            </div>
            <span className="text-xl font-bold text-slate-900">{detail.totalAmount.toFixed(2)} €</span>
          </div>
          <table className="w-full text-sm">
            <thead><tr><th className="text-left font-medium text-slate-600 pb-2">Kulu tüüp</th><th className="text-right font-medium text-slate-600 pb-2">Summa</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {(detail.items || []).map((item: any) => (
                <tr key={item.id}>
                  <td className="py-2 text-slate-900">{typeNames[item.costType] || item.costType}</td>
                  <td className="py-2 text-right text-slate-900">{item.amount.toFixed(2)} €</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-slate-200">
                <td className="pt-2 font-semibold text-slate-900">Kokku</td>
                <td className="pt-2 text-right font-bold text-slate-900">{detail.totalAmount.toFixed(2)} €</td>
              </tr>
            </tfoot>
          </table>
          <button onClick={() => setDetail(null)} className="mt-4 text-sm text-slate-500 hover:text-slate-700">Sulge</button>
        </div>
      )}

      {/* Invoices list */}
      {loading && <div className="text-slate-600">Laen...</div>}

      {!loading && invoices.length === 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-slate-600">
          <FileText className="mx-auto h-12 w-12 text-slate-300" />
          <p className="mt-4">Arveid pole veel genereeritud.</p>
          <p className="text-xs mt-2">Käivita esmalt jaotus (Wave 5) ja vajuta "Genereeri".</p>
        </div>
      )}

      {invoices.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Arve nr</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Korter</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Periood</th>
                <th className="px-4 py-3 text-right font-medium text-slate-600">Summa</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Staatus</th>
                <th className="px-4 py-3 text-right font-medium text-slate-600"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {invoices.map((inv: any) => (
                <tr key={inv.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">{inv.invoiceNumber}</td>
                  <td className="px-4 py-3 text-slate-600">{inv.apartment?.unitLabel || "—"}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {new Date(inv.periodStart).toLocaleDateString("et-EE")} – {new Date(inv.periodEnd).toLocaleDateString("et-EE")}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-slate-900">{inv.totalAmount.toFixed(2)} €</td>
                  <td className="px-4 py-3">
                    <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700">{inv.status}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => viewDetail(inv.id)} className="text-sm text-brand-600 hover:underline">Vaata</button>
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