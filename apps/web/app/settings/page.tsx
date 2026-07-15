"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const PROVIDERS = [
  { id: "google_maps", label: "Google Maps", hint: "Geocoding API + Places API (New) aktivieren" },
  { id: "openai", label: "OpenAI", hint: "Key beginnt mit sk-" },
  { id: "hunter", label: "Hunter.io", hint: "Für E-Mail-Suche nach Entscheidern" },
];

const PROMPT_PLACEHOLDER =
  'z.B.: Menschlich und locker, wie von Mensch zu Mensch. Beispiel: "Hey, hab gesehen du arbeitest mit Tieren - ich hab 10 Jahre in dem Bereich gearbeitet und kenn das genau, dachte ich schreib dir mal."';

const inputCls =
  "rounded-lg border border-edge2 bg-field px-3 py-2 text-sm text-ink " +
  "placeholder-mute outline-none transition-colors focus:border-indigo-500";

const btnCls =
  "rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-lg " +
  "shadow-indigo-600/25 transition-all hover:bg-indigo-500 disabled:opacity-50";

export default function SettingsPage() {
  const [saved, setSaved] = useState<string[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<Record<string, string>>({});
  const [wsId, setWsId] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [promptStatus, setPromptStatus] = useState("");

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("api_keys")
      .select("provider")
      .then(({ data }) => setSaved((data ?? []).map((r) => r.provider)));
    supabase
      .from("workspaces")
      .select("id, personalization_prompt")
      .limit(1)
      .single()
      .then(({ data }) => {
        if (data) {
          setWsId(data.id);
          setPrompt(data.personalization_prompt ?? "");
        }
      });
  }, []);

  async function savePrompt() {
    if (!wsId) return;
    setPromptStatus("...");
    const { error } = await createClient()
      .from("workspaces")
      .update({ personalization_prompt: prompt.trim() || null })
      .eq("id", wsId);
    setPromptStatus(error ? "Fehler: " + error.message : "Gespeichert ✓");
  }

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
      setStatus((s) => ({ ...s, [provider]: "🔒 AES-128 verschlüsselt gespeichert" }));
      setSaved((p) => (p.includes(provider) ? p : [...p, provider]));
      setValues((v) => ({ ...v, [provider]: "" }));
    } else {
      const body = await res.json().catch(() => ({}));
      setStatus((s) => ({ ...s, [provider]: "Fehler: " + (body.error ?? res.status) }));
    }
  }

  return (
    <div className="fade-up max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-ink">Einstellungen</h1>
        <p className="text-sm text-faint">API-Keys und Personalisierungs-Stil</p>
      </div>

      <div className="rounded-xl border border-edge bg-panel p-6">
        <h2 className="font-medium text-ink">Personalisierungs-Stil</h2>
        <p className="mb-4 mt-1 text-sm text-faint">
          Beschreibe, wie die personalisierte Eröffnungszeile klingen soll — gerne mit Beispiel.
          Leer lassen für den Standard-Stil (1 sachlicher Satz).
        </p>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={PROMPT_PLACEHOLDER}
          rows={5}
          className={inputCls + " w-full resize-y"}
        />
        <div className="mt-3 flex items-center gap-3">
          <button onClick={savePrompt} className={btnCls}>Speichern</button>
          {promptStatus && <span className="text-xs text-faint">{promptStatus}</span>}
        </div>
      </div>

      <div>
        <h2 className="mb-1 font-medium text-ink">API-Keys</h2>
        <p className="mb-4 text-sm text-faint">
          Deine Keys werden serverseitig verschlüsselt (AES) gespeichert und nie im Klartext angezeigt.
        </p>
        <div className="space-y-4">
          {PROVIDERS.map((p) => (
            <div key={p.id} className="rounded-xl border border-edge bg-panel p-6">
              <div className="mb-1 flex items-center justify-between">
                <h3 className="font-medium text-ink">{p.label}</h3>
                {saved.includes(p.id) && (
                  <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-xs text-emerald-600 dark:text-emerald-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    hinterlegt
                  </span>
                )}
              </div>
              <p className="mb-3 text-xs text-faint">{p.hint}</p>
              <div className="flex gap-3">
                <input
                  type="password"
                  placeholder={saved.includes(p.id) ? "Neuen Key eingeben zum Ersetzen" : "API-Key"}
                  value={values[p.id] ?? ""}
                  onChange={(e) => setValues((v) => ({ ...v, [p.id]: e.target.value }))}
                  className={inputCls + " flex-1"}
                />
                <button onClick={() => save(p.id)} className={btnCls}>Speichern</button>
              </div>
              {status[p.id] && (
                <p className={"mt-2 text-xs " + (status[p.id].includes("🔒") ? "fade-up font-medium text-emerald-600 dark:text-emerald-400" : "text-faint")}>
                  {status[p.id]}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-edge bg-panel p-6">
        <h2 className="font-medium text-ink">Kompatibel mit deinem Stack</h2>
        <p className="mb-4 mt-1 text-sm text-faint">
          Exportiere Leads mit einem Klick — die Spalten sind für den Direkt-Import vorbereitet.
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            { name: "Instantly", note: "CSV-Import, Auto-Mapping" },
            { name: "Smartlead", note: "CSV-Import" },
            { name: "Lemlist", note: "CSV-Import" },
            { name: "HubSpot", note: "CSV-Import" },
            { name: "Pipedrive", note: "CSV-Import" },
            { name: "Salesforce", note: "CSV-Import" },
            { name: "Excel / Sheets", note: "Excel-CSV" },
            { name: "Zapier", note: "geplant" },
          ].map((t) => (
            <div
              key={t.name}
              className="rounded-lg border border-edge bg-surface/60 px-3 py-2.5 transition-all hover:-translate-y-0.5 hover:border-edge2"
            >
              <p className="text-sm font-medium text-ink">{t.name}</p>
              <p className="text-[11px] text-faint">{t.note}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
