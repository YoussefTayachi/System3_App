"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useT } from "../../language-provider";

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
  const { t } = useT();
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
            className="rounded-lg border border-edge2 bg-field px-3 py-1.5 text-lg font-semibold text-ink outline-none focus:border-sky-500"
          />
          <button onClick={saveName} className="text-xs text-sky-600 dark:text-sky-300 hover:text-sky-500 dark:hover:text-sky-200">
            {t.searchSettings.save}
          </button>
        </span>
      ) : (
        <button
          onClick={() => setEditing(true)}
          title={t.searchSettings.renameTitle}
          className="group flex items-center gap-2 text-left"
        >
          <h1 className="text-2xl font-semibold tracking-tight text-ink">{name}</h1>
          <span className="text-xs text-mute opacity-0 transition-opacity group-hover:opacity-100">
            {t.searchSettings.renameHint}
          </span>
        </button>
      )}
      <select
        value={schedule}
        onChange={(e) => saveSchedule(e.target.value)}
        className="rounded-lg border border-edge2 bg-field px-2.5 py-1.5 text-xs text-soft outline-none focus:border-sky-500"
        title={t.searchSettings.scheduleTooltip}
      >
        <option value="none">{t.searchSettings.scheduleNone}</option>
        <option value="weekly">{t.searchSettings.scheduleWeekly}</option>
        <option value="daily">{t.searchSettings.scheduleDaily}</option>
      </select>
    </div>
  );
}
