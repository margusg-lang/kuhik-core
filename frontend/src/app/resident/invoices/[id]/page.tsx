"use client";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, FileText, Euro } from "lucide-react";

const typeNames: Record<string, string> = {
  electricity: "Elekter",
  water: "Vesi",
  heating: "Küte",
  gas: "Gaas",
  other: "Muu",
};

const statusLabels: Record<string, string> = {
  draft: "Mustand",
  issued: "Väljastatud",
  partially_paid: "Osaliselt makstud",
  paid: "Makstud",
};

export default function ResidentInvoiceDetailPage() {
  const params = useParams();
  const [invoice, setInvoice] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("kuhik_token");
    if (!token) return;

    fetch(`/api/v1/invoices/${params.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(data => {
        if (data.success) setInvoice(data.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [params.id]);

  if (loading) {
    return <div className="text-slate-500 py-12 text-center">Laen...</div>;
  }

  if (!invoice) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
        <FileText className="mx-auto h-12 w-12 text-slate-300" />
        <p className="mt-4 text-slate-600">Arvet ei leitud.</p>
        <Link href="/resident/invoices" className="mt-4 inline-flex items-center gap-1 text-sm text-teal-600 hover:underline">
          <ArrowLeft className="h-4 w-4" /> Tagasi arvete juurde
        </Link>
      </div>
    );
  }

  const totalPaid = (invoice.payments || []).reduce((s: number, p: any) => s + p.amount, 0);
  const balanceDue = invoice.totalAmount - totalPaid;

  return (
    <div>
      <Link href="/resident/invoices" className="inline-flex items-center gap-1 text-sm text-teal-600 hover:text-teal-700 mb-6">
        <ArrowLeft className="h-4 w-4" /> Tagasi arvete juurde
      </Link>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-xl font-bold text-slate-900">{invoice.invoiceNumber}</h1>
              <p className="text-sm text-slate-500 mt-1">
                {invoice.apartment?.unitLabel || "—"} — {invoice.apartment?.building?.name || ""}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                {new Date(invoice.periodStart).toLocaleDateString("et-EE")} – {new Date(invoice.periodEnd).toLocaleDateString("et-EE")}
              </p>
            </div>
            <span className={`inline-block px-3 py-1 rounded text-xs font-medium ${
              invoice.status === "paid" ? "bg-green-100 text-green-700" :
              invoice.status === "partially_paid" ? "bg-amber-100 text-amber-700" :
              invoice.status === "draft" ? "bg-slate-100 text-slate-500" :
              "bg-blue-100 text-blue-700"
            }`}>
              {statusLabels[invoice.status] || invoice.status}
            </span>
          </div>
        </div>

        {/* Line items */}
        <div className="p-6 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900 mb-3">Arve read</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="pb-2 text-left font-medium text-slate-600">Kulu tüüp</th>
                <th className="pb-2 text-right font-medium text-slate-600">Summa</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {(invoice.items || []).map((item: any) => (
                <tr key={item.id}>
                  <td className="py-2 text-slate-900">{typeNames[item.costType] || item.costType}</td>
                  <td className="py-2 text-right font-medium text-slate-900">{item.amount.toFixed(2)} €</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-slate-200">
                <td className="pt-3 font-semibold text-slate-900">Kokku</td>
                <td className="pt-3 text-right font-bold text-lg text-slate-900">{invoice.totalAmount.toFixed(2)} €</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Payment summary */}
        <div className="p-6">
          <h2 className="font-semibold text-slate-900 mb-3">Maksed</h2>
          {(invoice.payments || []).length === 0 ? (
            <p className="text-sm text-slate-500">Makseid pole veel tehtud.</p>
          ) : (
            <div className="space-y-2">
              {(invoice.payments || []).map((p: any) => (
                <div key={p.id} className="flex justify-between text-sm py-1">
                  <span className="text-slate-600">
                    {new Date(p.paidAt).toLocaleDateString("et-EE")} — {p.method === "bank_transfer" ? "Pangaülekanne" : p.method}
                  </span>
                  <span className="font-medium text-green-700">–{p.amount.toFixed(2)} €</span>
                </div>
              ))}
              <div className="border-t border-slate-200 pt-2 mt-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Makstud kokku</span>
                  <span className="font-semibold text-green-700">{totalPaid.toFixed(2)} €</span>
                </div>
                {balanceDue > 0 && (
                  <div className="flex justify-between text-sm mt-1">
                    <span className="text-slate-600">Jaak</span>
                    <span className="font-bold text-amber-700">{balanceDue.toFixed(2)} €</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}