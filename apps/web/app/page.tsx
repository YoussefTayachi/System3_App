import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import NewSearchForm from "./new-search-form";
import AutoRefresh from "./auto-refresh";
import ActivityChart from "./activity-chart";
import CountUp from "./count-up";
import {
  IconBuilding,
  IconCost,
  IconLeads,
  IconMail,
  IconSearch,
  IconSparkle,
} from "./icons";

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
  const google = s.jobs_geocode * 0.005 + Math.ceil(s.businesses_total / 20) * 0.032;
  const openai = s.jobs_decisionmaker * 0.03 + s.jobs_personalize * 0.003;
  return { usd: google + openai, hunterCredits: s.jobs_hunter };
}

export default async function Dashboard() {
  const supabase = await createClient();
  const [statsRes, searchesRes, wsRes] = await Promise.all([
    supabase.rpc("dashboard_stats"),
    supabase.from("searches").select("*").order("created_at", { ascending: false }).limit(15),
    supabase.from("workspaces").select("id").limit(1).single(),
  ]);
  const stats = (statsRes.data ?? {}) as Stats;
  const searches = searchesRes.data ?? [];
  const costs = estimateCosts(stats);
  const hasActive = (stats.jobs_active ?? 0) > 0;

  return (
    <div className="fade-up space-y-6">
      {hasActive && <AutoRefresh />}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-ink">Dashboard</h1>
          <p className="text-sm text-faint">Überblick über deine Lead-Pipeline</p>
        </div>
        {hasActive && (
          <span className="flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs text-indigo-600 dark:text-indigo-300">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-indigo-400" />
            {stats.jobs_active} Jobs aktiv
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat i={0} icon={<IconSearch className="h-4 w-4" />} label="Suchen" value={stats.searches_total ?? 0} />
        <Stat i={1} icon={<IconBuilding className="h-4 w-4" />} label="Firmen gefunden" value={stats.businesses_total ?? 0} />
        <Stat i={2} icon={<IconLeads className="h-4 w-4" />} label="Kontakte" value={stats.contacts_total ?? 0} sub={(stats.contacts_with_email ?? 0) + " mit E-Mail"} />
        <Stat i={3} icon={<IconSparkle className="h-4 w-4" />} label="Personalisiert" value={stats.personalized ?? 0} />
        <Stat i={4} icon={<IconMail className="h-4 w-4" />} label="E-Mails gesendet" value={stats.emails_sent ?? 0} sub={(stats.replies ?? 0) + " Antworten"} />
        <Stat
          i={5}
          icon={<IconCost className="h-4 w-4" />}
          label="API-Kosten (geschätzt)"
          value={"$" + costs.usd.toFixed(2)}
          sub={"+ " + costs.hunterCredits + " Hunter-Credits"}
        />
        <div
          className="fade-up col-span-2 rounded-2xl border border-edge bg-panel p-5"
          style={{ animationDelay: "240ms" }}
        >
          <p className="mb-3 text-xs font-medium uppercase tracking-wider text-faint">
            Neue Leads — letzte 14 Tage
          </p>
          <ActivityChart data={stats.activity ?? []} />
        </div>
      </div>

      <section className="rounded-2xl border border-edge bg-panel p-6">
        <h2 className="mb-1 font-medium text-ink">Neue Suche</h2>
        <p className="mb-4 text-sm text-faint">
          Nische + Ort eingeben — Firmen, Entscheider, E-Mails und Personalisierung laufen automatisch.
        </p>
        {wsRes.data ? <NewSearchForm workspaceId={wsRes.data.id} /> : null}
      </section>

      <section className="overflow-hidden rounded-2xl border border-edge bg-panel">
        <div className="flex items-center justify-between border-b border-edge px-6 py-4">
          <h2 className="font-medium text-ink">Letzte Suchen</h2>
          <Link href="/searches" className="text-xs text-faint hover:text-ink">
            Alle anzeigen →
          </Link>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-edge text-left text-xs text-faint">
              <th className="px-6 py-2.5 font-medium">Nische</th>
              <th className="px-6 py-2.5 font-medium">Quelle</th>
              <th className="px-6 py-2.5 font-medium">Ort</th>
              <th className="px-6 py-2.5 font-medium">Max</th>
              <th className="px-6 py-2.5 font-medium">Status</th>
              <th className="px-6 py-2.5 font-medium">Erstellt</th>
            </tr>
          </thead>
          <tbody>
            {searches.map((s) => (
              <tr key={s.id} className="border-b border-edge transition-colors last:border-0 hover:bg-wash">
                <td className="px-6 py-3 font-medium text-ink">
                  <Link href={"/searches/" + s.id} className="underline-offset-4 hover:text-indigo-600 dark:hover:text-indigo-600 dark:text-indigo-300 hover:underline">
                    {s.query}
                  </Link>
                </td>
                <td className="px-6 py-3">
                  <span className="rounded-full border border-edge2 bg-chip px-2 py-0.5 text-[11px] text-soft">
                    {s.source === "corporate" ? "Corporate" : "Maps"}
                  </span>
                </td>
                <td className="px-6 py-3 text-soft">{s.location}</td>
                <td className="px-6 py-3 text-soft">{s.max_results}</td>
                <td className="px-6 py-3"><StatusBadge status={s.status} /></td>
                <td className="px-6 py-3 text-faint">
                  {new Date(s.created_at).toLocaleString("de-DE", { dateStyle: "short", timeStyle: "short" })}
                </td>
              </tr>
            ))}
            {searches.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-10 text-center text-faint">
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

function Stat({
  icon,
  label,
  value,
  sub,
  i = 0,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  sub?: string;
  i?: number;
}) {
  return (
    <div
      className="fade-up group rounded-2xl border border-edge bg-panel p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-edge2 hover:shadow-xl hover:shadow-indigo-500/5"
      style={{ animationDelay: i * 40 + "ms" }}
    >
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wider text-faint">{label}</p>
        <span className="text-mute transition-colors group-hover:text-indigo-500 dark:group-hover:text-indigo-400">{icon}</span>
      </div>
      <p className="text-2xl font-semibold tracking-tight text-ink">
        {typeof value === "number" ? <CountUp value={value} /> : value}
      </p>
      {sub && <p className="mt-1 text-xs text-faint">{sub}</p>}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { dot: string; text: string }> = {
    pending: { dot: "bg-amber-400", text: "text-amber-600 dark:text-amber-300" },
    running: { dot: "bg-blue-400 animate-pulse", text: "text-blue-600 dark:text-blue-300" },
    completed: { dot: "bg-emerald-400", text: "text-emerald-600 dark:text-emerald-300" },
    failed: { dot: "bg-red-400", text: "text-red-500 dark:text-red-300" },
  };
  const c = config[status] ?? { dot: "bg-mute", text: "text-soft" };
  return (
    <span className={"inline-flex items-center gap-1.5 text-xs " + c.text}>
      <span className={"h-1.5 w-1.5 rounded-full " + c.dot} />
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}
