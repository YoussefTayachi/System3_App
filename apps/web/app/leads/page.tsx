import { createClient } from "@/lib/supabase/server";
import { filterSuppressed } from "@/lib/suppression";
import LeadsTable from "./leads-table";

export default async function LeadsPage() {
  const supabase = await createClient();
  const [contactsRes, searchesRes, suppressionRes] = await Promise.all([
    supabase
      .from("contacts")
      .select("*, businesses(name, website, personalization, search_id)")
      .order("created_at", { ascending: false })
      .limit(1000),
    supabase
      .from("searches")
      .select("id, name, query, location")
      .is("deleted_at", null)
      .order("created_at", { ascending: false }),
    supabase.from("suppression_list").select("email,domain"),
  ]);
  const contacts = filterSuppressed(contactsRes.data ?? [], suppressionRes.data ?? []);
  const searchOptions = (searchesRes.data ?? []).map((s) => ({
    id: s.id,
    query: s.name ?? s.query,
    location: s.location,
  }));

  return (
    <div className="fade-up space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-zinc-100">Alle Leads</h1>
        <p className="text-sm text-zinc-500">
          Gesamtbestand über alle Suchen — für einzelne Listen siehe „Suchen".
        </p>
      </div>
      <LeadsTable contacts={contacts} searches={searchOptions} exportName="alle-leads" />
    </div>
  );
}
