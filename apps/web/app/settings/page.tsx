"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { IconLock } from "../icons";
import { useT } from "../language-provider";
import { useToast } from "../toast-provider";

const PROVIDER_IDS = ["google_maps", "openai", "hunter", "neverbounce"] as const;

const inputCls =
  "rounded-lg border border-edge2 bg-field px-3.5 py-2.5 text-sm text-ink " +
  "placeholder-mute outline-none transition-colors focus:border-indigo-500";

const btnCls =
  "rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white shadow-lg " +
  "shadow-indigo-600/25 transition-all hover:bg-indigo-500 disabled:opacity-50";

export default function SettingsPage() {
  const { t } = useT();
  const { push } = useToast();
  const [saved, setSaved] = useState<string[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<Record<string, string>>({});

  useEffect(() => {
    const supabase = createClient();
    supabase
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
      setStatus((s) => ({ ...s, [provider]: t.settings.encryptedOk }));
      setSaved((p) => (p.includes(provider) ? p : [...p, provider]));
      setValues((v) => ({ ...v, [provider]: "" }));
      push(providerLabels[provider] + ": " + t.settings.encryptedOk, "success");
    } else {
      const body = await res.json().catch(() => ({}));
      const message = t.common.error + (body.error ?? res.status);
      setStatus((s) => ({ ...s, [provider]: message }));
      push(message, "error");
    }
  }

  const providerLabels: Record<string, string> = {
    google_maps: "Google Maps", openai: "OpenAI", hunter: "Hunter.io", neverbounce: "NeverBounce",
  };

  return (
    <div className="fade-up max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">{t.settings.title}</h1>
        <p className="text-sm text-faint">{t.settings.subtitle}</p>
      </div>

      <div>
        <h2 className="mb-1 flex items-center gap-1.5 font-medium text-ink">
          <IconLock className="h-4 w-4 text-mute" filled />
          {t.settings.apiKeysHeading}
        </h2>
        <p className="mb-4 text-sm text-faint">{t.settings.apiKeysDescription}</p>
        <div className="space-y-4">
          {PROVIDER_IDS.map((p) => (
            <div key={p} className="rounded-lg border border-edge/60 bg-panel p-6">
              <div className="mb-1 flex items-center justify-between">
                <h3 className="font-medium text-ink">{providerLabels[p]}</h3>
                {saved.includes(p) && (
                  <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-xs text-emerald-600 dark:text-emerald-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    {t.settings.saved}
                  </span>
                )}
              </div>
              <p className="mb-3 text-xs text-faint">{t.settings.providerHints[p]}</p>
              <div className="flex gap-3">
                <input
                  type="password"
                  placeholder={saved.includes(p) ? t.settings.replaceKeyPlaceholder : t.settings.keyPlaceholder}
                  value={values[p] ?? ""}
                  onChange={(e) => setValues((v) => ({ ...v, [p]: e.target.value }))}
                  className={inputCls + " flex-1"}
                />
                <button onClick={() => save(p)} className={btnCls}>{t.settings.save}</button>
              </div>
              {status[p] && (
                <p
                  className={
                    "mt-2 flex items-center gap-1.5 text-xs " +
                    (status[p].includes(t.settings.encryptedOk)
                      ? "lock-pop font-medium text-emerald-600 dark:text-emerald-400"
                      : "text-faint")
                  }
                >
                  <IconLock
                    className={
                      "h-3.5 w-3.5 " +
                      (status[p] === "..."
                        ? "lock-spin text-mute"
                        : status[p].includes(t.settings.encryptedOk)
                        ? "text-emerald-500"
                        : "text-mute")
                    }
                    filled={status[p].includes(t.settings.encryptedOk)}
                  />
                  {status[p] === "..." ? t.settings.encrypting : status[p]}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-edge/60 bg-panel p-6">
        <h2 className="font-medium text-ink">{t.settings.stackHeading}</h2>
        <p className="mb-4 mt-1 text-sm text-faint">{t.settings.stackDescription}</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {t.settings.integrations.map((it) => (
            <div
              key={it.name}
              className="rounded-lg border border-edge bg-surface/60 px-3 py-2.5 transition-all hover:-translate-y-0.5 hover:border-edge2"
            >
              <p className="text-sm font-medium text-ink">{it.name}</p>
              <p className="text-[11px] text-faint">{it.note}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
