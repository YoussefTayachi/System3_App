import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { filterSuppressed } from "@/lib/suppression";
import LeadsTable from "../../leads/leads-table";
import SearchSettings from "./search-settings";

export default async function SearchDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const [searchRes, contactsRes, suppressionRes] = await Promise.all([
    supabase.from("searches").select("*").eq("id", id).single(),
    supabase
      .from("contacts")
      .select("*, businesses!inner(name, website, personalization, search_id)")
      .eq("businesses.search_id", id)
      .order("created_at", { ascending: false })
      .limit(1000),
    supabase.from("suppression_list").select("email,domain"),
  ]);
  const search = searchRes.data;

  if (!search) {
    return <p className="text-faint">Suche nicht gefunden.</p>;
  }

  const contacts = filterSuppressed(contactsRes.data ?? [], suppressionRes.data ?? []);

  return (
    <div className="fade-up space-y-6">
      <div>
        <Link href="/searches" className="text-xs text-faint hover:text-ink">
          ← Alle Suchen
        </Link>
        <div className="mt-1 flex flex-wrap items-center gap-2.5">
          <SearchSettings
            searchId={search.id}
            initialName={search.name ?? search.query}
            initialSchedule={search.schedule ?? "none"}
          />
          <span className="rounded-full border border-edge2 bg-chip px-2 py-0.5 text-[11px] text-soft">
            {search.source === "corporate" ? "Corporate" : "Maps"}
          </span>
        </div>
        <p className="text-sm text-faint">
          {search.query} · {search.location} ·{" "}
          {new Date(search.created_at).toLocaleString("de-DE", { dateStyle: "long", timeStyle: "short" })}
        </p>
      </div>
      <LeadsTable
        contacts={contacts}
        exportName={(search.name ?? search.query) + " - " + search.location}
      />
    </div>
  );
}
