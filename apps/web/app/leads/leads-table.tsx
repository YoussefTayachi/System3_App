"use client";
import { useMemo, useState } from "react";
import { IconSearch } from "../icons";

type Contact = {
  id: string;
  full_name: string | null;
  title: string | null;
  email: string | null;
  email_confidence: number | null;
  phone: string | null;
  linkedin: string | null;
  source: string;
  businesses: {
    name: string;
    website: string | null;
    personalization: string | null;
    search_id?: string | null;
  } | null;
};

type Merged = {
  id: string;
  full_name: string | null;
  title: string | null;
  email: string | null;
  email_confidence: number | null;
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
  contacts: Merged[];
};

type SearchOption = { id: string; query: string; location: string };

const SOURCE_LABEL: Record<string, string> = { ai_websearch: "KI", hunter: "Hunter", manual: "Manuell" };

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
  }
  if (!target.phone && c.phone) target.phone = c.phone;
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
        contacts: [],
      };
      groups.set(key, g);
    }
    // Dedupe: gleiche E-Mail oder gleicher normalisierter Name -> mergen
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
        title: c.title,
        email: c.email,
        email_confidence: c.email_confidence,
        phone: c.phone,
        linkedin: c.linkedin,
        sources: [c.source],
      });
    }
  }
  return Array.from(groups.values());
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

export default function LeadsTable({
  contacts,
  searches,
  exportName = "leads",
}: {
  contacts: Contact[];
  searches?: SearchOption[];
  exportName?: string;
}) {
  const [q, setQ] = useState("");
  const [onlyEmail, setOnlyEmail] = useState(false);
  const [searchFilter, setSearchFilter] = useState("");
  const [open, setOpen] = useState<Set<string>>(new Set());

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

  function toggle(key: string) {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function exportCsv() {
    const blob = new Blob(["﻿" + toCsv(filtered)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = exportName.replace(/[^\wäöüÄÖÜß -]/g, "").trim() + ".csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  const forceOpen = q.length > 0;

  return (
    <section className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/40">
      <div className="flex flex-wrap items-center gap-3 border-b border-zinc-800 px-4 py-3">
        <div className="relative min-w-52 flex-1">
          <IconSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Filtern nach Firma, Name, E-Mail..."
            className="w-full rounded-lg border border-zinc-700/80 bg-zinc-900 py-2 pl-9 pr-3 text-sm text-zinc-100 placeholder-zinc-600 outline-none transition-colors focus:border-indigo-500"
          />
        </div>
        {searches && searches.length > 0 && (
          <select
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="rounded-lg border border-zinc-700/80 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none transition-colors focus:border-indigo-500"
          >
            <option value="">Alle Suchen</option>
            {searches.map((s) => (
              <option key={s.id} value={s.id}>{s.query} — {s.location}</option>
            ))}
          </select>
        )}
        <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-400">
          <input
            type="checkbox"
            checked={onlyEmail}
            onChange={(e) => setOnlyEmail(e.target.checked)}
            className="h-4 w-4 rounded accent-indigo-500"
          />
          Nur mit E-Mail
        </label>
        <span className="text-xs text-zinc-500">
          {filtered.length} Firmen · {shownContacts} von {totalContacts} Kontakten
        </span>
        <button
          onClick={exportCsv}
          disabled={shownContacts === 0}
          className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:border-zinc-500 hover:text-white disabled:opacity-40"
        >
          CSV exportieren
        </button>
      </div>

      <div className="divide-y divide-zinc-800/60">
        {filtered.map((g) => {
          const isOpen = forceOpen || open.has(g.key);
          const withEmail = g.contacts.filter((c) => c.email).length;
          return (
            <div key={g.key}>
              <button
                type="button"
                onClick={() => toggle(g.key)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-zinc-800/30"
              >
                <span
                  className={
                    "text-zinc-500 transition-transform " + (isOpen ? "rotate-90" : "")
                  }
                >
                  ▸
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate font-medium text-zinc-100">{g.name}</span>
                    {g.website && (
                      <a
                        href={g.website}
                        target="_blank"
                        onClick={(e) => e.stopPropagation()}
                        className="truncate text-xs text-zinc-500 underline-offset-4 hover:text-indigo-300 hover:underline"
                      >
                        {g.website.replace(/^https?:\/\//, "")}
                      </a>
                    )}
                  </span>
                </span>
                <span className="shrink-0 text-xs text-zinc-500">
                  {g.contacts.length} {g.contacts.length === 1 ? "Kontakt" : "Kontakte"}
                  {" · "}
                  <span className={withEmail > 0 ? "text-emerald-400" : ""}>
                    {withEmail} mit E-Mail
                  </span>
                </span>
              </button>

              {isOpen && (
                <div className="border-t border-zinc-800/60 bg-zinc-950/40 px-4 pb-4 pt-3">
                  {g.personalization && (
                    <p className="mb-3 max-w-3xl border-l-2 border-indigo-500/40 pl-3 text-xs italic leading-relaxed text-zinc-400">
                      {g.personalization}
                    </p>
                  )}
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-zinc-600">
                        <th className="py-1.5 pr-4 font-medium">Person</th>
                        <th className="py-1.5 pr-4 font-medium">Position</th>
                        <th className="py-1.5 pr-4 font-medium">E-Mail</th>
                        <th className="py-1.5 pr-4 font-medium">Telefon</th>
                        <th className="py-1.5 font-medium">Quellen</th>
                      </tr>
                    </thead>
                    <tbody>
                      {g.contacts.map((c) => (
                        <tr key={c.id} className="border-t border-zinc-800/40">
                          <td className="py-2 pr-4 text-zinc-200">
                            {c.linkedin ? (
                              <a href={c.linkedin} target="_blank"
                                className="underline-offset-4 hover:text-indigo-300 hover:underline">
                                {c.full_name ?? "—"}
                              </a>
                            ) : (
                              c.full_name ?? "—"
                            )}
                          </td>
                          <td className="py-2 pr-4 text-zinc-500">{c.title ?? "—"}</td>
                          <td className="py-2 pr-4">
                            {c.email ? (
                              <span className="text-zinc-200">
                                {c.email}
                                {c.email_confidence != null && (
                                  <span className="ml-1.5 text-xs text-zinc-500">{c.email_confidence}%</span>
                                )}
                              </span>
                            ) : (
                              <span className="text-zinc-600">—</span>
                            )}
                          </td>
                          <td className="py-2 pr-4 text-zinc-300">
                            {c.phone ?? <span className="text-zinc-600">—</span>}
                          </td>
                          <td className="py-2">
                            <span className="flex gap-1">
                              {c.sources.map((s) => (
                                <span key={s} className="rounded-full border border-zinc-700/80 bg-zinc-800/60 px-2 py-0.5 text-[11px] text-zinc-400">
                                  {SOURCE_LABEL[s] ?? s}
                                </span>
                              ))}
                            </span>
                          </td>
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
          <p className="px-4 py-10 text-center text-zinc-500">Keine Leads gefunden.</p>
        )}
      </div>
    </section>
  );
}
