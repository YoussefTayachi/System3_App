"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SearchSettings({
  searchId,
  initialName,
  initialSchedule,
}: {
  searchId: string;
  initialName: string;
  initialSchedule: string;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(initialName);
  const [schedule, setSchedule] = useState(initialSchedule);

  async function saveName() {
    await createClient().from("searches").update({ name: name.trim() || null }).eq("id", searchId);
    setEditing(false);
    router.refresh();
  }

  async function saveSchedule(value: string) {
    setSchedule(value);
    const nextRun =
      value === "daily"
        ? new Date(Date.now() + 86400000).toISOString()
        : value === "weekly"
          ? new Date(Date.now() + 7 * 86400000).toISOString()
          : null;
    await createClient()
      .from("searches")
      .update({ schedule: value, next_run_at: nextRun })
      .eq("id", searchId);
    router.refresh();
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      {editing ? (
        <span className="flex items-center gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && saveName()}
            autoFocus
            className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-lg font-semibold text-zinc-100 outline-none focus:border-indigo-500"
          />
          <button onClick={saveName} className="text-xs text-indigo-300 hover:text-indigo-200">
            Speichern
          </button>
        </span>
      ) : (
        <button
          onClick={() => setEditing(true)}
          title="Umbenennen"
          className="group flex items-center gap-2 text-left"
        >
          <h1 className="text-xl font-semibold tracking-tight text-zinc-100">{name}</h1>
          <span className="text-xs text-zinc-600 opacity-0 transition-opacity group-hover:opacity-100">
            ✎ umbenennen
          </span>
        </button>
      )}
      <select
        value={schedule}
        onChange={(e) => saveSchedule(e.target.value)}
        className="rounded-lg border border-zinc-700/80 bg-zinc-900 px-2.5 py-1.5 text-xs text-zinc-300 outline-none focus:border-indigo-500"
        title="Lead-Abo: Liste automatisch mit neuen Firmen nachfüllen"
      >
        <option value="none">Kein Abo</option>
        <option value="weekly">Abo: wöchentlich</option>
        <option value="daily">Abo: täglich</option>
      </select>
    </div>
  );
}
