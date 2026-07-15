import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import NewSearchForm from "./new-search-form";
import AutoRefresh from "./auto-refresh";
import ActivityChart from "./activity-chart";
import CountUp from "./count-up";

const STATUS_LABEL: Record<string, string> = {
  pending: "Wartet",
  running: "Läuft",
  completed: "Fertig",
  failed: "Fehler",
};

type Stats = {
  searches_total: number;
  businesses_total: number;
  contacts_total: number;
  contacts_with_email: number;
  personalized: number;
  emails_sent: number;
  replies: number;
  jobs_active: number;
  jobs_failed: number;
  jobs_geocode: number;
  jobs_decisionmaker: number;
  jobs_personalize: number;
  jobs_hunter: number;
  activity: { day: string; leads: number }[];
};

function estimateCosts(s: Stats) {
  const google = (s.jobs_geocode ?? 0) * 0.005 + Math.ceil((s.businesses_total ?? 0) / 20) * 0.032;
  const openai = (s.jobs_decisionmaker ?? 0) * 0.03 + (s.jobs_personalize ?? 0) * 0.003;
  return { usd: google + openai, hunterCredits: s.jobs_hunter ?? 0 };
}

// ROI: manuelle Recherche ~8 Min/Kontakt, Personalisierung ~4 Min/Firma
function estimateRoi(s: Stats) {
  const minutes = (s.contacts_total ?? 0) * 8 + (s.personalized ?? 0) * 4;
  const hours = minutes / 60;
  const value = Math.round(hours * 45); // 45 €/h Personalkosten
  return { hours: Math.round(hours * 10) / 10, value };
}

export default async function Dashboard() {
  const supabase = await createClient();
  const [statsRes, searchesRes, wsRes, recentRes] = await Promise.all([
    supabase.rpc("dashboard_stats"),
    supabase
      .from("searches")
      .select("*")
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(6),
    supabase.from("workspaces").select("id").limit(1).single(),
    supabase
      .from("contacts")
      .select("id, full_name, title, email, businesses(name)")
      .order("created_at", { ascending: false })
      .limit(6),
  ]);
  const stats = (statsRes.data ?? {}) as Stats;
  const searches = searchesRes.data ?? [];
  const recent = recentRes.data ?? [];
  const costs = estimateCosts(stats);
  const roi = estimateRoi(stats);
  const hasActive = (stats.jobs_active ?? 0) > 0;

  const kpis: { label: string; value: number | string; sub?: string }[] = [
    { label: "Suchen", value: stats.searches_total ?? 0 },
    { label: "Firmen", value: stats.businesses_total ?? 0 },
    { label: "Kontakte", value: stats.contacts_total ?? 0 },
    { label: "Mit E-Mail", value: stats.contacts_with_email ?? 0 },
    { label: "Personalisiert", value: stats.personalized ?? 0 },
    { label: "API-Kosten", value: "$" + costs.usd.toFixed(2), sub: costs.hunterCredits + " Hunter-Credits" },
  ];

  return (
    <div className="fade-up space-y-5">
      {hasActive && <AutoRefresh />}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-ink">Dashboard</h1>
          <p className="text-[13px] text-faint">Überblick über deine Lead-Pipeline</p>
        </div>
        {hasActive && (
          <span className="flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-300">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-indigo-500" />
            {stats.jobs_active} Jobs aktiv
          </span>
        )}
      </div>

      {/* KPI-Leiste */}
      <div className="grid grid-cols-3 divide-edge overflow-hidden rounded-xl border border-edge bg-panel shadow-sm md:grid-cols-6 md:divide-x">
        {kpis.map((k) => (
          <div key={k.label} className="px-4 py-3.5">
            <p className="text-[11px] font-medium uppercase tracking-wide text-mute">{k.label}</p>
            <p className="mt-0.5 text-xl font-semibold tracking-tight text-ink">
              {typeof k.value === "number" ? <CountUp value={k.value} /> : k.value}
            </p>
            {k.sub && <p className="text-[11px] text-mute">{k.sub}</p>}
          </div>
        ))}
      </div>

      {/* Chart + Neueste Leads */}
      <div className="grid gap-5 lg:grid-cols-5">
        <div className="rounded-xl border border-edge bg-panel p-5 shadow-sm lg:col-span-3">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-medium text-ink">Neue Leads — letzte 14 Tage</h2>
            <span className="text-xs text-mute">
              {stats.emails_sent ?? 0} E-Mails gesendet · {stats.replies ?? 0} Antworten
            </span>
          </div>
          <ActivityChart data={stats.activity ?? []} />
        </div>
        <div className="overflow-hidden rounded-xl border border-edge bg-panel shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between border-b border-edge px-4 py-3">
            <h2 className="text-sm font-medium text-ink">Neueste Leads</h2>
            <Link href="/leads" className="text-xs text-faint hover:text-ink">Alle →</Link>
          </div>
          <div className="divide-y divide-edge">
            {recent.map((c) => (
              <div key={c.id} className="flex items-center gap-3 px-4 py-2.5">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-chip text-[11px] font-semibold text-soft">
                  {(c.full_name ?? "?").split(" ").map((w: string) => w[0]).slice(0, 2).join("")}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium text-ink">{c.full_name ?? "—"}</p>
                  <p className="truncate text-xs text-faint">
                    {c.title ? c.title + " · " : ""}
                    {(c.businesses as unknown as { name: string } | null)?.name}
                  </p>
                </div>
                {c.email && (
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" title="E-Mail vorhanden" />
                )}
              </div>
            ))}
            {recent.length === 0 && (
              <p className="px-4 py-8 text-center text-sm text-mute">Noch keine Leads.</p>
            )}
          </div>
        </div>
      </div>

      {/* Neue Suche */}
      <section className="rounded-xl border border-edge bg-panel p-5 shadow-sm">
        <h2 className="mb-1 text-sm font-medium text-ink">Neue Suche</h2>
        <p className="mb-4 text-[13px] text-faint">
          Nische + Ort eingeben — Firmen, Entscheider, E-Mails und Personalisierung laufen automatisch.
        </p>
        {wsRes.data ? <NewSearchForm workspaceId={wsRes.data.id} /> : null}
      </section>

      {/* Letzte Suchen */}
      <section className="overflow-hidden rounded-xl border border-edge bg-panel shadow-sm">
        <div className="flex items-center justify-between border-b border-edge px-5 py-3">
          <h2 className="text-sm font-medium text-ink">Letzte Suchen</h2>
          <Link href="/searches" className="text-xs text-faint hover:text-ink">
            Alle anzeigen →
          </Link>
        </div>
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-edge text-left text-xs text-mute">
              <th className="px-5 py-2 font-medium">Liste</th>
              <th className="px-5 py-2 font-medium">Quelle</th>
              <th className="px-5 py-2 font-medium">Ort</th>
              <th className="px-5 py-2 font-medium">Max</th>
              <th className="px-5 py-2 font-medium">Status</th>
              <th className="px-5 py-2 font-medium">Erstellt</th>
            </tr>
          </thead>
          <tbody>
            {searches.map((s) => (
              <tr key={s.id} className="border-b border-edge transition-colors last:border-0 hover:bg-wash">
                <td className="px-5 py-2.5 font-medium text-ink">
                  <Link href={"/searches/" + s.id} className="hover:underline underline-offset-4">
                    {s.name ?? s.query}
                  </Link>
                </td>
                <td className="px-5 py-2.5">
                  <span className="rounded-md border border-edge bg-chip px-1.5 py-0.5 text-[11px] text-soft">
                    {s.source === "corporate" ? "Corporate" : "Maps"}
                  </span>
                </td>
                <td className="px-5 py-2.5 text-soft">{s.location}</td>
                <td className="px-5 py-2.5 text-soft">{s.max_results}</td>
                <td className="px-5 py-2.5"><StatusBadge status={s.status} /></td>
                <td className="px-5 py-2.5 text-faint">
                  {new Date(s.created_at).toLocaleString("de-DE", { dateStyle: "short", timeStyle: "short" })}
                </td>
              </tr>
            ))}
            {searches.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-center text-mute">
                  Noch keine Suchen — starte oben deine erste.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { dot: string; text: string }> = {
    pending: { dot: "bg-amber-400", text: "text-amber-700 dark:text-amber-300" },
    running: { dot: "bg-blue-500 animate-pulse", text: "text-blue-700 dark:text-blue-300" },
    completed: { dot: "bg-emerald-500", text: "text-emerald-700 dark:text-emerald-300" },
    failed: { dot: "bg-red-500", text: "text-red-700 dark:text-red-300" },
  };
  const c = config[status] ?? { dot: "bg-mute", text: "text-soft" };
  return (
    <span className={"inline-flex items-center gap-1.5 text-xs font-medium " + c.text}>
      <span className={"h-1.5 w-1.5 rounded-full " + c.dot} />
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}
