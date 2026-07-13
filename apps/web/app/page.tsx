import { createClient } from "@/lib/supabase/server";
import NewSearchForm from "./new-search-form";
import AutoRefresh from "./auto-refresh";

const STATUS_LABEL: Record<string, string> = {
  pending: "Wartet auf Worker",
  running: "Läuft",
  completed: "Fertig",
  failed: "Fehler",
};

export default async function Dashboard() {
  const supabase = await createClient();
  const { data: ws } = await supabase.from("workspaces").select("id").limit(1).single();
  const { data: searches } = await supabase
    .from("searches")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(20);
  const { count: bizCount } = await supabase
    .from("businesses")
    .select("*", { count: "exact", head: true });
  const { count: contactCount } = await supabase
    .from("contacts")
    .select("*", { count: "exact", head: true });
  const { count: emailCount } = await supabase
    .from("contacts")
    .select("*", { count: "exact", head: true })
    .not("email", "is", null);
  const hasActive = (searches ?? []).some((s) => s.status === "pending" || s.status === "running");

  return (
    <div className="space-y-8">
      {hasActive && <AutoRefresh />}
      <div className="grid grid-cols-3 gap-4">
        <Stat label="Firmen" value={bizCount ?? 0} />
        <Stat label="Kontakte" value={contactCount ?? 0} />
        <Stat label="mit E-Mail" value={emailCount ?? 0} />
      </div>
      <section className="rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="mb-4 font-semibold">Neue Suche</h2>
        {ws ? <NewSearchForm workspaceId={ws.id} /> : <p>Kein Workspace gefunden.</p>}
      </section>
      <section className="rounded-xl border bg-white shadow-sm">
        <h2 className="border-b px-6 py-4 font-semibold">Suchen</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs text-slate-500">
              <th className="px-6 py-2">Nische</th>
              <th className="px-6 py-2">Ort</th>
              <th className="px-6 py-2">Max</th>
              <th className="px-6 py-2">Status</th>
              <th className="px-6 py-2">Erstellt</th>
            </tr>
          </thead>
          <tbody>
            {(searches ?? []).map((s) => (
              <tr key={s.id} className="border-b last:border-0">
                <td className="px-6 py-2 font-medium">{s.query}</td>
                <td className="px-6 py-2">{s.location}</td>
                <td className="px-6 py-2">{s.max_results}</td>
                <td className="px-6 py-2">
                  <StatusBadge status={s.status} />
                </td>
                <td className="px-6 py-2 text-slate-500">
                  {new Date(s.created_at).toLocaleString("de-DE")}
                </td>
              </tr>
            ))}
            {(searches ?? []).length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-slate-400">
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

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border bg-white p-6 shadow-sm">
      <p className="text-3xl font-bold">{value}</p>
      <p className="text-sm text-slate-500">{label}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    pending: "bg-amber-100 text-amber-800",
    running: "bg-blue-100 text-blue-800",
    completed: "bg-green-100 text-green-800",
    failed: "bg-red-100 text-red-800",
  };
  return (
    <span className={"rounded-full px-2 py-0.5 text-xs " + (colors[status] ?? "")}>
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}
