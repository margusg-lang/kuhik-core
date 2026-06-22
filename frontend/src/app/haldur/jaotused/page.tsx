"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Play } from "lucide-react";

const typeNames: Record<string, string> = { electricity: "Elekter", water: "Vesi", heating: "Küte", gas: "Gaas", other: "Muu" };

export default function AllocationPage() {
  const [orgs, setOrgs] = useState<any[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState("");
  const [runs, setRuns] = useState<any[]>([]);
  const [selectedRun, setSelectedRun] = useState<any>(null);
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<string>("");

  useEffect(() => {
    const token = localStorage.getItem("kuhik_token");
    if (!token) return;
    fetch("/api/v1/organizations", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(data => { if (data.success) { setOrgs(data.data); if (data.data.length > 0) setSelectedOrgId(data.data[0].id); } })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedOrgId) return;
    const token = localStorage.getItem("kuhik_token");
    if (!token) return;
    fetch(`/api/v1/organizations/${selectedOrgId}/allocation/runs`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(data => { if (data.success) setRuns(data.data); })
      .catch(() => {});
  }, [selectedOrgId]);

  async function handleRun(e: React.FormEvent) {
    e.preventDefault();
    if (!periodStart || !periodEnd) return;
    setRunning(true); setResult(""); setSelectedRun(null);
    const token = localStorage.getItem("kuhik_token");
    if (!token) return;
    try {
      const res = await fetch(`/api/v1/organizations/${selectedOrgId}/allocation/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ periodStart, periodEnd }),
      });
      const data = await res.json();
      if (data.success) {
        setSelectedRun(data.data);
        setRuns(prev => [data.data, ...prev]);
        setResult(`Jaotus tehtud: ${data.data.meta?.summary || "OK"}`);
      } else {
        setResult("Viga: " + (data.error || "teadmata"));
      }
    } catch { setResult("Viga"); }
    setRunning(false);
  }

  async function viewRun(runId: string) {
    const token = localStorage.getItem("kuhik_token");
    if (!token) return;
    const res = await fetch(`/api/v1/allocation/runs/${runId}`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    if (data.success) setSelectedRun(data.data);
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Kulude jaotus</h1>
        <p className="text-sm text-slate-600 mt-1">Kommunaalkulude jagamine korterite vahel</p>
      </div>

      <div className="mb-6">
        <select value={selectedOrgId} onChange={e => setSelectedOrgId(e.target.value)} className="px-3 py-2 border border-slate-300 rounded-lg text-sm">
          {orgs.map((o: any) => <option key={o.id} value={o.id}>{o.name}</option>)}
        </select>
      </div>

      <form onSubmit={handleRun} className="mb-8 flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs text-slate-500 mb-1">Periood algus</label>
          <input type="date" value={periodStart} onChange={e => setPeriodStart(e.target.value)} required className="px-3 py-2 border border-slate-300 rounded-lg text-sm" />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Periood lõpp</label>
          <input type="date" value={periodEnd} onChange={e => setPeriodEnd(e.target.value)} required className="px-3 py-2 border border-slate-300 rounded-lg text-sm" />
        </div>
        <button type="submit" disabled={running} className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50 inline-flex items-center gap-1">
          <Play className="h-4 w-4" /> {running ? "..." : "Käivita jaotus"}
        </button>
      </form>

      {result && <div className="mb-4 p-3 bg-blue-50 text-blue-700 rounded-lg text-sm">{result}</div>}

      {selectedRun && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-slate-900 mb-3">Jaotuse detailid ({selectedRun.items?.length || 0} rida)</h2>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Korter</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Kulu tüüp</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Meetod</th>
                  <th className="px-4 py-3 text-right font-medium text-slate-600">Summa</th>
                  <th className="px-4 py-3 text-right font-medium text-slate-600">Osakaal %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(selectedRun.items || []).map((item: any) => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">{item.apartment?.unitLabel || "—"}</td>
                    <td className="px-4 py-3 text-slate-600">{typeNames[item.costType] || item.costType}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${item.method === "meter_based" ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-700"}`}>
                        {item.method === "meter_based" ? "Arvesti" : "Võrdselt"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-slate-900">{item.amount.toFixed(2)} €</td>
                    <td className="px-4 py-3 text-right text-slate-600">{item.consumptionPct != null ? `${item.consumptionPct}%` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <section>
        <h2 className="text-lg font-semibold text-slate-900 mb-3">Varasemad jaotused</h2>
        {runs.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-600">Jaotusi pole veel tehtud.</div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Periood</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Kirjeid</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Staatus</th>
                  <th className="px-4 py-3 text-right font-medium text-slate-600"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {runs.map((run: any) => (
                  <tr key={run.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-600">
                      {new Date(run.periodStart).toLocaleDateString("et-EE")} – {new Date(run.periodEnd).toLocaleDateString("et-EE")}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{run._count?.items || 0}</td>
                    <td className="px-4 py-3">
                      <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700">{run.status}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => viewRun(run.id)} className="text-sm text-brand-600 hover:underline">Vaata</button>
                    </td>
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