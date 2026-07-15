"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await createClient().auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError("Login fehlgeschlagen: " + error.message);
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      {/* Aurora-Hintergrund */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="float-a absolute -top-32 left-1/2 h-[420px] w-[640px] -translate-x-1/2 rounded-full bg-indigo-600/25 blur-[130px]" />
        <div className="float-b absolute -bottom-40 left-1/4 h-[360px] w-[520px] rounded-full bg-violet-600/20 blur-[130px]" />
        <div className="absolute right-1/4 top-1/3 h-64 w-64 rounded-full bg-fuchsia-500/10 blur-[100px]" />
      </div>

      <div className="fade-up relative w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="relative mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-lg font-bold text-white shadow-2xl shadow-indigo-500/40">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 opacity-50 blur-lg" />
            <span className="relative">3</span>
          </div>
          <h1 className="bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 bg-clip-text text-2xl font-bold tracking-tight text-transparent">
            System3
          </h1>
          <p className="mt-1 text-sm text-faint">
            Leads finden · anreichern · personalisieren
          </p>
        </div>

        <div className="rounded-2xl border border-edge bg-panel/80 p-7 shadow-2xl shadow-black/5 backdrop-blur-xl dark:shadow-black/40">
          <form onSubmit={onSubmit} className="space-y-3">
            <input
              type="email" required placeholder="E-Mail" value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-edge2 bg-field px-3.5 py-2.5 text-sm text-ink placeholder-mute outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
            />
            <input
              type="password" required placeholder="Passwort" value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-edge2 bg-field px-3.5 py-2.5 text-sm text-ink placeholder-mute outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
            />
            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
            <button
              disabled={loading}
              className="w-full rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 py-2.5 text-sm font-medium text-white shadow-lg shadow-indigo-600/30 transition-all hover:shadow-xl hover:shadow-indigo-600/40 hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? "Wird angemeldet..." : "Anmelden"}
            </button>
          </form>
        </div>
        <p className="mt-6 text-center text-xs text-mute">
          B2B Lead-Gen & Outreach — DSGVO-first, BYOK
        </p>
      </div>
    </div>
  );
}
