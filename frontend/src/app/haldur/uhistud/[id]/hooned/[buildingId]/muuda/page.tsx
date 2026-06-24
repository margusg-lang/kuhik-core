"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Breadcrumb from "@/components/haldur/Breadcrumb";

export default function EditBuildingPage({ params }: { params: { id: string; buildingId: string } }) {
  const router = useRouter();
  const [orgId, setOrgId] = useState("");
  const [buildingId, setBuildingId] = useState("");
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (params && typeof params === "object") {
      const p = params as { id: string; buildingId: string };
      setOrgId(p.id || "");
      setBuildingId(p.buildingId || "");
    }
  }, [params]);

  useEffect(() => {
    if (!buildingId) return;
    const token = localStorage.getItem("kuhik_token");
    if (!token) return;
    fetch(`/api/v1/buildings/${buildingId}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => { if (data.success) { setName(data.data.name); setAddress(data.data.address || ""); } })
      .catch(() => setError("Viga laadimisel"))
      .finally(() => setLoading(false));
  }, [buildingId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true); setError(null);
    const token = localStorage.getItem("kuhik_token");
    if (!token) { setError("Palun logi sisse"); setSaving(false); return; }
    try {
      const res = await fetch(`/api/v1/buildings/${buildingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: name.trim(), address: address || null }),
      });
      const data = await res.json();
      if (data.success) {
        router.push(`/haldur/uhistud/${orgId}/hooned/${buildingId}`);
      } else {
        setError(data.error || "Viga");
      }
    } catch { setError("Ühenduse viga"); }
    setSaving(false);
  }

  if (loading) return <div className="p-8 text-slate-600">Laen...</div>;
  return (
    <div className="p-8 max-w-xl">
      <Breadcrumb segments={[
        { label: "Haldur", href: "/haldur" },
        { label: "Korteriühistud", href: "/haldur/uhistud" },
        { label: "Ühistu", href: `/haldur/uhistud/${orgId}` },
        { label: "Hoone", href: `/haldur/uhistud/${orgId}/hooned/${buildingId}` },
        { label: "Muuda" },
      ]} />
      <h1 className="text-2xl font-bold text-slate-900 mt-4">Muuda hoonet</h1>
      <form onSubmit={handleSubmit} className="mt-6 space-y-4 rounded-xl border border-slate-200 bg-white p-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Hoone nimi *</label>
          <input value={name} onChange={e => setName(e.target.value)} required className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Aadress</label>
          <input value={address} onChange={e => setAddress(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button type="submit" disabled={saving} className="w-full bg-brand-600 text-white py-2.5 rounded-lg font-medium hover:bg-brand-700 disabled:opacity-50">
          {saving ? "..." : "Salvesta"}
        </button>
      </form>
    </div>
  );
}