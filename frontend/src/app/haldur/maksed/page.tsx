"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Icon } from "@/components/haldur/Icons";
import Breadcrumb from "@/components/haldur/Breadcrumb";
import ContextHeader from "@/components/haldur/ContextHeader";
import { getToken } from "@/lib/auth";

export default function PaymentsPage() {
  const [orgs, setOrgs] = useState<any[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState("");
  const [selectedOrgName, setSelectedOrgName] = useState("");
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    fetch("/api/v1/organizations", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(data => {
        if (data.success) {
          setOrgs(data.data);
          if (data.data.length > 0) {
            setSelectedOrgId(data.data[0].id);
            setSelectedOrgName(data.data[0].name);
          }
        }
      })
      .catch(() => {}).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedOrgId) return;
    const token = getToken();
    if (!token) return;
    fetch(`/api/v1/organizations/${selectedOrgId}/payments`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(data => { if (data.success) setPayments(data.data); })
      .catch(() => {});
  }, [selectedOrgId]);

  const totalReceived = payments.reduce((s: number, p: any) => s + p.amount, 0);

  return (
    <div className="p-8">
      <Breadcrumb segments={[
        { label: "Haldur", href: "/haldur" },
        { label: "Finants", href: "/haldur" },
        { label: "Maksed" },
      ]} />

      <ContextHeader
        entityName={selectedOrgName ? `${selectedOrgName} — Maksed` : "Maksed"}
        entityType="Finants"
        actions={[
          { label: "Lisa makse", variant: "primary" as const, icon: "Euro" },
          { label: "Vaata arveid", href: "/haldur/arved", icon: "FileText" },
        ]}
      />

      <div className="mb-6">
        <select value={selectedOrgId} onChange={e => {
          setSelectedOrgId(e.target.value);
          const org = orgs.find(o => o.id === e.target.value);
          if (org) setSelectedOrgName(org.name);
        }} className="px-3 py-2 border border-slate-300 rounded-lg text-sm">
          {orgs.map((o: any) => <option key={o.id} value={o.id}>{o.name}</option>)}
        </select>
      </div>

      {payments.length > 0 && (
        <div className="mb-6 bg-green-50 rounded-xl border border-green-200 p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon name="Euro" />
            <span className="text-sm text-green-800">Laekunud makseid kokku:</span>
          </div>
          <span className="text-lg font-bold text-green-900">{totalReceived.toFixed(2)} €</span>
        </div>
      )}

      {loading && <div className="text-slate-600">Laen...</div>}

      {!loading && payments.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
          <div className="mx-auto h-12 w-12 text-slate-300 flex items-center justify-center"><Icon name="Euro" /></div>
          <p className="mt-4 text-slate-600">Makseid pole veel laekunud.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Kuupäev</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Arve nr</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Korter</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Meetod</th>
                <th className="px-4 py-3 text-right font-medium text-slate-600">Summa</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {payments.map((p: any) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-600">{new Date(p.paidAt).toLocaleDateString("et-EE")}</td>
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {p.invoice?.invoiceNumber ? (
                      <Link href="/haldur/arved" className="text-brand-600 hover:underline">{p.invoice.invoiceNumber}</Link>
                    ) : "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{p.invoice?.apartment?.unitLabel || "—"}</td>
                  <td className="px-4 py-3 text-slate-600">{p.method === "bank_transfer" ? "Pangaülekanne" : p.method || "—"}</td>
                  <td className="px-4 py-3 text-right font-medium text-green-700">{p.amount.toFixed(2)} €</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-slate-200 bg-slate-50">
                <td colSpan={4} className="px-4 py-3 font-semibold text-slate-900">Kokku</td>
                <td className="px-4 py-3 text-right font-bold text-slate-900">{totalReceived.toFixed(2)} €</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}