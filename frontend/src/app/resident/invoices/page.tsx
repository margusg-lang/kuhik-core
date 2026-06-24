"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { FileText, ArrowRight, Euro } from "lucide-react";

const statusLabels: Record<string, string> = {
  draft: "Mustand",
  issued: "Väljastatud",
  partially_paid: "Osaliselt makstud",
  paid: "Makstud",
};

export default function ResidentInvoicesPage() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("kuhik_token");
    if (!token) return;

    fetch("/api/v1/me/profile", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(async (profileData) => {
        if (!profileData.success) return;
        const orgId = profileData.data.organizations[0]?.id;
        if (!orgId) return;

        const res = await fetch(`/api/v1/organizations/${orgId}/invoices`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.success) setInvoices(data.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const totalUnpaid = invoices
    .filter((i: any) => i.status !== "paid")
    .reduce((s: number, i: any) => s + i.totalAmount, 0);

  if (loading) {
    return <div className="text-slate-500 py-12 text-center">Laen...</div>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-2">Arved</h1>
      <p className="text-slate-600 mb-8">Kõik minu arved</p>

      {invoices.length > 0 && (
        <div className="mb-6 bg-amber-50 rounded-xl border border-amber-200 p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Euro className="h-5 w-5 text-amber-600" />
            <span className="text-sm text-amber-800">Tasumata arved kokku:</span>
          </div>
          <span className="text-lg font-bold text-amber-900">{totalUnpaid.toFixed(2)} €</span>
        </div>
      )}

      {invoices.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <FileText className="mx-auto h-12 w-12 text-slate-300" />
          <p className="mt-4 text-slate-600">Arveid pole veel.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Arve nr</th>
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
                  <td className="px-4 py-3 text-slate-600">
                    {new Date(inv.periodStart).toLocaleDateString("et-EE")} – {new Date(inv.periodEnd).toLocaleDateString("et-EE")}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-900">{inv.totalAmount.toFixed(2)} €</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                      inv.status === "paid" ? "bg-green-100 text-green-700" :
                      inv.status === "partially_paid" ? "bg-amber-100 text-amber-700" :
                      inv.status === "draft" ? "bg-slate-100 text-slate-500" :
                      "bg-blue-100 text-blue-700"
                    }`}>
                      {statusLabels[inv.status] || inv.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/resident/invoices/${inv.id}`} className="text-sm text-teal-600 hover:text-teal-700 font-medium inline-flex items-center gap-1">
                      Vaata <ArrowRight className="h-3 w-3" />
                    </Link>
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