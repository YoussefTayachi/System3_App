import { createClient } from "@/lib/supabase/server";
import NewSearchForm from "./new-search-form";
import AutoRefresh from "./auto-refresh";
import ActivityChart from "./activity-chart";
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
          <h1 className="text-xl font-semibold tracking-tight text-zinc-100">Dashboard</h1>
          <p className="text-sm text-zinc-500">Überblick über deine Lead-Pipeline</p>
        </div>
        {hasActive && (
          <span className="flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs text-indigo-300">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-indigo-400" />
            {stats.jobs_active} Jobs aktiv
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat icon={<IconSearch className="h-4 w-4" />} label="Suchen" value={stats.searches_total ?? 0} />
        <Stat icon={<IconBuilding className="h-4 w-4" />} label="Firmen gefunden" value={stats.businesses_total ?? 0} />
        <Stat icon={<IconLeads className="h-4 w-4" />} label="Kontakte" value={stats.contacts_total ?? 0} sub={(stats.contacts_with_email ?? 0) + " mit E-Mail"} />
        <Stat icon={<IconSparkle className="h-4 w-4" />} label="Personalisiert" value={stats.personalized ?? 0} />
        <Stat icon={<IconMail className="h-4 w-4" />} label="E-Mails gesendet" value={stats.emails_sent ?? 0} sub={(stats.replies ?? 0) + " Antworten"} />
        <Stat
          icon={<IconCost className="h-4 w-4" />}
          label="API-Kosten (geschätzt)"
          value={"$" + costs.usd.toFixed(2)}
          sub={"+ " + costs.hunterCredits + " Hunter-Credits"}
        />
        <div className="col-span-2 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
          <p className="mb-3 text-xs font-medium uppercase tracking-wider text-zinc-500">
            Neue Leads — letzte 14 Tage
          </p>
          <ActivityChart data={stats.activity ?? []} />
        </div>
      </div>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
        <h2 className="mb-1 font-medium text-zinc-100">Neue Suche</h2>
        <p className="mb-4 text-sm text-zinc-500">
          Nische + Ort eingeben — Firmen, Entscheider, E-Mails und Personalisierung laufen automatisch.
        </p>
        {wsRes.data ? <NewSearchForm workspaceId={wsRes.data.id} /> : null}
      </section>

      <section className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/40">
        <h2 className="border-b border-zinc-800 px-6 py-4 font-medium text-zinc-100">
          Letzte Suchen
        </h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800 text-left text-xs text-zinc-500">
              <th className="px-6 py-2.5 font-medium">Nische</th>
              <th className="px-6 py-2.5 font-medium">Ort</th>
              <th className="px-6 py-2.5 font-medium">Max</th>
              <th className="px-6 py-2.5 font-medium">Status</th>
              <th className="px-6 py-2.5 font-medium">Erstellt</th>
            </tr>
          </thead>
          <tbody>
            {searches.map((s) => (
              <tr key={s.id} className="border-b border-zinc-800/60 transition-colors last:border-0 hover:bg-zinc-800/30">
                <td className="px-6 py-3 font-medium text-zinc-200">{s.query}</td>
                <td className="px-6 py-3 text-zinc-400">{s.location}</td>
                <td className="px-6 py-3 text-zinc-400">{s.max_results}</td>
                <td className="px-6 py-3"><StatusBadge status={s.status} /></td>
                <td className="px-6 py-3 text-zinc-500">
                  {new Date(s.created_at).toLocaleString("de-DE", { dateStyle: "short", timeStyle: "short" })}
                </td>
              </tr>
            ))}
            {searches.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-10 text-center text-zinc-500">
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
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  sub?: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">{label}</p>
        <span className="text-zinc-600">{icon}</span>
      </div>
      <p className="text-2xl font-semibold tracking-tight text-zinc-100">{value}</p>
      {sub && <p className="mt-1 text-xs text-zinc-500">{sub}</p>}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { dot: string; text: string }> = {
    pending: { dot: "bg-amber-400", text: "text-amber-300" },
    running: { dot: "bg-blue-400 animate-pulse", text: "text-blue-300" },
    completed: { dot: "bg-emerald-400", text: "text-emerald-300" },
    failed: { dot: "bg-red-400", text: "text-red-300" },
  };
  const c = config[status] ?? { dot: "bg-zinc-500", text: "text-zinc-400" };
  return (
    <span className={"inline-flex items-center gap-1.5 text-xs " + c.text}>
      <span className={"h-1.5 w-1.5 rounded-full " + c.dot} />
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}
