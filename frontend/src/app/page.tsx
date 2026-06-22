import Link from "next/link";
import { Building2, ArrowRight, Bot, Smartphone, CreditCard, Euro, Receipt, Gauge, MessageSquare, FileText, Shield } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <header className="border-b border-slate-200/80 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2 font-bold text-brand-700">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white text-sm font-bold">KH</div>
            <span className="text-xl">Kuhik</span>
          </Link>
          <nav className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">Logi sisse</Link>
            <Link href="/register" className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-700 transition-all shadow-sm hover:shadow-md">Alusta tasuta</Link>
          </nav>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="relative mx-auto max-w-6xl px-6 py-24 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-brand-100 px-4 py-1.5 text-sm font-medium text-brand-700 mb-8">
            <Bot className="h-4 w-4" />
            Eesti korteriühistute nutikas tipphaldusplatvorm
          </div>
          <h1 className="text-5xl font-bold tracking-tight text-slate-900 sm:text-6xl lg:text-7xl">
            Korteriühistute<span className="block bg-gradient-to-r from-brand-600 to-blue-600 bg-clip-text text-transparent">tipphaldus</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-600">
            Automaatne arveldus, elanike portaal, Smart-ID, pangalingid, AI juturobot ja Valvur — kõik ühes platvormis.
          </p>
          <div className="mt-10 flex justify-center gap-4">
            <Link href="/register" className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-8 py-4 text-base font-semibold text-white hover:bg-brand-700 transition-all shadow-lg hover:shadow-xl">
              Alusta tasuta <ArrowRight className="h-5 w-5" />
            </Link>
            <Link href="/login" className="inline-flex items-center gap-2 rounded-xl border-2 border-slate-200 bg-white px-8 py-4 text-base font-semibold text-slate-700 hover:border-brand-300 hover:text-brand-700 transition-all">
              Logi sisse
            </Link>
          </div>
          <div className="mt-12 flex items-center justify-center gap-6 text-sm text-slate-500">
            <span className="flex items-center gap-2"><Smartphone className="h-4 w-4 text-blue-500" /> Smart-ID</span>
            <span className="flex items-center gap-2"><CreditCard className="h-4 w-4 text-purple-500" /> Mobiil-ID</span>
            <span className="flex items-center gap-2"><CreditCard className="h-4 w-4 text-green-500" /> ID-kaart</span>
            <span className="flex items-center gap-2"><Euro className="h-4 w-4 text-amber-500" /> Pangalingid</span>
          </div>
        </div>
      </section>

      <section className="border-t border-slate-100 bg-white py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900">Kõik, mida korteriühistu vajab</h2>
          <p className="mx-auto mt-4 max-w-xl text-center text-slate-600">Asenda e-mailid, Excel ja paberkandjad — ühe kaasaegse platvormiga.</p>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <FeatureCard icon={<Building2 className="h-6 w-6" />} title="KÜ haldus" desc="Korterid, omanikud, elanikud — kõik ühes kohas. Rollipõhine ligipääs." color="brand" />
            <FeatureCard icon={<Receipt className="h-6 w-6" />} title="Automaatne arveldus" desc="Kuuarvete genereerimine jagamisreeglite alusel. Tüüpkanded ja pearaamat." color="brand" />
            <FeatureCard icon={<Gauge className="h-6 w-6" />} title="Näitude sisestus" desc="Suured inputid, OCR pildilt lugemine, tarbimise arvutus, anomaaliate tuvastus." color="brand" />
            <FeatureCard icon={<MessageSquare className="h-6 w-6" />} title="Suhtlus ja teated" desc="KÜ-sisene foorum teadaanneteks, aruteludeks ja probleemideks." color="blue" />
            <FeatureCard icon={<FileText className="h-6 w-6" />} title="Dokumendihaldus" desc="Aruanded, protokollid, lepingud. Igal korteril oma kaust." color="blue" />
            <FeatureCard icon={<Smartphone className="h-6 w-6" />} title="E-riigi tugi" desc="Smart-ID, Mobiil-ID, ID-kaart — turvaline sisselogimine." color="blue" />
            <FeatureCard icon={<Euro className="h-6 w-6" />} title="Pangalingid" desc="SEB, Swedbank, LHV, Luminor — maksed otse pangalingiga." color="amber" />
            <FeatureCard icon={<Bot className="h-6 w-6" />} title="AI Valvur + Robot" desc="Maksete meeldetuletused, anomaaliad, juturobot mõlemale rollile." color="amber" />
            <FeatureCard icon={<Shield className="h-6 w-6" />} title="GDPR + Turvalisus" desc="AES-256 krüpteerimine, audit logi, GDPR eksport ja kustutamine." color="amber" />
          </div>
        </div>
      </section>
    </div>
  );
}

function FeatureCard({ icon, title, desc, color }: { icon: React.ReactNode; title: string; desc: string; color: "brand" | "blue" | "amber" }) {
  const colors = { brand: { bg: "bg-brand-50", text: "text-brand-600", border: "border-brand-100" }, blue: { bg: "bg-blue-50", text: "text-blue-600", border: "border-blue-100" }, amber: { bg: "bg-amber-50", text: "text-amber-600", border: "border-amber-100" } };
  const c = colors[color];
  return (
    <div className={`rounded-xl border ${c.border} ${c.bg}/50 p-6 transition-all hover:shadow-md hover:-translate-y-0.5`}>
      <div className={`mb-4 flex h-10 w-10 items-center justify-center rounded-lg ${c.bg} ${c.text}`}>{icon}</div>
      <h3 className="font-semibold text-slate-900">{title}</h3>
      <p className="mt-2 text-sm text-slate-600">{desc}</p>
    </div>
  );
}