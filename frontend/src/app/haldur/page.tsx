// WAVE 1: Haldur (Manager) Dashboard with navigation
import Link from "next/link";

export default function HaldurPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white text-sm font-bold">KH</div>
            <span className="font-bold text-slate-800">Kuhik — Haldur</span>
          </div>
          <Link href="/login" className="text-sm text-slate-600 hover:text-slate-900">Logi välja</Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Tere tulemast, haldur!</h1>
        <p className="text-slate-600 mb-8">Kuhik halduskeskkond</p>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Link href="/haldur/uhistud" className="bg-white rounded-xl border border-brand-200 p-6 hover:shadow-md transition-shadow hover:-translate-y-0.5">
            <h3 className="font-semibold text-brand-700">Korteriühistud</h3>
            <p className="text-sm text-slate-600 mt-1">KÜ-de haldus, lisamine ja seadistamine</p>
            <div className="text-xs text-brand-500 mt-3">➡ Ava</div>
          </Link>
          <div className="bg-white rounded-xl border border-slate-200 p-6 opacity-50">
            <h3 className="font-semibold text-slate-400">Näidud</h3>
            <p className="text-sm text-slate-400 mt-1">📋 Wave 2+</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-6 opacity-50">
            <h3 className="font-semibold text-slate-400">Arved</h3>
            <p className="text-sm text-slate-400 mt-1">📋 Wave 4+</p>
          </div>
        </div>
      </main>
    </div>
  );
}
