"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { decodeToken, getRedirectPath } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: email, password }),
      });

      const data = await res.json();

      if (!data.success) {
        setError(data.error || "Vale e-post või parool");
        setLoading(false);
        return;
      }

      // Store token
      localStorage.setItem("kuhik_token", data.token);
      if (data.user) {
        localStorage.setItem("kuhik_user", JSON.stringify(data.user));
      }

      // Role-based redirect (eesti.ee style: role determines destination)
      const user = decodeToken(data.token);
      const role = user?.role || "haldur";
      router.push(getRedirectPath(role));
    } catch {
      setError("Sisselogimine ebaõnnestus. Kontrolli ühendust.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 to-white px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-slate-900">Logi sisse</h1>
          <p className="mt-2 text-slate-600">Kuhik korteriühistute haldusplatvorm</p>
        </div>
        <form onSubmit={handleSubmit} className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm space-y-4">
          {error && <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm">{error}</div>}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">E-post</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500" placeholder="mari@example.com" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Parool</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500" placeholder="••••••••" />
          </div>
          <button type="submit" disabled={loading} className="w-full bg-brand-600 text-white py-2.5 rounded-lg font-medium hover:bg-brand-700 transition-colors disabled:opacity-50">
            {loading ? "Sisselogimine..." : "Logi sisse"}
          </button>
          <p className="text-center text-sm text-slate-600">
            Pole kontot? <a href="/register" className="text-brand-600 hover:text-brand-700 font-medium">Registreeru</a>
          </p>
        </form>
      </div>
    </div>
  );
}