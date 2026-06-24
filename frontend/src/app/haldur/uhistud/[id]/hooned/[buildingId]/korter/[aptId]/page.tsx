"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Icon } from "@/components/haldur/Icons";
import Breadcrumb from "@/components/haldur/Breadcrumb";
import ContextHeader from "@/components/haldur/ContextHeader";

export default function ApartmentPeoplePage({ params }: { params: { id: string; buildingId: string; aptId: string } }) {
  const [orgId, setOrgId] = useState("");
  const [buildingId, setBuildingId] = useState("");
  const [aptId, setAptId] = useState("");
  const [aptLabel, setAptLabel] = useState("");
  const [buildingName, setBuildingName] = useState("");
  const [orgName, setOrgName] = useState("");
  const [people, setPeople] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [orgPeople, setOrgPeople] = useState<any[]>([]);

  const [selectedPersonId, setSelectedPersonId] = useState("");
  const [relationshipType, setRelationshipType] = useState("RESIDENT");
  const [isPrimary, setIsPrimary] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (params && typeof params === "object") {
      const p = params as { id: string; buildingId: string; aptId: string };
      setOrgId(p.id || "");
      setBuildingId(p.buildingId || "");
      setAptId(p.aptId || "");
    }
  }, [params]);

  useEffect(() => {
    if (!aptId || !orgId) return;
    const token = localStorage.getItem("kuhik_token");
    if (!token) return;

    Promise.all([
      fetch(`/api/v1/apartments/${aptId}`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      fetch(`/api/v1/buildings/${buildingId}`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      fetch(`/api/v1/organizations/${orgId}`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      fetch(`/api/v1/apartments/${aptId}/people`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      fetch(`/api/v1/organizations/${orgId}/people`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
    ])
      .then(([aptData, bldData, orgData, relData, peopleData]) => {
        if (aptData.success) setAptLabel(aptData.data.unitLabel);
        if (bldData.success) setBuildingName(bldData.data.name);
        if (orgData.success) setOrgName(orgData.data.name);
        if (relData.success) setPeople(relData.data);
        if (peopleData.success) setOrgPeople(peopleData.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [aptId, orgId, buildingId]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedPersonId) return;
    setSaving(true);
    const token = localStorage.getItem("kuhik_token");
    if (!token) return;

    try {
      const res = await fetch(`/api/v1/apartments/${aptId}/people`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ personId: selectedPersonId, relationshipType, isPrimary }),
      });
      const data = await res.json();
      if (data.success) {
        setPeople(prev => [...prev, data.data]);
        setShowForm(false);
        setSelectedPersonId("");
      }
    } catch {}
    setSaving(false);
  }

  async function handleRemove(relationId: string) {
    const token = localStorage.getItem("kuhik_token");
    if (!token) return;
    try {
      const res = await fetch(`/api/v1/apartment-people/${relationId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) setPeople(prev => prev.filter((r: any) => r.id !== relationId));
    } catch {}
  }

  if (loading) return <div className="p-8 text-slate-600">Laen...</div>;

  return (
    <div className="p-8">
      <Breadcrumb segments={[
        { label: "Haldur", href: "/haldur" },
        { label: "Korteriühistud", href: "/haldur/uhistud" },
        { label: orgName || "Ühistu", href: `/haldur/uhistud/${orgId}` },
        { label: buildingName || "Hoone", href: `/haldur/uhistud/${orgId}/hooned/${buildingId}` },
        { label: aptLabel ? `Korter ${aptLabel}` : "Korter" },
      ]} />

      <ContextHeader
        entityName={aptLabel ? `Korter ${aptLabel}` : "Korter"}
        entityType="Korter"
        parentContext={buildingName ? `${buildingName} / ${orgName || ""}` : undefined}
        actions={[
          { label: "Lisa näit", href: `/haldur/uhistud/${orgId}/hooned/${buildingId}/korter/${aptId}/arvestid`, variant: "primary" as const, icon: "Gauge" },
          { label: "Vaata arveid", href: `/haldur/arved`, icon: "FileText" },
        ]}
      />

      <div className="mb-6 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
          Seotud inimesed ({people.length})
        </h2>
        <div className="flex gap-2">
          <button onClick={() => setShowForm(!showForm)} className="inline-flex items-center gap-1 rounded-lg bg-brand-600 px-4 py-2 text-sm text-white hover:bg-brand-700">
            <Icon name="Plus" /> {showForm ? "Sulge" : "Lisa isik"}
          </button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="mb-8 rounded-xl border border-brand-200 bg-brand-50 p-6 space-y-3">
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Isik</label>
              <select value={selectedPersonId} onChange={e => setSelectedPersonId(e.target.value)} required className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm">
                <option value="">Vali isik...</option>
                {orgPeople.map((p: any) => (
                  <option key={p.id} value={p.id}>{p.fullName}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Seose tüüp</label>
              <select value={relationshipType} onChange={e => setRelationshipType(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm">
                <option value="OWNER">Omanik</option>
                <option value="RESIDENT">Elanik</option>
                <option value="CONTACT">Kontakt</option>
              </select>
            </div>
            <div className="flex items-end gap-2">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={isPrimary} onChange={e => setIsPrimary(e.target.checked)} className="rounded" />
                Esmane kontakt
              </label>
            </div>
          </div>
          <button type="submit" disabled={saving} className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50">
            {saving ? "..." : "Lisa"}
          </button>
        </form>
      )}

      {!loading && people.length === 0 && !showForm && (
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-slate-600">Selle korteriga pole isikuid seotud.</div>
      )}

      {people.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Nimi</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Seos</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Esmane</th>
                <th className="px-4 py-3 text-right font-medium text-slate-600"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {people.map((r: any) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">{r.person?.fullName || "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                      r.relationshipType === "OWNER" ? "bg-amber-100 text-amber-700" :
                      r.relationshipType === "RESIDENT" ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-700"
                    }`}>
                      {r.relationshipType === "OWNER" ? "Omanik" : r.relationshipType === "RESIDENT" ? "Elanik" : "Kontakt"}
                    </span>
                  </td>
                  <td className="px-4 py-3">{r.isPrimary ? "✅" : "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => handleRemove(r.id)} className="text-red-500 hover:text-red-700">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                    </button>
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