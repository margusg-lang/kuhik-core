"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Home, FileText, Gauge, Building2, Euro, ArrowRight } from "lucide-react";

export default function ResidentDashboard() {
  const [profile, setProfile] = useState<any>(null);
  const [apartment, setApartment] = useState<any>(null);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("kuhik_token");
    if (!token) return;

    fetch("/api/v1/me/profile", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(async (profileData) => {
        if (!profileData.success) return;
        setProfile(profileData.data);
        const orgId = profileData.data.organizations[0]?.id;
        if (!orgId) return;

        // Fetch apartment + invoices in parallel
        const [aptRes, invRes] = await Promise.all([
          fetch(`/api/v1/me/organizations/${orgId}/apartment`, {
            headers: { Authorization: `Bearer ${token}` },
          }).then(r => r.json()),
          fetch(`/api/v1/organizations/${orgId}/invoices`, {
            headers: { Authorization: `Bearer ${token}` },
          }).then(r => r.json()),
        ]);

        if (aptRes.success) setApartment(aptRes.data);
        if (invRes.success) setInvoices(invRes.data.slice(0, 5));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="text-slate-500 py-12 text-center">Laen...</div>;
  }

  const totalDue = invoices
    .filter((i: any) => i.status === "issued" || i.status === "partially_paid")
    .reduce((sum: number, i: any) => sum + i.totalAmount, 0);

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-2">Ülevaade</h1>
      <p className="text-slate-600 mb-8">Tere tulemast elaniku portaali!</p>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-2 text-teal-600 mb-2">
            <Home className="h-5 w-5" />
            <span className="text-xs font-semibold uppercase tracking-wider">Korter</span>
          </div>
          <p className="text-lg font-bold text-slate-900">
            {apartment?.apartment?.unitLabel || "—"}
          </p>
          <p className="text-xs text-slate-500">
            {apartment?.apartment?.building?.name || ""}
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-2 text-blue-600 mb-2">
            <FileText className="h-5 w-5" />
            <span className="text-xs font-semibold uppercase tracking-wider">Arved</span>
          </div>
          <p className="text-lg font-bold text-slate-900">{invoices.length}</p>
          <p className="text-xs text-slate-500">Kokku arveid</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-2 text-amber-600 mb-2">
            <Euro className="h-5 w-5" />
            <span className="text-xs font-semibold uppercase tracking-wider">Tähtaegsed</span>
          </div>
          <p className="text-lg font-bold text-slate-900">{totalDue.toFixed(2)} €</p>
          <p className="text-xs text-slate-500">Tasumata arved</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-2 text-purple-600 mb-2">
            <Building2 className="h-5 w-5" />
            <span className="text-xs font-semibold uppercase tracking-wider">Ühistu</span>
          </div>
          <p className="text-lg font-bold text-slate-900">{profile?.organizations?.[0]?.name || "—"}</p>
          <p className="text-xs text-slate-500">{profile?.organizations?.[0]?.registryCode || ""}</p>
        </div>
      </div>

      {/* Recent invoices */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">Viimased arved</h2>
          <Link href="/resident/invoices" className="flex items-center gap-1 text-sm text-teal-600 hover:text-teal-700 font-medium">
            Kõik arved <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        {invoices.length === 0 ? (
          <div className="p-8 text-center text-slate-500">Arveid pole veel.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {invoices.map((inv: any) => (
              <Link key={inv.id} href={`/resident/invoices/${inv.id}`} className="flex items-center justify-between px-6 py-3 hover:bg-slate-50 transition-colors">
                <div>
                  <p className="text-sm font-medium text-slate-900">{inv.invoiceNumber}</p>
                  <p className="text-xs text-slate-500">
                    {new Date(inv.periodStart).toLocaleDateString("et-EE")} – {new Date(inv.periodEnd).toLocaleDateString("et-EE")}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-slate-900">{inv.totalAmount.toFixed(2)} €</span>
                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                    inv.status === "paid" ? "bg-green-100 text-green-700" :
                    inv.status === "partially_paid" ? "bg-amber-100 text-amber-700" :
                    "bg-slate-100 text-slate-700"
                  }`}>
                    {inv.status === "paid" ? "Makstud" : inv.status === "partially_paid" ? "Osaliselt" : "Väljastatud"}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Quick links */}
      <div className="grid gap-3 sm:grid-cols-3 mt-8">
        <Link href="/resident/apartment" className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition-shadow flex items-center gap-3">
          <Building2 className="h-8 w-8 text-teal-600" />
          <div>
            <p className="font-medium text-slate-900">Minu korter</p>
            <p className="text-xs text-slate-500">Vaata korteri andmeid</p>
          </div>
        </Link>
        <Link href="/resident/meters" className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition-shadow flex items-center gap-3">
          <Gauge className="h-8 w-8 text-blue-600" />
          <div>
            <p className="font-medium text-slate-900">Näidud</p>
            <p className="text-xs text-slate-500">Arvestite näidud</p>
          </div>
        </Link>
        <Link href="/resident/invoices" className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition-shadow flex items-center gap-3">
          <FileText className="h-8 w-8 text-amber-600" />
          <div>
            <p className="font-medium text-slate-900">Arved</p>
            <p className="text-xs text-slate-500">Arvete ajalugu</p>
          </div>
        </Link>
      </div>
    </div>
  );
}