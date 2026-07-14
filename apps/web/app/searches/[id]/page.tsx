import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import LeadsTable from "../../leads/leads-table";

export default async function SearchDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const [searchRes, contactsRes] = await Promise.all([
    supabase.from("searches").select("*").eq("id", id).single(),
    supabase
      .from("contacts")
      .select("*, businesses!inner(name, website, personalization, search_id)")
      .eq("businesses.search_id", id)
      .order("created_at", { ascending: false })
      .limit(1000),
  ]);
  const search = searchRes.data;

  if (!search) {
    return <p className="text-zinc-500">Suche nicht gefunden.</p>;
  }

  return (
    <div className="fade-up space-y-6">
      <div>
        <Link href="/searches" className="text-xs text-zinc-500 hover:text-zinc-200">
          ← Alle Suchen
        </Link>
        <div className="mt-1 flex items-center gap-2.5">
          <h1 className="text-xl font-semibold tracking-tight text-zinc-100">{search.query}</h1>
          <span className="rounded-full border border-zinc-700/80 bg-zinc-800/60 px-2 py-0.5 text-[11px] text-zinc-400">
            {search.source === "corporate" ? "Corporate" : "Maps"}
          </span>
        </div>
        <p className="text-sm text-zinc-500">
          {search.location} ·{" "}
          {new Date(search.created_at).toLocaleString("de-DE", { dateStyle: "long", timeStyle: "short" })}
        </p>
      </div>
      <LeadsTable
        contacts={contactsRes.data ?? []}
        exportName={search.query + " - " + search.location}
      />
    </div>
  );
}
