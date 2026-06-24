"use client";
import { useState, useEffect } from "react";
import { Building2, MapPin, Layers, Ruler, Thermometer } from "lucide-react";

export default function ResidentApartmentPage() {
  const [apartment, setApartment] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("kuhik_token");
    if (!token) return;

    fetch("/api/v1/me/profile", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(async (profileData) => {
        if (!profileData.success) return;
        const orgId = profileData.data.organizations[0]?.id;
        if (!orgId) return;

        const res = await fetch(`/api/v1/me/organizations/${orgId}/apartment`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.success) setApartment(data.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="text-slate-500 py-12 text-center">Laen...</div>;
  }

  if (!apartment) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
        <Building2 className="mx-auto h-12 w-12 text-slate-300" />
        <p className="mt-4 text-slate-600">Korterit pole selle kasutajaga seotud.</p>
        <p className="text-xs text-slate-400 mt-2">Korteriühistu haldur peab Teid korteriga siduma.</p>
      </div>
    );
  }

  const a = apartment.apartment;

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-2">Minu korter</h1>
      <p className="text-slate-600 mb-8">{a.building?.name} — korter {a.unitLabel}</p>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-2 text-teal-600 mb-3">
            <Building2 className="h-5 w-5" />
            <h2 className="font-semibold text-slate-900">Hoone</h2>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Nimi</span>
              <span className="font-medium text-slate-900">{a.building?.name || "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Aadress</span>
              <span className="font-medium text-slate-900">{a.building?.address || "—"}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-2 text-blue-600 mb-3">
            <MapPin className="h-5 w-5" />
            <h2 className="font-semibold text-slate-900">Korter</h2>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Korteri nr</span>
              <span className="font-medium text-slate-900">{a.unitLabel}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Korrus</span>
              <span className="font-medium text-slate-900">{a.floor != null ? a.floor : "—"}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-2 text-amber-600 mb-3">
            <Ruler className="h-5 w-5" />
            <h2 className="font-semibold text-slate-900">Pindala</h2>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Üldpind</span>
              <span className="font-medium text-slate-900">{a.areaSqm != null ? `${a.areaSqm} m²` : "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Köetav pind</span>
              <span className="font-medium text-slate-900">{a.heatedAreaSqm != null ? `${a.heatedAreaSqm} m²` : "—"}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-2 text-purple-600 mb-3">
            <Layers className="h-5 w-5" />
            <h2 className="font-semibold text-slate-900">Seos</h2>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Nimi</span>
              <span className="font-medium text-slate-900">{apartment.personName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Suhe</span>
              <span className="font-medium text-slate-900">
                {apartment.relationshipType === "OWNER" ? "Omanik" :
                 apartment.relationshipType === "RESIDENT" ? "Elanik" :
                 apartment.relationshipType === "CONTACT" ? "Kontakt" : apartment.relationshipType}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}