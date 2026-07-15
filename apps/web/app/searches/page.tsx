import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import AutoRefresh from "../auto-refresh";
import { HardDeleteButton, RestoreButton, TrashButton } from "./search-actions";

type SearchRow = {
  id: string;
  name: string;
  query: string;
  schedule: string;
  location: string;
  source: string;
  status: string;
  max_results: number;
  created_at: string;
  businesses: number;
  businesses_done: number;
  contacts: number;
  with_email: number;
};

export default async function SearchesPage() {
  const supabase = await createClient();
  const [{ data }, trashRes] = await Promise.all([
    supabase.rpc("search_overview"),
    supabase
      .from("searches")
      .select("id, name, query, location, deleted_at")
      .not("deleted_at", "is", null)
      .order("deleted_at", { ascending: false }),
  ]);
  const searches = (data ?? []) as SearchRow[];
  const trash = trashRes.data ?? [];
  const anyRunning = searches.some(
    (s) => s.status === "pending" || s.status === "running" || s.businesses_done < s.businesses
  );

  return (
    <div className="fade-up space-y-6">
      {anyRunning && <AutoRefresh />}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-ink">Suchen</h1>
          <p className="text-sm text-faint">
            Jede Suche ist eine eigene Lead-Liste — klick dich rein.
          </p>
        </div>
        <Link
          href="/"
          className="rounded-lg bg-ink px-4 py-2 text-sm font-medium text-surface shadow-sm transition-all hover:opacity-85 active:scale-[0.98]"
        >
          + Neue Suche
        </Link>
      </div>

      <div className="space-y-3">
        {searches.map((s, idx) => {
          const progress =
            s.businesses > 0 ? Math.round((s.businesses_done / s.businesses) * 100) : 0;
          const enriching = s.status === "completed" && s.businesses_done < s.businesses;
          return (
            <Link
              key={s.id}
              href={"/searches/" + s.id}
              className="fade-up block rounded-lg border border-edge/60 bg-panel p-5 transition-all duration-300 hover:border-edge2 hover:shadow-sm"
              style={{ animationDelay: idx * 50 + "ms" }}
            >
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2.5">
                    <span className="truncate font-medium text-ink">{s.name}</span>
                    <span className="rounded-full border border-edge2 bg-chip px-2 py-0.5 text-[11px] text-soft">
                      {s.source === "corporate" ? "Corporate" : "Maps"}
                    </span>
                    {s.schedule !== "none" && (
                      <span className="rounded-full border border-indigo-500/30 bg-indigo-500/10 px-2 py-0.5 text-[11px] text-indigo-600 dark:text-indigo-300">
                        Abo · {s.schedule === "weekly" ? "wöchentlich" : "täglich"}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-faint">
                    {s.location} · {new Date(s.created_at).toLocaleString("de-DE", { dateStyle: "short", timeStyle: "short" })}
                  </p>
                </div>
                <Metric value={s.businesses} label="Firmen" />
                <Metric value={s.contacts} label="Kontakte" />
                <Metric value={s.with_email} label="mit E-Mail" />
                <div className="w-32">
                  {s.status === "failed" ? (
                    <span className="text-xs text-red-600 dark:text-red-400">Fehlgeschlagen</span>
                  ) : s.status !== "completed" ? (
                    <span className="flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-300">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-400" />
                      Firmen werden gesucht
                    </span>
                  ) : enriching ? (
                    <div>
                      <div className="mb-1 flex justify-between text-[11px] text-faint">
                        <span>Anreicherung</span>
                        <span>{progress}%</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-chip">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all"
                          style={{ width: progress + "%" }}
                        />
                      </div>
                    </div>
                  ) : (
                    <span className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-300">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      Fertig
                    </span>
                  )}
                </div>
                <TrashButton searchId={s.id} />
              </div>
            </Link>
          );
        })}
        {searches.length === 0 && (
          <div className="rounded-lg border border-edge/60 bg-panel p-10 text-center text-faint">
            Noch keine Suchen — starte deine erste im Dashboard.
          </div>
        )}
      </div>

      {trash.length > 0 && (
        <details className="rounded-lg border border-edge/60 bg-panel">
          <summary className="cursor-pointer px-5 py-3 text-sm text-faint hover:text-soft">
            Papierkorb ({trash.length})
          </summary>
          <div className="divide-y divide-edge/60 border-t border-edge/60">
            {trash.map((t) => (
              <div key={t.id} className="flex items-center gap-3 px-5 py-3">
                <span className="min-w-0 flex-1 truncate text-sm text-soft">
                  {t.name ?? t.query}
                  <span className="ml-2 text-xs text-mute">{t.location}</span>
                </span>
                <RestoreButton searchId={t.id} />
                <HardDeleteButton searchId={t.id} />
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

function Metric({ value, label }: { value: number; label: string }) {
  return (
    <div className="w-20 text-center">
      <p className="text-lg font-semibold text-ink">{value}</p>
      <p className="text-[11px] text-faint">{label}</p>
    </div>
  );
}
