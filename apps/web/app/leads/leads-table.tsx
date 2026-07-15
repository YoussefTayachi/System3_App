"use client";
import { useMemo, useState } from "react";
import { IconSearch } from "../icons";

type Contact = {
  id: string;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
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
  first_name: string | null;
  last_name: string | null;
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
        first_name: c.first_name,
        last_name: c.last_name,
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

function splitName(c: Merged): { first: string; last: string } {
  if (c.first_name || c.last_name) {
    return { first: c.first_name ?? "", last: c.last_name ?? "" };
  }
  const parts = (c.full_name ?? "").split(" ");
  return { first: parts[0] ?? "", last: parts.slice(1).join(" ") };
}

function toInstantlyCsv(groups: Group[]): string {
  // Header exakt so benannt, dass Instantlys CSV-Import sie automatisch mappt.
  // Extra-Spalten (personalization, title, linkedin) werden zu Custom-Variables:
  // im Template nutzbar als {{personalization}}, {{title}}, {{linkedin}}
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

  function download(content: string, suffix: string) {
    const blob = new Blob(["\ufeff" + content], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = exportName.replace(/[^\wäöüÄÖÜß -]/g, "").trim() + suffix;
    a.click();
    URL.revokeObjectURL(url);
  }

  const forceOpen = q.length > 0;

  return (
    <section className="overflow-hidden rounded-2xl border border-edge bg-panel">
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
        <span className="text-xs text-faint">
          {filtered.length} Firmen · {shownContacts} von {totalContacts} Kontakten
        </span>
        <button
          onClick={() => download(toInstantlyCsv(filtered), "-instantly.csv")}
          disabled={shownContacts === 0}
          title="Spalten exakt für Instantlys CSV-Import benannt — Variablen wie {{personalization}} sind direkt im Template nutzbar"
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

      <div className="divide-y divide-edge">
        {filtered.map((g) => {
          const isOpen = forceOpen || open.has(g.key);
          const withEmail = g.contacts.filter((c) => c.email).length;
          return (
            <div key={g.key}>
              <button
                type="button"
                onClick={() => toggle(g.key)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-wash"
              >
                <span
                  className={
                    "text-faint transition-transform " + (isOpen ? "rotate-90" : "")
                  }
                >
                  ▸
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate font-medium text-ink">{g.name}</span>
                    {g.website && (
                      <a
                        href={g.website}
                        target="_blank"
                        onClick={(e) => e.stopPropagation()}
                        className="truncate text-xs text-faint underline-offset-4 hover:text-indigo-600 dark:hover:text-indigo-600 dark:text-indigo-300 hover:underline"
                      >
                        {g.website.replace(/^https?:\/\//, "")}
                      </a>
                    )}
                  </span>
                </span>
                <span className="shrink-0 text-xs text-faint">
                  {g.contacts.length} {g.contacts.length === 1 ? "Kontakt" : "Kontakte"}
                  {" · "}
                  <span className={withEmail > 0 ? "text-emerald-600 dark:text-emerald-400" : ""}>
                    {withEmail} mit E-Mail
                  </span>
                </span>
              </button>

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
                        <th className="py-1.5 pr-4 font-medium">Position</th>
                        <th className="py-1.5 pr-4 font-medium">E-Mail</th>
                        <th className="py-1.5 pr-4 font-medium">Telefon</th>
                        <th className="py-1.5 font-medium">Quellen</th>
                      </tr>
                    </thead>
                    <tbody>
                      {g.contacts.map((c) => (
                        <tr key={c.id} className="border-t border-edge/40">
                          <td className="py-2 pr-4 text-ink">
                            {c.linkedin ? (
                              <a href={c.linkedin} target="_blank"
                                className="underline-offset-4 hover:text-indigo-600 dark:hover:text-indigo-600 dark:text-indigo-300 hover:underline">
                                {c.full_name ?? "—"}
                              </a>
                            ) : (
                              c.full_name ?? "—"
                            )}
                          </td>
                          <td className="py-2 pr-4 text-faint">{c.title ?? "—"}</td>
                          <td className="py-2 pr-4">
                            {c.email ? (
                              <span className="text-ink">
                                {c.email}
                                {c.email_confidence != null && (
                                  <span className="ml-1.5 text-xs text-faint">{c.email_confidence}%</span>
                                )}
                              </span>
                            ) : (
                              <span className="text-mute">—</span>
                            )}
                          </td>
                          <td className="py-2 pr-4 text-soft">
                            {c.phone ?? <span className="text-mute">—</span>}
                          </td>
                          <td className="py-2">
                            <span className="flex gap-1">
                              {c.sources.map((s) => (
                                <span key={s} className="rounded-full border border-edge2 bg-chip px-2 py-0.5 text-[11px] text-soft">
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
          <p className="px-4 py-10 text-center text-faint">Keine Leads gefunden.</p>
        )}
      </div>
    </section>
  );
}
