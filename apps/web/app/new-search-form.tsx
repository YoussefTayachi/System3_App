"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function NewSearchForm({ workspaceId }: { workspaceId: string }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");
  const [maxResults, setMaxResults] = useState(10);
  const [radius, setRadius] = useState(2000);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await createClient().from("searches").insert({
      workspace_id: workspaceId,
      query,
      location,
      max_results: maxResults,
      radius_m: radius,
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setQuery("");
    setLocation("");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-3">
      <label className="flex flex-col text-xs text-slate-500">
        Nische
        <input
          required
          placeholder="z.B. Zahnärzte"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="mt-1 rounded-lg border px-3 py-2 text-sm text-slate-900"
        />
      </label>
      <label className="flex flex-col text-xs text-slate-500">
        Ort
        <input
          required
          placeholder="z.B. Wien"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          className="mt-1 rounded-lg border px-3 py-2 text-sm text-slate-900"
        />
      </label>
      <label className="flex flex-col text-xs text-slate-500">
        Max. Firmen
        <input
          type="number"
          min={1}
          max={100}
          value={maxResults}
          onChange={(e) => setMaxResults(Number(e.target.value))}
          className="mt-1 w-24 rounded-lg border px-3 py-2 text-sm text-slate-900"
        />
      </label>
      <label className="flex flex-col text-xs text-slate-500">
        Radius (m)
        <input
          type="number"
          min={100}
          max={50000}
          step={100}
          value={radius}
          onChange={(e) => setRadius(Number(e.target.value))}
          className="mt-1 w-28 rounded-lg border px-3 py-2 text-sm text-slate-900"
        />
      </label>
      <button
        disabled={loading}
        className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
      >
        {loading ? "..." : "Suche starten"}
      </button>
      {error && <p className="w-full text-sm text-red-600">{error}</p>}
    </form>
  );
}
