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
    <div className="mx-auto mt-24 max-w-sm rounded-xl border bg-white p-8 shadow-sm">
      <h1 className="mb-1 text-xl font-bold">System3</h1>
      <p className="mb-6 text-sm text-slate-500">Anmelden</p>
      <form onSubmit={onSubmit} className="space-y-4">
        <input
          type="email"
          required
          placeholder="E-Mail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border px-3 py-2 text-sm"
        />
        <input
          type="password"
          required
          placeholder="Passwort"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg border px-3 py-2 text-sm"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          disabled={loading}
          className="w-full rounded-lg bg-slate-900 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
        >
          {loading ? "..." : "Anmelden"}
        </button>
      </form>
    </div>
  );
}
