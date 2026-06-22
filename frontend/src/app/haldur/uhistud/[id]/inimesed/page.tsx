"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { UserPlus } from "lucide-react";

export default function PeopleListPage({ params }: { params: Promise<{ id: string }> }) {
  const [orgId, setOrgId] = useState("");
  const [people, setPeople] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Create person form state
  const [showForm, setShowForm] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    params.then(p => setOrgId(p.id));
  }, [params]);

  useEffect(() => {
    if (!orgId) return;
    const token = localStorage.getItem("kuhik_token");
    if (!token) return;

    fetch(`/api/v1/organizations/${orgId}/people`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(data => { if (data.success) setPeople(data.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [orgId]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName.trim()) return;
    setCreating(true);
    const token = localStorage.getItem("kuhik_token");
    if (!token) return;

    try {
      const res = await fetch(`/api/v1/organizations/${orgId}/people`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ fullName: fullName.trim(), email: email || null, phone: phone || null }),
      });
      const data = await res.json();
      if (data.success) {
        setPeople(prev => [...prev, data.data]);
        setFullName(""); setEmail(""); setPhone("");
        setShowForm(false);
      }
    } catch {}
    setCreating(false);
  }

  return (
    <div className="p-8">
      <Link href={`/haldur/uhistud/${orgId}`} className="text-sm text-brand-600 hover:underline">← Tagasi ühistu juurde</Link>
      <div className="mt-4 mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Isikud ja kontaktid</h1>
          <p className="text-slate-600 text-sm mt-1">Kõik selle organisatsiooniga seotud inimesed</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="inline-flex items-center gap-1 rounded-lg bg-brand-600 px-4 py-2 text-sm text-white hover:bg-brand-700">
          <UserPlus className="h-4 w-4" /> {showForm ? "Sulge" : "Lisa isik"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="mb-8 rounded-xl border border-brand-200 bg-brand-50 p-6 space-y-3">
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Nimi *</label>
              <input value={fullName} onChange={e => setFullName(e.target.value)} required className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" placeholder="Mari Mets" />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">E-post</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" placeholder="mari@example.com" />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Telefon</label>
              <input value={phone} onChange={e => setPhone(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" placeholder="+372 5123 4567" />
            </div>
          </div>
          <button type="submit" disabled={creating} className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50">
            {creating ? "..." : "Salvesta"}
          </button>
        </form>
      )}

      {loading && <div className="text-slate-600">Laen...</div>}

      {!loading && people.length === 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-slate-600">
          Isikuid pole veel lisatud.
        </div>
      )}

      {people.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Nimi</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">E-post</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Telefon</th>
                <th className="px-4 py-3 text-right font-medium text-slate-600"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {people.map((p: any) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">{p.fullName}</td>
                  <td className="px-4 py-3 text-slate-600">{p.email || "—"}</td>
                  <td className="px-4 py-3 text-slate-600">{p.phone || "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/haldur/uhistud/${orgId}/inimesed/${p.id}`} className="font-medium text-brand-600 hover:underline">Vaata</Link>
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