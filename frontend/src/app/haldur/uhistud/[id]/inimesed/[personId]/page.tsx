"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Home } from "lucide-react";

export default function PersonDetailPage({ params }: { params: Promise<{ id: string; personId: string }> }) {
  const [orgId, setOrgId] = useState("");
  const [personId, setPersonId] = useState("");
  const [person, setPerson] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    params.then(p => { setOrgId(p.id); setPersonId(p.personId); });
  }, [params]);

  useEffect(() => {
    if (!personId) return;
    const token = localStorage.getItem("kuhik_token");
    if (!token) return;

    fetch(`/api/v1/people/${personId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(data => { if (data.success) setPerson(data.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [personId]);

  if (loading) return <div className="p-8 text-slate-600">Laen...</div>;
  if (!person) return <div className="p-8 text-slate-600">Isikut ei leitud.</div>;

  const relations: any[] = person.apartments || [];

  return (
    <div className="p-8">
      <Link href={`/haldur/uhistud/${orgId}/inimesed`} className="text-sm text-brand-600 hover:underline">← Tagasi isikute juurde</Link>

      <div className="mt-4 mb-6">
        <h1 className="text-2xl font-bold text-slate-900">{person.fullName}</h1>
        <div className="mt-2 flex flex-wrap gap-4 text-sm text-slate-600">
          {person.email && <span>📧 {person.email}</span>}
          {person.phone && <span>📞 {person.phone}</span>}
          {person.personalCode && <span>ID: {person.personalCode}</span>}
        </div>
        {person.notes && <p className="mt-3 text-sm text-slate-500 bg-slate-50 rounded-lg p-3">{person.notes}</p>}
      </div>

      <section>
        <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900 mb-4">
          <Home className="h-5 w-5" /> Seotud korterid ({relations.length})
        </h2>

        {relations.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-600">
            Pole korteritega seotud.
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Korter</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Hoone</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Seos</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Esmane</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {relations.map((r: any) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">{r.apartment?.unitLabel || "—"}</td>
                    <td className="px-4 py-3 text-slate-600">{r.apartment?.buildingId || "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                        r.relationshipType === "OWNER" ? "bg-amber-100 text-amber-700" :
                        r.relationshipType === "RESIDENT" ? "bg-blue-100 text-blue-700" :
                        "bg-slate-100 text-slate-700"
                      }`}>
                        {r.relationshipType === "OWNER" ? "Omanik" : r.relationshipType === "RESIDENT" ? "Elanik" : "Kontakt"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{r.isPrimary ? "✅" : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}