"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { IconSearch } from "../icons";

type Contact = {
  id: string;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  title: string | null;
  email: string | null;
  email_confidence: number | null;
  email_verification_status: string | null;
  phone: string | null;
  linkedin: string | null;
  source: string;
  businesses: {
    name: string;
    website: string | null;
    personalization: string | null;
    search_id?: string | null;
    address?: string | null;
    phone_national?: string | null;
    decisionmaker_status?: string | null;
    hunter_status?: string | null;
  } | null;
};

type Merged = {
  id: string;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  title: string | null;
  email: string | null;
  email_confidence: number | null;
  email_verification_status: string | null;
  phone: string | null;
  linkedin: string | null;
  sources: string[];
};

type Group = {
  key: string;
  name: string;
  website: string | null;
  personalization: string | null;
  search_id: string | null;
  address: string | null;
  phone_national: string | null;
  decisionmaker_status: string | null;
  hunter_status: string | null;
  contacts: Merged[];
};

type SearchOption = { id: string; query: string; location: string };

const SOURCE_LABEL: Record<string, string> = { ai_websearch: "KI", hunter: "Hunter", manual: "Manuell" };
const ALL_COLUMNS = [
  { id: "title", label: "Position" },
  { id: "email", label: "E-Mail" },
  { id: "phone", label: "Telefon" },
  { id: "sources", label: "Quellen" },
] as const;

function normName(name: string | null): string | null {
  if (!name) return null;
  return name
    .toLowerCase()
    .replace(/\b(mag|dr|msc|bsc|mba|akad|vkfm|vkff|ing|prof)\b\.?/g, "")
    .replace(/[^a-zäöüß ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function mergeInto(target: Merged, c: Contact) {
  if (!target.title || (c.title && c.title.length > target.title.length)) target.title = c.title ?? target.title;
  if (!target.email && c.email) {
    target.email = c.email;
    target.email_confidence = c.email_confidence;
    target.email_verification_status = c.email_verification_status;
  }
  if (!target.phone && c.phone) target.phone = c.phone;
  if (!target.first_name && c.first_name) target.first_name = c.first_name;
  if (!target.last_name && c.last_name) target.last_name = c.last_name;
  if (!target.linkedin && c.linkedin) target.linkedin = c.linkedin;
  if (!target.sources.includes(c.source)) target.sources.push(c.source);
}

function groupContacts(contacts: Contact[]): Group[] {
  const groups = new Map<string, Group>();
  for (const c of contacts) {
    const b = c.businesses;
    const key = b?.website || b?.name || "unbekannt";
    let g = groups.get(key);
    if (!g) {
      g = {
        key,
        name: b?.name ?? "Unbekannt",
        website: b?.website ?? null,
        personalization: b?.personalization ?? null,
        search_id: b?.search_id ?? null,
        address: b?.address ?? null,
        phone_national: b?.phone_national ?? null,
        decisionmaker_status: b?.decisionmaker_status ?? null,
        hunter_status: b?.hunter_status ?? null,
        contacts: [],
      };
      groups.set(key, g);
    }
    const email = c.email?.toLowerCase() ?? null;
    const name = normName(c.full_name);
    const existing = g.contacts.find(
      (m) =>
        (email && m.email?.toLowerCase() === email) ||
        (name && normName(m.full_name) === name)
    );
    if (existing) {
      mergeInto(existing, c);
    } else {
      g.contacts.push({
        id: c.id,
        full_name: c.full_name,
        first_name: c.first_name,
        last_name: c.last_name,
        title: c.title,
        email: c.email,
        email_confidence: c.email_confidence,
        email_verification_status: c.email_verification_status,
        phone: c.phone,
        linkedin: c.linkedin,
        sources: [c.source],
      });
    }
  }
  return Array.from(groups.values());
}

function splitName(c: Merged): { first: string; last: string } {
  if (c.first_name || c.last_name) {
    return { first: c.first_name ?? "", last: c.last_name ?? "" };
  }
  const parts = (c.full_name ?? "").split(" ");
  return { first: parts[0] ?? "", last: parts.slice(1).join(" ") };
}

function toCsv(groups: Group[]): string {
  const header = [
    "Firma", "Website", "Person", "Position", "E-Mail", "Confidence",
    "Telefon", "LinkedIn", "Quellen", "Personalisierung",
  ];
  const esc = (v: unknown) => '"' + (v == null ? "" : String(v)).replace(/"/g, '""') + '"';
  const lines = groups.flatMap((g) =>
    g.contacts.map((c) =>
      [g.name, g.website, c.full_name, c.title, c.email, c.email_confidence,
       c.phone, c.linkedin, c.sources.join("+"), g.personalization].map(esc).join(";")
    )
  );
  return [header.join(";"), ...lines].join("\n");
}

function toInstantlyCsv(groups: Group[]): string {
  const header = [
    "email", "first_name", "last_name", "company_name", "phone",
    "website", "personalization", "title", "linkedin",
  ];
  const esc = (v: unknown) => {
    const s = v == null ? "" : String(v).replace(/\r?\n/g, " ");
    return /[",]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  const seen = new Set<string>();
  const lines: string[] = [];
  for (const g of groups) {
    for (const c of g.contacts) {
      const email = c.email?.trim().toLowerCase();
      if (!email || seen.has(email)) continue;
      seen.add(email);
      const { first, last } = splitName(c);
      lines.push(
        [email, first, last, g.name, c.phone, g.website, g.personalization, c.title, c.linkedin]
          .map(esc)
          .join(",")
      );
    }
  }
  return [header.join(","), ...lines].join("\n");
}

function VerificationShield({ c }: { c: Merged }) {
  if (!c.email) return null;
  const verified =
    c.email_verification_status === "valid" || (c.email_confidence ?? 0) >= 85;
  return (
    <span
      title={
        verified
          ? "Verifizierte E-Mail" + (c.email_confidence ? ` (${c.email_confidence}% Confidence)` : "")
          : "Unverifiziert — vor dem Versand prüfen"
      }
      className={verified ? "text-emerald-500" : "text-amber-500"}
    >
      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-3.5 8-10V5l-8-3-8 3v7c0 6.5 8 10 8 10z" />
        {verified ? <path d="m9 12 2 2 4-4" /> : <path d="M12 8v4m0 3h.01" />}
      </svg>
    </span>
  );
}

function PipelineStep({
  label,
  state,
  detail,
}: {
  label: string;
  state: "done" | "active" | "pending" | "failed" | "empty";
  detail?: string;
}) {
  const dot = {
    done: "bg-emerald-500",
    active: "bg-blue-500 animate-pulse",
    pending: "bg-chip border border-edge2",
    failed: "bg-red-500",
    empty: "bg-amber-400",
  }[state];
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <span className={"mt-0.5 h-2.5 w-2.5 rounded-full " + dot} />
        <span className="w-px flex-1 bg-edge" />
      </div>
      <div className="pb-4">
        <p className="text-sm text-ink">{label}</p>
        {detail && <p className="text-xs text-faint">{detail}</p>}
      </div>
    </div>
  );
}

function statusToState(s: string | null | undefined): "done" | "active" | "pending" | "failed" | "empty" {
  if (s === "found") return "done";
  if (s === "not_found") return "empty";
  if (s === "running") return "active";
  if (s === "failed") return "failed";
  return "pending";
}

export default function LeadsTable({
  contacts,
  searches,
  exportName = "leads",
}: {
  contacts: Contact[];
  searches?: SearchOption[];
  exportName?: string;
}) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [onlyEmail, setOnlyEmail] = useState(false);
  const [searchFilter, setSearchFilter] = useState("");
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [drawer, setDrawer] = useState<Group | null>(null);
  const [cols, setCols] = useState<Set<string>>(new Set(ALL_COLUMNS.map((c) => c.id)));
  const [colsOpen, setColsOpen] = useState(false);
  const colsRef = useRef<HTMLDivElement>(null);
  const [bulkStatus, setBulkStatus] = useState("");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("leads_cols");
      if (saved) setCols(new Set(JSON.parse(saved)));
    } catch {}
  }, []);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (colsRef.current && !colsRef.current.contains(e.target as Node)) setColsOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function toggleCol(id: string) {
    setCols((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      try {
        localStorage.setItem("leads_cols", JSON.stringify([...next]));
      } catch {}
      return next;
    });
  }

  const allGroups = useMemo(() => groupContacts(contacts), [contacts]);

  const filtered = useMemo(() => {
    const needle = q.toLowerCase();
    return allGroups
      .filter((g) => !searchFilter || g.search_id === searchFilter)
      .map((g) => {
        const companyMatch = !needle || g.name.toLowerCase().includes(needle);
        const cs = g.contacts.filter((c) => {
          if (onlyEmail && !c.email) return false;
          if (!needle || companyMatch) return true;
          return [c.full_name, c.title, c.email]
            .filter(Boolean)
            .some((v) => v!.toLowerCase().includes(needle));
        });
        return { ...g, contacts: cs };
      })
      .filter((g) => g.contacts.length > 0);
  }, [allGroups, q, onlyEmail, searchFilter]);

  const totalContacts = useMemo(
    () => allGroups.reduce((n, g) => n + g.contacts.length, 0),
    [allGroups]
  );
  const shownContacts = filtered.reduce((n, g) => n + g.contacts.length, 0);
  const selectedGroups = filtered.filter((g) => selected.has(g.key));
  const selectedContacts = selectedGroups.reduce((n, g) => n + g.contacts.length, 0);

  function toggle(key: string) {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function toggleSelect(key: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function download(content: string, suffix: string) {
    const blob = new Blob(["﻿" + content], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = exportName.replace(/[^\wäöüÄÖÜß -]/g, "").trim() + suffix;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function blockSelected() {
    if (!confirm(`${selectedGroups.length} Firmen auf die Blockliste setzen? Sie verschwinden aus allen Ansichten und werden nie mehr recherchiert.`)) return;
    setBulkStatus("Blockiere...");
    const supabase = createClient();
    const { data: ws } = await supabase.from("workspaces").select("id").limit(1).single();
    if (!ws) return;
    const rows = selectedGroups
      .filter((g) => g.website)
      .map((g) => ({
        workspace_id: ws.id,
        domain: g.website!.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0],
        reason: "manual",
      }));
    if (rows.length) {
      await supabase.from("suppression_list").upsert(rows, { onConflict: "workspace_id,email", ignoreDuplicates: true });
    }
    setBulkStatus("");
    setSelected(new Set());
    router.refresh();
  }

  const forceOpen = q.length > 0;
  const activeChips: { label: string; clear: () => void }[] = [];
  if (searchFilter) {
    const s = searches?.find((x) => x.id === searchFilter);
    activeChips.push({ label: "Suche: " + (s?.query ?? "…"), clear: () => setSearchFilter("") });
  }
  if (onlyEmail) activeChips.push({ label: "Nur mit E-Mail", clear: () => setOnlyEmail(false) });
  if (q) activeChips.push({ label: '"' + q + '"', clear: () => setQ("") });

  return (
    <>
      <section className="overflow-hidden rounded-xl border border-edge bg-panel">
        <div className="flex flex-wrap items-center gap-3 border-b border-edge px-4 py-3">
          <div className="relative min-w-52 flex-1">
            <IconSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-mute" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Filtern nach Firma, Name, E-Mail..."
              className="w-full rounded-lg border border-edge2 bg-field py-2 pl-9 pr-3 text-sm text-ink placeholder-mute outline-none transition-colors focus:border-indigo-500"
            />
          </div>
          {searches && searches.length > 0 && (
            <select
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="rounded-lg border border-edge2 bg-field px-3 py-2 text-sm text-ink outline-none transition-colors focus:border-indigo-500"
            >
              <option value="">Alle Suchen</option>
              {searches.map((s) => (
                <option key={s.id} value={s.id}>{s.query} — {s.location}</option>
              ))}
            </select>
          )}
          <label className="flex cursor-pointer items-center gap-2 text-sm text-soft">
            <input
              type="checkbox"
              checked={onlyEmail}
              onChange={(e) => setOnlyEmail(e.target.checked)}
              className="h-4 w-4 rounded accent-indigo-500"
            />
            Nur mit E-Mail
          </label>
          <div className="relative" ref={colsRef}>
            <button
              onClick={() => setColsOpen(!colsOpen)}
              className="rounded-lg border border-edge2 px-3 py-2 text-xs font-medium text-soft transition-colors hover:border-edge3 hover:text-ink"
            >
              Spalten
            </button>
            {colsOpen && (
              <div className="absolute right-0 top-full z-20 mt-1 w-44 rounded-lg border border-edge bg-panel p-2 shadow-2xl">
                {ALL_COLUMNS.map((c) => (
                  <label key={c.id} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm text-soft hover:bg-wash">
                    <input
                      type="checkbox"
                      checked={cols.has(c.id)}
                      onChange={() => toggleCol(c.id)}
                      className="h-3.5 w-3.5 rounded accent-indigo-500"
                    />
                    {c.label}
                  </label>
                ))}
              </div>
            )}
          </div>
          <span className="text-xs text-faint">
            {filtered.length} Firmen · {shownContacts} von {totalContacts} Kontakten
          </span>
          <button
            onClick={() => download(toInstantlyCsv(filtered), "-instantly.csv")}
            disabled={shownContacts === 0}
            title="Spalten exakt für Instantlys CSV-Import benannt"
            className="rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 px-3 py-1.5 text-xs font-medium text-white shadow-lg shadow-indigo-600/25 transition-all hover:shadow-xl hover:shadow-indigo-600/35 hover:brightness-110 active:scale-[0.98] disabled:opacity-40"
          >
            Für Instantly exportieren
          </button>
          <button
            onClick={() => download(toCsv(filtered), ".csv")}
            disabled={shownContacts === 0}
            className="rounded-lg border border-edge2 px-3 py-1.5 text-xs font-medium text-soft transition-colors hover:border-edge3 hover:text-ink disabled:opacity-40"
          >
            Excel-CSV
          </button>
        </div>

        {activeChips.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 border-b border-edge bg-wash/50 px-4 py-2">
            {activeChips.map((chip) => (
              <button
                key={chip.label}
                onClick={chip.clear}
                className="group flex items-center gap-1.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-2.5 py-0.5 text-xs text-indigo-600 transition-colors hover:border-indigo-500/60 dark:text-indigo-300"
              >
                {chip.label}
                <span className="text-indigo-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-200">×</span>
              </button>
            ))}
          </div>
        )}

        <div className="divide-y divide-edge">
          {filtered.map((g) => {
            const isOpen = forceOpen || open.has(g.key);
            const withEmail = g.contacts.filter((c) => c.email).length;
            return (
              <div key={g.key}>
                <div className="flex w-full items-center gap-3 px-4 py-3 transition-colors hover:bg-wash">
                  <input
                    type="checkbox"
                    checked={selected.has(g.key)}
                    onChange={() => toggleSelect(g.key)}
                    className="h-4 w-4 shrink-0 rounded accent-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => toggle(g.key)}
                    className={"shrink-0 cursor-pointer text-faint transition-transform " + (isOpen ? "rotate-90" : "")}
                  >
                    ▸
                  </button>
                  <button
                    type="button"
                    onClick={() => setDrawer(g)}
                    className="min-w-0 flex-1 cursor-pointer text-left"
                  >
                    <span className="flex items-center gap-2">
                      <span className="truncate font-medium text-ink underline-offset-4 hover:underline">{g.name}</span>
                      {g.website && (
                        <span className="truncate text-xs text-faint">
                          {g.website.replace(/^https?:\/\//, "")}
                        </span>
                      )}
                    </span>
                  </button>
                  <span className="shrink-0 text-xs text-faint">
                    {g.contacts.length} {g.contacts.length === 1 ? "Kontakt" : "Kontakte"}
                    {" · "}
                    <span className={withEmail > 0 ? "text-emerald-600 dark:text-emerald-400" : ""}>
                      {withEmail} mit E-Mail
                    </span>
                  </span>
                </div>

                {isOpen && (
                  <div className="border-t border-edge bg-surface/60 px-4 pb-4 pt-3">
                    {g.personalization && (
                      <p className="mb-3 max-w-3xl border-l-2 border-indigo-500/40 pl-3 text-xs italic leading-relaxed text-soft">
                        {g.personalization}
                      </p>
                    )}
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-xs text-mute">
                          <th className="py-1.5 pr-4 font-medium">Person</th>
                          {cols.has("title") && <th className="py-1.5 pr-4 font-medium">Position</th>}
                          {cols.has("email") && <th className="py-1.5 pr-4 font-medium">E-Mail</th>}
                          {cols.has("phone") && <th className="py-1.5 pr-4 font-medium">Telefon</th>}
                          {cols.has("sources") && <th className="py-1.5 font-medium">Quellen</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {g.contacts.map((c) => (
                          <tr key={c.id} className="border-t border-edge/60">
                            <td className="py-2 pr-4 text-ink">
                              {c.linkedin ? (
                                <a href={c.linkedin} target="_blank"
                                  className="underline-offset-4 hover:text-indigo-600 hover:underline dark:hover:text-indigo-300">
                                  {c.full_name ?? "—"}
                                </a>
                              ) : (
                                c.full_name ?? "—"
                              )}
                            </td>
                            {cols.has("title") && <td className="py-2 pr-4 text-faint">{c.title ?? "—"}</td>}
                            {cols.has("email") && (
                              <td className="py-2 pr-4">
                                {c.email ? (
                                  <span className="flex items-center gap-1.5 text-ink">
                                    <VerificationShield c={c} />
                                    {c.email}
                                  </span>
                                ) : (
                                  <span className="text-mute">—</span>
                                )}
                              </td>
                            )}
                            {cols.has("phone") && (
                              <td className="py-2 pr-4 text-soft">
                                {c.phone ?? <span className="text-mute">—</span>}
                              </td>
                            )}
                            {cols.has("sources") && (
                              <td className="py-2">
                                <span className="flex gap-1">
                                  {c.sources.map((s) => (
                                    <span key={s} className="rounded-full border border-edge2 bg-chip px-2 py-0.5 text-[11px] text-soft">
                                      {SOURCE_LABEL[s] ?? s}
                                    </span>
                                  ))}
                                </span>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
          {filtered.length === 0 && (
            <p className="px-4 py-10 text-center text-faint">Keine Leads gefunden.</p>
          )}
        </div>
      </section>

      {/* Bulk-Action-Leiste */}
      {selected.size > 0 && (
        <div className="fixed bottom-6 left-1/2 z-30 -translate-x-1/2 md:left-[calc(50%+7.5rem)]">
          <div className="fade-up flex items-center gap-3 rounded-xl border border-edge bg-panel px-4 py-3 shadow-2xl">
            <span className="text-sm text-ink">
              <span className="font-semibold">{selectedGroups.length}</span> Firmen ·{" "}
              {selectedContacts} Kontakte
            </span>
            <button
              onClick={() => download(toInstantlyCsv(selectedGroups), "-auswahl-instantly.csv")}
              className="rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 px-3 py-1.5 text-xs font-medium text-white transition-all hover:brightness-110 active:scale-[0.98]"
            >
              Für Instantly
            </button>
            <button
              onClick={() => download(toCsv(selectedGroups), "-auswahl.csv")}
              className="rounded-lg border border-edge2 px-3 py-1.5 text-xs text-soft transition-colors hover:border-edge3 hover:text-ink"
            >
              Excel-CSV
            </button>
            <button
              onClick={blockSelected}
              className="rounded-lg border border-red-300 px-3 py-1.5 text-xs text-red-600 transition-colors hover:border-red-500 dark:border-red-900/60 dark:text-red-400"
            >
              {bulkStatus || "Blockieren"}
            </button>
            <button
              onClick={() => setSelected(new Set())}
              className="text-xs text-faint hover:text-ink"
            >
              Abwählen
            </button>
          </div>
        </div>
      )}

      {/* Lead-Detail-Drawer */}
      {drawer && (
        <div className="fixed inset-0 z-40">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
            onClick={() => setDrawer(null)}
          />
          <aside className="absolute right-0 top-0 h-full w-full max-w-md overflow-y-auto border-l border-edge bg-panel p-6 shadow-2xl [animation:fadeUp_.25s_ease]">
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold tracking-tight text-ink">{drawer.name}</h2>
                {drawer.website && (
                  <a href={drawer.website} target="_blank"
                    className="text-xs text-indigo-600 underline-offset-4 hover:underline dark:text-indigo-300">
                    {drawer.website.replace(/^https?:\/\//, "")}
                  </a>
                )}
              </div>
              <button
                onClick={() => setDrawer(null)}
                className="rounded-lg border border-edge px-2.5 py-1 text-sm text-faint transition-colors hover:border-edge2 hover:text-ink"
              >
                ✕
              </button>
            </div>

            {(drawer.address || drawer.phone_national) && (
              <div className="mb-5 space-y-1 rounded-lg border border-edge bg-surface/60 p-3 text-xs text-soft">
                {drawer.address && <p>{drawer.address}</p>}
                {drawer.phone_national && <p>{drawer.phone_national}</p>}
              </div>
            )}

            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-faint">
              Anreicherungs-Pipeline
            </p>
            <div className="mb-5">
              <PipelineStep label="Firma gefunden" state="done" detail={drawer.website ? "Website erkannt" : "Ohne Website"} />
              <PipelineStep
                label="KI-Entscheider-Recherche"
                state={statusToState(drawer.decisionmaker_status)}
                detail={drawer.decisionmaker_status === "found" ? "Entscheider identifiziert" : drawer.decisionmaker_status === "not_found" ? "Keine Personen öffentlich auffindbar" : undefined}
              />
              <PipelineStep
                label="Hunter E-Mail-Verifizierung"
                state={drawer.website ? statusToState(drawer.hunter_status) : "empty"}
                detail={!drawer.website ? "Übersprungen (keine Website)" : drawer.hunter_status === "not_found" ? "Keine Datenbank-Treffer" : undefined}
              />
              <PipelineStep
                label="KI-Personalisierung"
                state={drawer.personalization ? "done" : drawer.website ? "pending" : "empty"}
                detail={drawer.personalization ? "Eröffnungszeile generiert" : undefined}
              />
            </div>

            {drawer.personalization && (
              <>
                <p className="mb-2 text-xs font-medium uppercase tracking-wider text-faint">
                  Personalisierung
                </p>
                <p className="mb-5 rounded-lg border-l-2 border-indigo-500/50 bg-indigo-500/5 p-3 text-sm italic leading-relaxed text-soft">
                  {drawer.personalization}
                </p>
              </>
            )}

            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-faint">
              Kontakte ({drawer.contacts.length})
            </p>
            <div className="space-y-2">
              {drawer.contacts.map((c) => (
                <div key={c.id} className="rounded-lg border border-edge bg-surface/60 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-ink">{c.full_name ?? "—"}</p>
                    <span className="flex gap-1">
                      {c.sources.map((s) => (
                        <span key={s} className="rounded-full border border-edge2 bg-chip px-1.5 py-0.5 text-[10px] text-soft">
                          {SOURCE_LABEL[s] ?? s}
                        </span>
                      ))}
                    </span>
                  </div>
                  {c.title && <p className="text-xs text-faint">{c.title}</p>}
                  <div className="mt-1.5 space-y-0.5 text-xs text-soft">
                    {c.email && (
                      <p className="flex items-center gap-1.5">
                        <VerificationShield c={c} /> {c.email}
                      </p>
                    )}
                    {c.phone && <p>{c.phone}</p>}
                    {c.linkedin && (
                      <a href={c.linkedin} target="_blank"
                        className="text-indigo-600 underline-offset-4 hover:underline dark:text-indigo-300">
                        LinkedIn-Profil →
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
