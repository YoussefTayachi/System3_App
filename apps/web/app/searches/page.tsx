import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getLangServer, formatDate } from "@/lib/i18n/lang";
import { dict } from "@/lib/i18n/dict";
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
  const lang = await getLangServer();
  const t = dict[lang];
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
          <h1 className="text-2xl font-semibold tracking-tight text-ink">{t.searches.title}</h1>
          <p className="text-sm text-faint">{t.searches.subtitle}</p>
        </div>
        <Link
          href="/"
          className="rounded-lg bg-ink px-5 py-2.5 text-sm font-medium text-surface shadow-sm transition-all hover:opacity-85 active:scale-[0.98]"
        >
          {t.searches.newSearch}
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
                        {t.searches.subscriptionPrefix} · {s.schedule === "weekly" ? t.searches.subscriptionWeekly : t.searches.subscriptionDaily}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-faint">
                    {s.location} · {formatDate(s.created_at, lang)}
                  </p>
                </div>
                <Metric value={s.businesses} label={t.searches.metricBusinesses} />
                <Metric value={s.contacts} label={t.searches.metricContacts} />
                <Metric value={s.with_email} label={t.searches.metricWithEmail} />
                <div className="w-32">
                  {s.status === "failed" ? (
                    <span className="text-xs text-red-600 dark:text-red-400">{t.searches.failed}</span>
                  ) : s.status !== "completed" ? (
                    <span className="flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-300">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-400" />
                      {t.searches.searchingBusinesses}
                    </span>
                  ) : enriching ? (
                    <div>
                      <div className="mb-1 flex justify-between text-[11px] text-faint">
                        <span>{t.searches.enriching}</span>
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
                      {t.searches.done}
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
            {t.searches.emptyState}
          </div>
        )}
      </div>

      {trash.length > 0 && (
        <details className="rounded-lg border border-edge/60 bg-panel">
          <summary className="cursor-pointer px-5 py-3 text-sm text-faint hover:text-soft">
            {t.searches.trash} ({trash.length})
          </summary>
          <div className="divide-y divide-edge/60 border-t border-edge/60">
            {trash.map((tr) => (
              <div key={tr.id} className="flex items-center gap-3 px-5 py-3">
                <span className="min-w-0 flex-1 truncate text-sm text-soft">
                  {tr.name ?? tr.query}
                  <span className="ml-2 text-xs text-mute">{tr.location}</span>
                </span>
                <RestoreButton searchId={tr.id} />
                <HardDeleteButton searchId={tr.id} />
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
