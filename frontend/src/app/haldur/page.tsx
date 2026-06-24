"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import Breadcrumb from "@/components/haldur/Breadcrumb";
import { Icon } from "@/components/haldur/Icons";
import { getToken } from "@/lib/auth";

interface QuickStat {
  label: string;
  value: string;
  icon: string;
  color: string;
}

export default function HaldurDashboardPage() {
  const [orgCount, setOrgCount] = useState(0);
  const [invoiceCount, setInvoiceCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    Promise.all([
      fetch("/api/v1/organizations", { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
    ])
      .then(([orgData]) => {
        if (orgData.success) setOrgCount(orgData.data.length);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-8">
      <Breadcrumb segments={[
        { label: "Haldur" },
      ]} />

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Tere tulemast, haldur!</h1>
        <p className="text-slate-600">Kuhik halduskeskkond — vali ühistu alustamiseks</p>
      </div>

      {/* Primary Action — giant card like eesti.ee "Sisene iseteenindusse" */}
      <Link
        href="/haldur/uhistud"
        className="block bg-white rounded-xl border-2 border-brand-200 p-8 hover:shadow-lg transition-all hover:-translate-y-0.5 mb-8 max-w-lg"
      >
        <div className="flex items-center gap-4 mb-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-100 text-brand-600">
            <Icon name="Building2" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">Korteriühistud</h2>
            <p className="text-sm text-slate-500">{orgCount} ühistut</p>
          </div>
        </div>
        <p className="text-sm text-slate-600 mb-4">
          KÜ-de haldus, hoonete ja korterite haldamine, kulude jaotamine, arvete genereerimine
        </p>
        <div className="inline-flex items-center gap-2 bg-brand-600 text-white px-5 py-2 rounded-lg text-sm font-semibold">
          Ava ühistu ➡
        </div>
      </Link>

      {/* Quick domain links — like eesti.ee quick-action cards */}
      <div className="mb-8">
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Finants</h2>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/haldur/kulud"
            className="bg-white border border-slate-200 rounded-lg px-4 py-3 text-sm text-slate-700 hover:border-brand-200 hover:text-brand-700 transition-colors flex items-center gap-2"
          >
            <Icon name="Coins" /> Kulud
          </Link>
          <Link
            href="/haldur/jaotused"
            className="bg-white border border-slate-200 rounded-lg px-4 py-3 text-sm text-slate-700 hover:border-brand-200 hover:text-brand-700 transition-colors flex items-center gap-2"
          >
            <Icon name="Scale" /> Jaotused
          </Link>
          <Link
            href="/haldur/arved"
            className="bg-white border border-slate-200 rounded-lg px-4 py-3 text-sm text-slate-700 hover:border-brand-200 hover:text-brand-700 transition-colors flex items-center gap-2"
          >
            <Icon name="FileText" /> Arved
          </Link>
          <Link
            href="/haldur/maksed"
            className="bg-white border border-slate-200 rounded-lg px-4 py-3 text-sm text-slate-700 hover:border-brand-200 hover:text-brand-700 transition-colors flex items-center gap-2"
          >
            <Icon name="Euro" /> Maksed
          </Link>
        </div>
      </div>
    </div>
  );
}