import { createClient } from "@/lib/supabase/server";
import LeadsTable from "./leads-table";

export default async function LeadsPage() {
  const supabase = await createClient();
  const { data: contacts } = await supabase
    .from("contacts")
    .select("*, businesses(name, website, address, personalization)")
    .order("created_at", { ascending: false })
    .limit(500);

  return (
    <div className="fade-up space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-zinc-100">Leads</h1>
        <p className="text-sm text-zinc-500">Alle gefundenen Kontakte mit E-Mail und Kontext</p>
      </div>
      <LeadsTable contacts={contacts ?? []} />
    </div>
  );
}
