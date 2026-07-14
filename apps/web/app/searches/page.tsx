import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import AutoRefresh from "../auto-refresh";

type SearchRow = {
  id: string;
  query: string;
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
  const { data } = await supabase.rpc("search_overview");
  const searches = (data ?? []) as SearchRow[];
  const anyRunning = searches.some(
    (s) => s.status === "pending" || s.status === "running" || s.businesses_done < s.businesses
  );

  return (
    <div className="fade-up space-y-6">
      {anyRunning && <AutoRefresh />}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-zinc-100">Suchen</h1>
          <p className="text-sm text-zinc-500">
            Jede Suche ist eine eigene Lead-Liste — klick dich rein.
          </p>
        </div>
        <Link
          href="/"
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-indigo-600/25 transition-all hover:bg-indigo-500"
        >
          + Neue Suche
        </Link>
      </div>

      <div className="space-y-3">
        {searches.map((s) => {
          const progress =
            s.businesses > 0 ? Math.round((s.businesses_done / s.businesses) * 100) : 0;
          const enriching = s.status === "completed" && s.businesses_done < s.businesses;
          return (
            <Link
              key={s.id}
              href={"/searches/" + s.id}
              className="block rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 transition-colors hover:border-zinc-700 hover:bg-zinc-900/70"
            >
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2.5">
                    <span className="truncate font-medium text-zinc-100">{s.query}</span>
                    <span className="rounded-full border border-zinc-700/80 bg-zinc-800/60 px-2 py-0.5 text-[11px] text-zinc-400">
                      {s.source === "corporate" ? "Corporate" : "Maps"}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    {s.location} · {new Date(s.created_at).toLocaleString("de-DE", { dateStyle: "short", timeStyle: "short" })}
                  </p>
                </div>
                <Metric value={s.businesses} label="Firmen" />
                <Metric value={s.contacts} label="Kontakte" />
                <Metric value={s.with_email} label="mit E-Mail" />
                <div className="w-32">
                  {s.status === "failed" ? (
                    <span className="text-xs text-red-400">Fehlgeschlagen</span>
                  ) : s.status !== "completed" ? (
                    <span className="flex items-center gap-1.5 text-xs text-blue-300">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-400" />
                      Firmen werden gesucht
                    </span>
                  ) : enriching ? (
                    <div>
                      <div className="mb-1 flex justify-between text-[11px] text-zinc-500">
                        <span>Anreicherung</span>
                        <span>{progress}%</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-zinc-800">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all"
                          style={{ width: progress + "%" }}
                        />
                      </div>
                    </div>
                  ) : (
                    <span className="flex items-center gap-1.5 text-xs text-emerald-300">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      Fertig
                    </span>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
        {searches.length === 0 && (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-10 text-center text-zinc-500">
            Noch keine Suchen — starte deine erste im Dashboard.
          </div>
        )}
      </div>
    </div>
  );
}

function Metric({ value, label }: { value: number; label: string }) {
  return (
    <div className="w-20 text-center">
      <p className="text-lg font-semibold text-zinc-100">{value}</p>
      <p className="text-[11px] text-zinc-500">{label}</p>
    </div>
  );
}
