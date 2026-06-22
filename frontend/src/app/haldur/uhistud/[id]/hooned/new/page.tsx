"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function NewBuildingPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [orgId, setOrgId] = useState("");
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useState(() => { params.then(p => setOrgId(p.id)); });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true); setError(null);
    const token = localStorage.getItem("kuhik_token");
    if (!token) { setError("Palun logi sisse"); setLoading(false); return; }

    try {
      const res = await fetch(`/api/v1/organizations/${orgId}/buildings`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: name.trim(), address: address || null }),
      });
      const data = await res.json();
      if (data.success) {
        router.push(`/haldur/uhistud/${orgId}/hooned/${data.data.id}`);
      } else {
        setError(data.error || "Viga");
      }
    } catch { setError("Ühenduse viga"); }
    setLoading(false);
  }

  return (
    <div className="p-8 max-w-xl">
      <Link href={`/haldur/uhistud/${orgId}`} className="text-sm text-brand-600 hover:underline">← Tagasi</Link>
      <h1 className="text-2xl font-bold text-slate-900 mt-4">Lisa hoone</h1>
      <form onSubmit={handleSubmit} className="mt-6 space-y-4 rounded-xl border border-slate-200 bg-white p-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Hoone nimi *</label>
          <input value={name} onChange={e => setName(e.target.value)} required className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" placeholder="nt Mustamäe tee 12" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Aadress</label>
          <input value={address} onChange={e => setAddress(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" placeholder="Mustamäe tee 12, Tallinn" />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button type="submit" disabled={loading} className="w-full bg-brand-600 text-white py-2.5 rounded-lg font-medium hover:bg-brand-700 disabled:opacity-50">
          {loading ? "..." : "Loo hoone"}
        </button>
      </form>
    </div>
  );
}