"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const PROVIDERS = [
  { id: "google_maps", label: "Google Maps (Geocoding + Places API New)" },
  { id: "openai", label: "OpenAI" },
  { id: "hunter", label: "Hunter.io" },
];

export default function SettingsPage() {
  const [saved, setSaved] = useState<string[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<Record<string, string>>({});

  useEffect(() => {
    createClient()
      .from("api_keys")
      .select("provider")
      .then(({ data }) => setSaved((data ?? []).map((r) => r.provider)));
  }, []);

  async function save(provider: string) {
    const key = values[provider];
    if (!key) return;
    setStatus((s) => ({ ...s, [provider]: "..." }));
    const res = await fetch("/api/keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider, key }),
    });
    if (res.ok) {
      setStatus((s) => ({ ...s, [provider]: "Gespeichert (verschlüsselt)" }));
      setSaved((p) => (p.includes(provider) ? p : [...p, provider]));
      setValues((v) => ({ ...v, [provider]: "" }));
    } else {
      const body = await res.json().catch(() => ({}));
      setStatus((s) => ({ ...s, [provider]: "Fehler: " + (body.error ?? res.status) }));
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-bold">API-Keys</h1>
        <p className="text-sm text-slate-500">
          Deine Keys werden serverseitig verschlüsselt gespeichert und nie im Klartext angezeigt.
        </p>
      </div>
      {PROVIDERS.map((p) => (
        <div key={p.id} className="rounded-xl border bg-white p-6 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">{p.label}</h2>
            {saved.includes(p.id) && (
              <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-800">
                hinterlegt
              </span>
            )}
          </div>
          <div className="flex gap-3">
            <input
              type="password"
              placeholder={saved.includes(p.id) ? "Neuen Key eingeben zum Ersetzen" : "API-Key"}
              value={values[p.id] ?? ""}
              onChange={(e) => setValues((v) => ({ ...v, [p.id]: e.target.value }))}
              className="flex-1 rounded-lg border px-3 py-2 text-sm"
            />
            <button
              onClick={() => save(p.id)}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
            >
              Speichern
            </button>
          </div>
          {status[p.id] && <p className="mt-2 text-xs text-slate-500">{status[p.id]}</p>}
        </div>
      ))}
    </div>
  );
}
