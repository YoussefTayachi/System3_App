import { createClient } from "@/lib/supabase/server";

export default async function LeadsPage() {
  const supabase = await createClient();
  const { data: contacts } = await supabase
    .from("contacts")
    .select("*, businesses(name, website, address)")
    .order("created_at", { ascending: false })
    .limit(500);

  return (
    <section className="rounded-xl border bg-white shadow-sm">
      <h2 className="border-b px-6 py-4 font-semibold">
        Leads ({(contacts ?? []).length})
      </h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs text-slate-500">
              <th className="px-4 py-2">Firma</th>
              <th className="px-4 py-2">Person</th>
              <th className="px-4 py-2">Position</th>
              <th className="px-4 py-2">E-Mail</th>
              <th className="px-4 py-2">Quelle</th>
              <th className="px-4 py-2">LinkedIn</th>
            </tr>
          </thead>
          <tbody>
            {(contacts ?? []).map((c) => (
              <tr key={c.id} className="border-b last:border-0">
                <td className="px-4 py-2">
                  {c.businesses?.website ? (
                    <a
                      href={c.businesses.website}
                      target="_blank"
                      className="font-medium text-slate-900 hover:underline"
                    >
                      {c.businesses?.name}
                    </a>
                  ) : (
                    <span className="font-medium">{c.businesses?.name}</span>
                  )}
                </td>
                <td className="px-4 py-2">{c.full_name ?? "—"}</td>
                <td className="px-4 py-2 text-slate-500">{c.title ?? "—"}</td>
                <td className="px-4 py-2">
                  {c.email ? (
                    <span>
                      {c.email}
                      {c.email_confidence != null && (
                        <span className="ml-1 text-xs text-slate-400">
                          ({c.email_confidence}%)
                        </span>
                      )}
                    </span>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </td>
                <td className="px-4 py-2">
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs">
                    {c.source === "ai_websearch" ? "KI-Recherche" : c.source}
                  </span>
                </td>
                <td className="px-4 py-2">
                  {c.linkedin ? (
                    <a href={c.linkedin} target="_blank" className="text-blue-600 hover:underline">
                      Profil
                    </a>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </td>
              </tr>
            ))}
            {(contacts ?? []).length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                  Noch keine Leads.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
