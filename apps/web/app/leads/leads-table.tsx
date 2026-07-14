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

type SearchOption = { id: string; query: string; location: string };

function toCsv(rows: Contact[]): string {
  const header = [
    "Firma", "Website", "Person", "Position", "E-Mail", "Confidence",
    "Telefon", "LinkedIn", "Quelle", "Personalisierung",
  ];
  const esc = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return '"' + s.replace(/"/g, '""') + '"';
  };
  const lines = rows.map((c) =>
    [
      c.businesses?.name, c.businesses?.website, c.full_name, c.title, c.email,
      c.email_confidence, c.phone, c.linkedin, c.source, c.businesses?.personalization,
    ].map(esc).join(";")
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

  const filtered = useMemo(() => {
    const needle = q.toLowerCase();
    return contacts.filter((c) => {
      if (onlyEmail && !c.email) return false;
      if (searchFilter && c.businesses?.search_id !== searchFilter) return false;
      if (!needle) return true;
      return [c.full_name, c.title, c.email, c.businesses?.name]
        .filter(Boolean)
        .some((v) => v!.toLowerCase().includes(needle));
    });
  }, [contacts, q, onlyEmail, searchFilter]);

  function exportCsv() {
    const blob = new Blob(["﻿" + toCsv(filtered)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = exportName.replace(/[^\wäöüÄÖÜß -]/g, "").trim() + ".csv";
    a.click();
    URL.revokeObjectURL(url);
  }

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
              <option key={s.id} value={s.id}>
                {s.query} — {s.location}
              </option>
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
        <span className="text-xs text-zinc-500">{filtered.length} von {contacts.length}</span>
        <button
          onClick={exportCsv}
          disabled={filtered.length === 0}
          className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:border-zinc-500 hover:text-white disabled:opacity-40"
        >
          CSV exportieren
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800 text-left text-xs text-zinc-500">
              <th className="px-4 py-2.5 font-medium">Firma</th>
              <th className="px-4 py-2.5 font-medium">Person</th>
              <th className="px-4 py-2.5 font-medium">Position</th>
              <th className="px-4 py-2.5 font-medium">E-Mail</th>
              <th className="px-4 py-2.5 font-medium">Telefon</th>
              <th className="px-4 py-2.5 font-medium">Quelle</th>
              <th className="px-4 py-2.5 font-medium">Personalisierung</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr key={c.id} className="border-b border-zinc-800/60 align-top transition-colors last:border-0 hover:bg-zinc-800/30">
                <td className="px-4 py-3">
                  {c.businesses?.website ? (
                    <a href={c.businesses.website} target="_blank"
                      className="font-medium text-zinc-200 underline-offset-4 hover:text-indigo-300 hover:underline">
                      {c.businesses?.name}
                    </a>
                  ) : (
                    <span className="font-medium text-zinc-200">{c.businesses?.name}</span>
                  )}
                </td>
                <td className="px-4 py-3 text-zinc-300">
                  {c.linkedin ? (
                    <a href={c.linkedin} target="_blank"
                      className="underline-offset-4 hover:text-indigo-300 hover:underline">
                      {c.full_name ?? "—"}
                    </a>
                  ) : (
                    c.full_name ?? "—"
                  )}
                </td>
                <td className="px-4 py-3 text-zinc-500">{c.title ?? "—"}</td>
                <td className="px-4 py-3">
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
                <td className="px-4 py-3 text-zinc-300">{c.phone ?? <span className="text-zinc-600">—</span>}</td>
                <td className="px-4 py-3">
                  <span className="rounded-full border border-zinc-700/80 bg-zinc-800/60 px-2 py-0.5 text-[11px] text-zinc-400">
                    {c.source === "ai_websearch" ? "KI" : c.source === "hunter" ? "Hunter" : c.source}
                  </span>
                </td>
                <td className="max-w-sm px-4 py-3 text-xs leading-relaxed text-zinc-500">
                  {c.businesses?.personalization ?? "—"}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-zinc-500">
                  Keine Leads gefunden.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
