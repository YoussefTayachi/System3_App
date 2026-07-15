"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Row = { id: string; email: string | null; domain: string | null; reason: string };

function parseInput(text: string): { emails: string[]; domains: string[] } {
  const tokens = text
    .split(/[\n,;]+/)
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
  const emails = new Set<string>();
  const domains = new Set<string>();
  for (const t of tokens) {
    if (t.includes("@")) {
      // CSV-Zeilen wie "Max;max@firma.de;..." -> E-Mail herausfischen
      const match = t.match(/[\w.+-]+@[\w-]+\.[\w.-]+/);
      if (match) emails.add(match[0]);
    } else {
      const d = t.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0];
      if (d.includes(".")) domains.add(d);
    }
  }
  return { emails: [...emails], domains: [...domains] };
}

export default function BlocklistPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [input, setInput] = useState("");
  const [status, setStatus] = useState("");
  const [wsId, setWsId] = useState<string | null>(null);

  async function reload() {
    const { data } = await createClient()
      .from("suppression_list")
      .select("id,email,domain,reason")
      .order("created_at", { ascending: false })
      .limit(2000);
    setRows(data ?? []);
  }

  useEffect(() => {
    createClient()
      .from("workspaces")
      .select("id")
      .limit(1)
      .single()
      .then(({ data }) => data && setWsId(data.id));
    reload();
  }, []);

  async function addEntries(text: string) {
    if (!wsId) return;
    const { emails, domains } = parseInput(text);
    if (emails.length === 0 && domains.length === 0) {
      setStatus("Keine gültigen E-Mails oder Domains erkannt.");
      return;
    }
    setStatus("Speichere...");
    const supabase = createClient();
    const rowsToInsert = [
      ...emails.map((email) => ({ workspace_id: wsId, email, reason: "manual" })),
      ...domains.map((domain) => ({ workspace_id: wsId, domain, reason: "manual" })),
    ];
    for (let i = 0; i < rowsToInsert.length; i += 500) {
      await supabase
        .from("suppression_list")
        .upsert(rowsToInsert.slice(i, i + 500), { onConflict: "workspace_id,email", ignoreDuplicates: true });
    }
    setStatus(`${emails.length} E-Mails und ${domains.length} Domains blockiert.`);
    setInput("");
    reload();
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => addEntries(String(reader.result ?? ""));
    reader.readAsText(file);
    e.target.value = "";
  }

  async function remove(id: string) {
    await createClient().from("suppression_list").delete().eq("id", id);
    setRows((r) => r.filter((x) => x.id !== id));
  }

  return (
    <div className="fade-up max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-ink">Blockliste</h1>
        <p className="text-sm text-faint">
          Bestandskunden & bereits kontaktierte Leads — werden nie angezeigt, nie exportiert und
          bei neuen Suchen gar nicht erst recherchiert.
        </p>
      </div>

      <div className="rounded-2xl border border-edge bg-panel p-6">
        <h2 className="mb-1 font-medium text-ink">Einträge hinzufügen</h2>
        <p className="mb-3 text-xs text-faint">
          E-Mails blockieren die Person, Domains (z.B. <span className="text-soft">kunde-gmbh.de</span>) die
          ganze Firma. Einfach einfügen — eine pro Zeile oder mit Komma getrennt. CSV-Upload nimmt
          automatisch alle enthaltenen E-Mail-Adressen.
        </p>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          rows={5}
          placeholder={"max@bestandskunde.de\nkunde-gmbh.at\ninfo@schon-kontaktiert.de"}
          className="w-full rounded-lg border border-edge2 bg-field px-3 py-2 font-mono text-sm text-ink placeholder-mute outline-none focus:border-indigo-500"
        />
        <div className="mt-3 flex items-center gap-3">
          <button
            onClick={() => addEntries(input)}
            className="rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-indigo-600/25 transition-all hover:shadow-xl hover:shadow-indigo-600/35 hover:brightness-110 active:scale-[0.98]"
          >
            Blockieren
          </button>
          <label className="cursor-pointer rounded-lg border border-edge2 px-4 py-2 text-sm text-soft transition-colors hover:border-edge3 hover:text-ink">
            CSV hochladen
            <input type="file" accept=".csv,.txt" onChange={onFile} className="hidden" />
          </label>
          {status && <span className="text-xs text-faint">{status}</span>}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-edge bg-panel">
        <h2 className="border-b border-edge px-5 py-3 text-sm font-medium text-ink">
          {rows.length} Einträge
        </h2>
        <div className="max-h-96 divide-y divide-edge overflow-y-auto">
          {rows.map((r) => (
            <div key={r.id} className="flex items-center gap-3 px-5 py-2">
              <span className="min-w-0 flex-1 truncate font-mono text-sm text-soft">
                {r.email ?? r.domain}
              </span>
              <span className="rounded-full border border-edge2 bg-chip px-2 py-0.5 text-[11px] text-faint">
                {r.email ? "E-Mail" : "Domain"}
              </span>
              <button
                onClick={() => remove(r.id)}
                className="text-xs text-mute transition-colors hover:text-red-600 dark:hover:text-red-600 dark:text-red-400"
              >
                Entfernen
              </button>
            </div>
          ))}
          {rows.length === 0 && (
            <p className="px-5 py-8 text-center text-sm text-faint">Noch keine Einträge.</p>
          )}
        </div>
      </div>
    </div>
  );
}
