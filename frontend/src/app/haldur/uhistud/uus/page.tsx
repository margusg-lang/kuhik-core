"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Breadcrumb from "@/components/haldur/Breadcrumb";

export default function NewOrgPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [registryCode, setRegistryCode] = useState("");
  const [address, setAddress] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    setError(null);

    const token = localStorage.getItem("kuhik_token");
    if (!token) { setError("Palun logi sisse"); setLoading(false); return; }

    try {
      const res = await fetch("/api/v1/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: name.trim(), registryCode: registryCode || null, address: address || null, contactEmail: contactEmail || null }),
      });
      const data = await res.json();
      if (data.success) {
        router.push(`/haldur/uhistud/${data.data.id}`);
      } else {
        setError(data.error || "Viga ühistu loomisel");
      }
    } catch {
      setError("Ühenduse viga");
    }
    setLoading(false);
  }

  return (
    <div className="p-8 max-w-xl">
      <Breadcrumb segments={[
        { label: "Haldur", href: "/haldur" },
        { label: "Korteriühistud", href: "/haldur/uhistud" },
        { label: "Lisa ühistu" },
      ]} />
      <h1 className="text-2xl font-bold text-slate-900 mt-4">Lisa korteriühistu</h1>
      <p className="mt-1 mb-8 text-slate-600">Sisesta ühistu põhiandmed</p>
      <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-slate-200 bg-white p-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Ühistu nimi *</label>
          <input value={name} onChange={e => setName(e.target.value)} required className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" placeholder="nt Mustamäe 12 KÜ" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Registrikood</label>
          <input value={registryCode} onChange={e => setRegistryCode(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" placeholder="12345678" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Aadress</label>
          <input value={address} onChange={e => setAddress(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" placeholder="Mustamäe tee 12, Tallinn" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Kontakt e-post</label>
          <input type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" placeholder="info@ymhistu.ee" />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button type="submit" disabled={loading} className="w-full bg-brand-600 text-white py-2.5 rounded-lg font-medium hover:bg-brand-700 disabled:opacity-50">
          {loading ? "Loome..." : "Loo ühistu"}
        </button>
      </form>
    </div>
  );
}