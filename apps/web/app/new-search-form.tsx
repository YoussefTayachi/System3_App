"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const INDUSTRIES = [
  "Insurance", "Financial Services", "Banking", "Accounting", "Legal Services",
  "Software Development", "IT Services and IT Consulting", "Information Technology and Services",
  "Marketing Services", "Advertising Services", "Business Consulting and Services",
  "Staffing and Recruiting", "Human Resources Services", "Real Estate", "Construction",
  "Manufacturing", "Hospitals and Health Care", "Medical Practices", "Dentists",
  "Wellness and Fitness Services", "Restaurants", "Hospitality", "Retail", "Wholesale",
  "Automotive", "Telecommunications", "Education", "Utilities",
];
const COUNTRIES = [
  { code: "AT", label: "Österreich" }, { code: "DE", label: "Deutschland" },
  { code: "CH", label: "Schweiz" }, { code: "GB", label: "UK" }, { code: "US", label: "USA" },
  { code: "NL", label: "Niederlande" }, { code: "FR", label: "Frankreich" },
  { code: "IT", label: "Italien" }, { code: "ES", label: "Spanien" },
];
const HEADCOUNTS = ["1-10", "11-50", "51-200", "201-500", "501-1000", "1001-5000", "5001-10000", "10001+"];

const inputCls =
  "mt-1.5 rounded-lg border border-zinc-700/80 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 " +
  "placeholder-zinc-600 outline-none transition-colors focus:border-indigo-500";
const labelCls = "flex flex-col text-xs font-medium text-zinc-400";

export default function NewSearchForm({ workspaceId }: { workspaceId: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<"maps" | "corporate">("maps");
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");
  const [maxResults, setMaxResults] = useState(10);
  const [radius, setRadius] = useState(2000);
  const [industry, setIndustry] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("AT");
  const [headcount, setHeadcount] = useState("");
  const [keywords, setKeywords] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const row: Record<string, unknown> =
      mode === "maps"
        ? {
            workspace_id: workspaceId, source: "maps", query, location,
            max_results: maxResults, radius_m: radius,
          }
        : {
            workspace_id: workspaceId, source: "corporate",
            query: [industry, keywords].filter(Boolean).join(" · ") || "Corporate-Suche",
            location: [city, country].filter(Boolean).join(", "),
            max_results: maxResults,
            filters: { industry: industry || null, city: city || null, country, headcount: headcount || null, keywords: keywords || null },
          };
    const { error } = await createClient().from("searches").insert(row);
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setQuery(""); setLocation(""); setKeywords(""); setCity("");
    router.refresh();
  }

  const tabCls = (active: boolean) =>
    "rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors " +
    (active ? "bg-indigo-500/15 text-indigo-300" : "text-zinc-500 hover:text-zinc-200");

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="flex gap-1 rounded-xl border border-zinc-800 bg-zinc-900/60 p-1 w-fit">
        <button type="button" className={tabCls(mode === "maps")} onClick={() => setMode("maps")}>
          Lokal (Google Maps)
        </button>
        <button type="button" className={tabCls(mode === "corporate")} onClick={() => setMode("corporate")}>
          Corporate (Datenbank)
        </button>
      </div>

      {mode === "maps" ? (
        <div className="flex flex-wrap items-end gap-3">
          <label className={labelCls + " flex-1"}>
            Nische
            <input required placeholder="z.B. Zahnärzte" value={query}
              onChange={(e) => setQuery(e.target.value)} className={inputCls} />
          </label>
          <label className={labelCls + " flex-1"}>
            Ort
            <input required placeholder="z.B. Wien" value={location}
              onChange={(e) => setLocation(e.target.value)} className={inputCls} />
          </label>
          <label className={labelCls}>
            Max. Firmen
            <input type="number" min={1} max={100} value={maxResults}
              onChange={(e) => setMaxResults(Number(e.target.value))} className={inputCls + " w-24"} />
          </label>
          <label className={labelCls}>
            Radius (m)
            <input type="number" min={100} max={50000} step={100} value={radius}
              onChange={(e) => setRadius(Number(e.target.value))} className={inputCls + " w-28"} />
          </label>
          <SubmitButton loading={loading} />
        </div>
      ) : (
        <div className="flex flex-wrap items-end gap-3">
          <label className={labelCls + " min-w-44 flex-1"}>
            Branche
            <select value={industry} onChange={(e) => setIndustry(e.target.value)} className={inputCls}>
              <option value="">Alle Branchen</option>
              {INDUSTRIES.map((i) => <option key={i} value={i}>{i}</option>)}
            </select>
          </label>
          <label className={labelCls}>
            Stadt (optional)
            <input placeholder="z.B. Vienna" value={city}
              onChange={(e) => setCity(e.target.value)} className={inputCls + " w-36"} />
          </label>
          <label className={labelCls}>
            Land
            <select value={country} onChange={(e) => setCountry(e.target.value)} className={inputCls + " w-36"}>
              {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
            </select>
          </label>
          <label className={labelCls}>
            Größe
            <select value={headcount} onChange={(e) => setHeadcount(e.target.value)} className={inputCls + " w-32"}>
              <option value="">Alle</option>
              {HEADCOUNTS.map((h) => <option key={h} value={h}>{h}</option>)}
            </select>
          </label>
          <label className={labelCls + " flex-1"}>
            Keywords (optional, Komma-getrennt)
            <input placeholder="z.B. makler, vorsorge" value={keywords}
              onChange={(e) => setKeywords(e.target.value)} className={inputCls} />
          </label>
          <label className={labelCls}>
            Max. Firmen
            <input type="number" min={1} max={100} value={maxResults}
              onChange={(e) => setMaxResults(Number(e.target.value))} className={inputCls + " w-24"} />
          </label>
          <SubmitButton loading={loading} />
        </div>
      )}
      {mode === "corporate" && (
        <p className="text-xs text-zinc-600">
          Hinweis: Stadtnamen englisch eingeben (Vienna statt Wien). Die Firmensuche selbst ist bei
          Hunter kostenlos — Credits fallen erst bei der E-Mail-Suche pro Firma an.
        </p>
      )}
      {error && <p className="text-sm text-red-400">{error}</p>}
    </form>
  );
}

function SubmitButton({ loading }: { loading: boolean }) {
  return (
    <button
      disabled={loading}
      className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white shadow-lg shadow-indigo-600/25 transition-all hover:bg-indigo-500 disabled:opacity-50"
    >
      {loading ? "Wird gestartet..." : "Suche starten"}
    </button>
  );
}
