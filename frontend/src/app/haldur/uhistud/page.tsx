"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Building2, Plus, Home } from "lucide-react";

export default function UhistudPage() {
  const [orgs, setOrgs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("kuhik_token");
    if (!token) return;

    fetch("/api/v1/organizations", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setOrgs(data.data);
        else setError(data.error || "Viga laadimisel");
      })
      .catch(() => setError("Ühenduse viga"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Korteriühistud</h1>
          <p className="mt-1 text-slate-600">Halda kõiki oma ühistuid</p>
        </div>
        <Link href="/haldur/uhistud/uus" className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">
          <Plus className="h-4 w-4" /> Lisa ühistu
        </Link>
      </div>

      {loading && <div className="text-slate-600">Laen...</div>}
      {error && <div className="bg-red-50 text-red-700 p-4 rounded-lg text-sm">{error}</div>}

      {!loading && !error && orgs.length === 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
          <Building2 className="mx-auto h-12 w-12 text-slate-300" />
          <p className="mt-4 text-slate-600">Ühistuid pole veel lisatud.</p>
          <Link href="/haldur/uhistud/uus" className="mt-4 inline-flex items-center gap-2 text-brand-600 hover:underline text-sm">
            Lisa esimene ühistu
          </Link>
        </div>
      )}

      {orgs.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Nimi</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Registrikood</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Roll</th>
                <th className="px-4 py-3 text-right font-medium text-slate-600"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {orgs.map((org: any) => (
                <tr key={org.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">{org.name}</td>
                  <td className="px-4 py-3 text-slate-600">{org.registryCode || "—"}</td>
                  <td className="px-4 py-3 text-slate-600">{org.role}</td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/haldur/uhistud/${org.id}`} className="font-medium text-brand-600 hover:underline">Ava</Link>
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