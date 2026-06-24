"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Gauge, ArrowLeft } from "lucide-react";

const typeNames: Record<string, string> = {
  water: "Vesi",
  electricity: "Elekter",
  heating: "Küte",
  gas: "Gaas",
};

export default function ResidentMetersPage() {
  const [apartment, setApartment] = useState<any>(null);
  const [meters, setMeters] = useState<any[]>([]);
  const [readings, setReadings] = useState<Record<string, any[]>>({});
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

        // Find apartment
        const aptRes = await fetch(`/api/v1/me/organizations/${orgId}/apartment`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const aptData = await aptRes.json();
        if (!aptData.success || !aptData.data) return;
        setApartment(aptData.data);

        // Fetch meters for this apartment
        const aptId = aptData.data.apartment.id;
        const metersRes = await fetch(`/api/v1/apartments/${aptId}/meters`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const metersData = await metersRes.json();
        if (!metersData.success) return;
        setMeters(metersData.data);

        // Fetch readings for each meter in parallel
        const readingsMap: Record<string, any[]> = {};
        await Promise.all(
          metersData.data.map(async (meter: any) => {
            const res = await fetch(`/api/v1/meters/${meter.id}/readings`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            if (data.success) {
              readingsMap[meter.id] = data.data;
            }
          })
        );
        setReadings(readingsMap);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="text-slate-500 py-12 text-center">Laen...</div>;
  }

  if (meters.length === 0) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Näidud</h1>
        <p className="text-slate-600 mb-8">Arvestite näitude ajalugu</p>
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <Gauge className="mx-auto h-12 w-12 text-slate-300" />
          <p className="mt-4 text-slate-600">Selle korteriga pole arvesteid seotud.</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-2">Näidud</h1>
      <p className="text-slate-600 mb-8">
        {apartment?.apartment?.building?.name} — korter {apartment?.apartment?.unitLabel}
      </p>

      <div className="grid gap-6">
        {meters.map((meter: any) => {
          const meterReadings = readings[meter.id] || [];
          const latest = meterReadings[0];

          return (
            <div key={meter.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-semibold text-slate-900">
                      {typeNames[meter.meterType] || meter.meterType}
                    </h2>
                    <p className="text-xs text-slate-500">
                      {meter.label || meter.serialNumber || "—"} · {meter.unit}
                    </p>
                  </div>
                  {latest && (
                    <div className="text-right">
                      <p className="text-lg font-bold text-slate-900">{latest.value.toFixed(1)} {meter.unit}</p>
                      <p className="text-xs text-slate-400">{new Date(latest.timestamp).toLocaleDateString("et-EE")}</p>
                    </div>
                  )}
                </div>
              </div>

              {meterReadings.length > 1 && (
                <div>
                  <div className="px-6 py-2 bg-slate-50 border-b border-slate-100">
                    <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Ajalugu</span>
                  </div>
                  <div className="divide-y divide-slate-50">
                    {meterReadings.slice(1).map((r: any) => (
                      <div key={r.id} className="flex justify-between px-6 py-2 text-sm">
                        <span className="text-slate-500">{new Date(r.timestamp).toLocaleDateString("et-EE")}</span>
                        <span className="font-medium text-slate-900">{r.value.toFixed(1)} {meter.unit}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {meterReadings.length === 0 && (
                <div className="px-6 py-4 text-sm text-slate-400">Näite pole veel sisestatud.</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}