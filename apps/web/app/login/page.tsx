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
    <div className="dot-grid flex min-h-screen items-center justify-center px-4">
      <div className="fade-up w-full max-w-sm">
        <div className="mb-7 flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-sm font-bold text-white">
            3
          </div>
          <div>
            <h1 className="text-base font-semibold tracking-tight text-ink">System3</h1>
            <p className="text-xs text-faint">Leads finden · anreichern · personalisieren</p>
          </div>
        </div>

        <div className="rounded-lg border border-edge/60 bg-panel p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-medium text-ink">Anmelden</h2>
          <form onSubmit={onSubmit} className="space-y-3">
            <input
              type="email" required placeholder="E-Mail" value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-edge2 bg-field px-3 py-2.5 text-sm text-ink placeholder-mute outline-none transition-all focus:border-ink focus:ring-2 focus:ring-ink/5"
            />
            <input
              type="password" required placeholder="Passwort" value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-edge2 bg-field px-3 py-2.5 text-sm text-ink placeholder-mute outline-none transition-all focus:border-ink focus:ring-2 focus:ring-ink/5"
            />
            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
            <button
              disabled={loading}
              className="w-full rounded-lg bg-ink py-2.5 text-sm font-medium text-surface shadow-sm transition-all hover:opacity-85 active:scale-[0.99] disabled:opacity-50"
            >
              {loading ? "Wird angemeldet..." : "Anmelden"}
            </button>
          </form>
        </div>
        <p className="mt-5 text-center text-xs text-mute">
          B2B Lead-Engine — DSGVO-first · BYOK · EU-Hosting
        </p>
      </div>
    </div>
  );
}
