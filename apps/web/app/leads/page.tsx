import { createClient } from "@/lib/supabase/server";
import { filterSuppressed } from "@/lib/suppression";
import { getLangServer } from "@/lib/i18n/lang";
import { dict } from "@/lib/i18n/dict";
import LeadsTable from "./leads-table";

export default async function LeadsPage() {
  const lang = await getLangServer();
  const t = dict[lang];
  const supabase = await createClient();
  const [contactsRes, searchesRes, suppressionRes] = await Promise.all([
    supabase
      .from("contacts")
      .select("*, businesses(name, website, personalization, company_summary, search_id, address, phone_national, decisionmaker_status, hunter_status)")
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
        <h1 className="text-xl font-semibold tracking-tight text-ink">{t.leads.allLeadsTitle}</h1>
        <p className="text-sm text-faint">{t.leads.allLeadsSubtitle}</p>
      </div>
      <LeadsTable contacts={contacts} searches={searchOptions} exportName="alle-leads" />
    </div>
  );
}
