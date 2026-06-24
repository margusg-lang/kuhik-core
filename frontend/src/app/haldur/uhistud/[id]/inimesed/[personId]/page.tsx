"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Icon } from "@/components/haldur/Icons";
import Breadcrumb from "@/components/haldur/Breadcrumb";
import ContextHeader from "@/components/haldur/ContextHeader";

export default function PersonDetailPage({ params }: { params: { id: string; personId: string } }) {
  const [orgId, setOrgId] = useState("");
  const [personId, setPersonId] = useState("");

  useEffect(() => {
    if (params && typeof params === "object") {
      const p = params as { id: string; personId: string };
      setOrgId(p.id || "");
      setPersonId(p.personId || "");
    }
  }, [params]);

  const [orgName, setOrgName] = useState("");
  const [person, setPerson] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [showLinkForm, setShowLinkForm] = useState(false);
  const [buildings, setBuildings] = useState<any[]>([]);
  const [selectedBuildingId, setSelectedBuildingId] = useState("");
  const [apartments, setApartmentOptions] = useState<any[]>([]);
  const [selectedApartmentId, setSelectedApartmentId] = useState("");
  const [relationshipType, setRelationshipType] = useState("RESIDENT");
  const [isPrimary, setIsPrimary] = useState(false);
  const [saving, setSaving] = useState(false);

  function loadPerson() {
    if (!personId) return;
    const token = localStorage.getItem("kuhik_token");
    if (!token) return;

    Promise.all([
      fetch(`/api/v1/people/${personId}`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      fetch(`/api/v1/organizations/${orgId}`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
    ])
      .then(([personData, orgData]) => {
        if (personData.success) setPerson(personData.data);
        if (orgData.success) setOrgName(orgData.data.name);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => { if (personId && orgId) loadPerson(); }, [personId, orgId]);

  useEffect(() => {
    if (!orgId) return;
    const token = localStorage.getItem("kuhik_token");
    if (!token) return;
    fetch(`/api/v1/organizations/${orgId}/buildings`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(data => { if (data.success) setBuildings(data.data); });
  }, [orgId]);

  useEffect(() => {
    if (!selectedBuildingId) { setApartmentOptions([]); return; }
    const token = localStorage.getItem("kuhik_token");
    if (!token) return;
    fetch(`/api/v1/buildings/${selectedBuildingId}/apartments`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(data => { if (data.success) setApartmentOptions(data.data); });
  }, [selectedBuildingId]);

  async function handleLink(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedApartmentId || !personId) return;
    setSaving(true);
    const token = localStorage.getItem("kuhik_token");
    if (!token) return;
    try {
      const res = await fetch(`/api/v1/apartments/${selectedApartmentId}/people`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ personId, relationshipType, isPrimary }),
      });
      const data = await res.json();
      if (data.success) {
        setShowLinkForm(false);
        setSelectedApartmentId(""); setSelectedBuildingId("");
        loadPerson();
      }
    } catch {}
    setSaving(false);
  }

  async function handleRemoveRelation(relationId: string) {
    const token = localStorage.getItem("kuhik_token");
    if (!token) return;
    try {
      const res = await fetch(`/api/v1/apartment-people/${relationId}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.success) loadPerson();
    } catch {}
  }

  if (loading) return <div className="p-8 text-slate-600">Laen...</div>;
  if (!person) return <div className="p-8 text-slate-600">Isikut ei leitud.</div>;

  const relations: any[] = person.apartments || [];

  return (
    <div className="p-8">
      <Breadcrumb segments={[
        { label: "Haldur", href: "/haldur" },
        { label: "Korteriühistud", href: "/haldur/uhistud" },
        { label: orgName || "Ühistu", href: `/haldur/uhistud/${orgId}` },
        { label: "Inimesed", href: `/haldur/uhistud/${orgId}/inimesed` },
        { label: person?.fullName || "Isik" },
      ]} />

      <ContextHeader
        entityName={person.fullName}
        entityType="Inimene"
        parentContext={orgName || undefined}
        actions={[
          { label: "Seo korteriga", variant: "primary" as const, icon: "Home" },
        ]}
      />

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
            <Icon name="Home" /> Seotud korterid ({relations.length})
          </h2>
          <button onClick={() => setShowLinkForm(!showLinkForm)} className="inline-flex items-center gap-1 text-sm text-brand-600 hover:underline">
            <Icon name="Plus" /> {showLinkForm ? "Sulge" : "Seo korteriga"}
          </button>
        </div>

        {showLinkForm && (
          <form onSubmit={handleLink} className="mb-6 rounded-xl border border-green-200 bg-green-50 p-4 flex flex-wrap gap-3 items-end">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Hoone</label>
              <select value={selectedBuildingId} onChange={e => { setSelectedBuildingId(e.target.value); setSelectedApartmentId(""); }}
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm min-w-[180px]">
                <option value="">Vali hoone...</option>
                {buildings.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Korter</label>
              <select value={selectedApartmentId} onChange={e => setSelectedApartmentId(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm min-w-[120px]">
                <option value="">Vali korter...</option>
                {apartments.map((a: any) => <option key={a.id} value={a.id}>{a.unitLabel}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Seose tüüp</label>
              <select value={relationshipType} onChange={e => setRelationshipType(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm">
                <option value="RESIDENT">Elanik</option>
                <option value="OWNER">Omanik</option>
                <option value="CONTACT">Kontakt</option>
              </select>
            </div>
            <div className="flex items-center gap-2 pb-2">
              <input type="checkbox" id="isPrimary" checked={isPrimary} onChange={e => setIsPrimary(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300" />
              <label htmlFor="isPrimary" className="text-xs text-slate-600">Esmane kontakt</label>
            </div>
            <button type="submit" disabled={!selectedApartmentId || saving}
              className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50">
              {saving ? "..." : "Seo"}
            </button>
          </form>
        )}

        {relations.length === 0 && !showLinkForm && (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-600">
            Pole korteritega seotud.
          </div>
        )}

        {relations.length > 0 && (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Korter</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Hoone</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Seos</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Esmane</th>
                  <th className="px-4 py-3 text-right font-medium text-slate-600"></th>
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
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => handleRemoveRelation(r.id)} className="text-red-500 hover:text-red-700">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                      </button>
                    </td>
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