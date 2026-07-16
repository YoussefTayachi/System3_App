import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { filterSuppressed } from "@/lib/suppression";
import { getLangServer, formatDate } from "@/lib/i18n/lang";
import { dict } from "@/lib/i18n/dict";
import LeadsTable from "../../leads/leads-table";
import SearchSettings from "./search-settings";

export default async function SearchDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const lang = await getLangServer();
  const t = dict[lang];
  const supabase = await createClient();
  const [searchRes, contactsRes, suppressionRes] = await Promise.all([
    supabase.from("searches").select("*").eq("id", id).single(),
    supabase
      .from("contacts")
      .select("*, businesses!inner(name, website, personalization, company_summary, search_id, address, phone_national, decisionmaker_status, hunter_status)")
      .eq("businesses.search_id", id)
      .order("created_at", { ascending: false })
      .limit(1000),
    supabase.from("suppression_list").select("email,domain"),
  ]);
  const search = searchRes.data;

  if (!search) {
    return <p className="text-faint">{t.searchDetail.notFound}</p>;
  }

  const contacts = filterSuppressed(contactsRes.data ?? [], suppressionRes.data ?? []);

  return (
    <div className="fade-up space-y-6">
      <div>
        <Link href="/searches" className="text-xs text-faint hover:text-ink">
          {t.searchDetail.back}
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
          {search.query} · {search.location} · {formatDate(search.created_at, lang, { dateStyle: "long", timeStyle: "short" })}
        </p>
      </div>
      <LeadsTable
        contacts={contacts}
        exportName={(search.name ?? search.query) + " - " + search.location}
      />
    </div>
  );
}
