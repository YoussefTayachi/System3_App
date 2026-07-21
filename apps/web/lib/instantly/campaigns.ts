// Alles rund um das Mapping zwischen unserer eigenen Kampagnen-Form und dem,
// was Instantlys /api/v2/campaigns erwartet/liefert (siehe
// https://developer.instantly.ai/api-reference/schemas/campaign). Bewusst
// getrennt von lib/instantly.ts (das bleibt der generische API-Client), damit
// dieser Datei-Kopf als einziger Ort gilt, an dem man nachschauen muss, wenn
// sich Instantlys Kampagnen-Schema aendert.

export type SequenceStep = { subject: string; body: string; delayDays?: number };

export type CampaignScheduleInput = {
  days: number[]; // 0=Sonntag..6=Samstag, wie JS Date#getDay()
  from: string; // "09:00"
  to: string; // "17:00"
  timezone: string; // z.B. "Europe/Vienna"
};

/**
 * Instantly akzeptiert fuer campaign_schedule.timezone nur eine feste, per
 * Enum validierte Liste an IANA-Zone-Strings (Fehler bei Verstoss: "must be
 * equal to one of the allowed values"). Ein paar gaengige Namen fehlen darin,
 * weil sie in der aktuellen IANA-tzdata nur noch als Backward-Link auf
 * denselben Regelsatz gefuehrt werden -- z.B. Europe/Vienna, das seit 1980
 * exakt dieselben Uhrzeiten/DST-Regeln wie Europe/Berlin hat und deshalb nur
 * noch als veralteter Alias existiert. Deshalb: kuratierte Auswahl statt
 * freier Texteingabe im Formular, plus eine Normalisierung hier als
 * Sicherheitsnetz fuer evtl. noch gespeicherte alte Werte.
 */
export const INSTANTLY_TIMEZONE_OPTIONS: { value: string; label: string }[] = [
  { value: "UTC", label: "UTC" },
  { value: "Europe/London", label: "London" },
  { value: "Europe/Dublin", label: "Dublin" },
  { value: "Europe/Lisbon", label: "Lissabon" },
  { value: "Europe/Madrid", label: "Madrid" },
  { value: "Europe/Paris", label: "Paris" },
  { value: "Europe/Berlin", label: "Berlin / Wien" },
  { value: "Europe/Amsterdam", label: "Amsterdam" },
  { value: "Europe/Brussels", label: "Brüssel" },
  { value: "Europe/Zurich", label: "Zürich" },
  { value: "Europe/Rome", label: "Rom" },
  { value: "Europe/Prague", label: "Prag" },
  { value: "Europe/Warsaw", label: "Warschau" },
  { value: "Europe/Budapest", label: "Budapest" },
  { value: "Europe/Stockholm", label: "Stockholm" },
  { value: "Europe/Copenhagen", label: "Kopenhagen" },
  { value: "Europe/Oslo", label: "Oslo" },
  { value: "Europe/Helsinki", label: "Helsinki" },
  { value: "Europe/Athens", label: "Athen" },
  { value: "Europe/Bucharest", label: "Bukarest" },
  { value: "Europe/Istanbul", label: "Istanbul" },
  { value: "Europe/Moscow", label: "Moskau" },
  { value: "America/New_York", label: "New York (Ost, USA)" },
  { value: "America/Chicago", label: "Chicago (Zentral, USA)" },
  { value: "America/Denver", label: "Denver (Mountain, USA)" },
  { value: "America/Los_Angeles", label: "Los Angeles (West, USA)" },
  { value: "America/Toronto", label: "Toronto" },
  { value: "America/Sao_Paulo", label: "São Paulo" },
  { value: "America/Mexico_City", label: "Mexiko-Stadt" },
  { value: "Asia/Dubai", label: "Dubai" },
  { value: "Asia/Kolkata", label: "Neu-Delhi / Mumbai" },
  { value: "Asia/Singapore", label: "Singapur" },
  { value: "Asia/Hong_Kong", label: "Hongkong" },
  { value: "Asia/Tokyo", label: "Tokio" },
  { value: "Asia/Shanghai", label: "Shanghai" },
  { value: "Australia/Sydney", label: "Sydney" },
  { value: "Pacific/Auckland", label: "Auckland" },
];

/** Bekannte Alias-Zonen (Backward-Links auf denselben Regelsatz), die Instantlys Enum nicht kennt -- auf die funktional identische, von Instantly akzeptierte Zone abbilden. */
const TIMEZONE_ALIASES: Record<string, string> = {
  "Europe/Vienna": "Europe/Berlin",
  "Europe/Vaduz": "Europe/Zurich",
  "Europe/Busingen": "Europe/Zurich",
  "Europe/San_Marino": "Europe/Rome",
  "Europe/Vatican": "Europe/Rome",
  "Europe/Bratislava": "Europe/Prague",
  "Europe/Ljubljana": "Europe/Belgrade",
  "Europe/Podgorica": "Europe/Belgrade",
  "Europe/Sarajevo": "Europe/Belgrade",
  "Europe/Skopje": "Europe/Belgrade",
  "Europe/Zagreb": "Europe/Belgrade",
  "Europe/Luxembourg": "Europe/Brussels",
};

export function normalizeInstantlyTimezone(tz: string): string {
  return TIMEZONE_ALIASES[tz] ?? tz;
}

/** Browser-erkannte Zone (kann ein Alias sein, z.B. Europe/Vienna) auf eine der kuratierten, garantiert gueltigen Optionen abbilden -- mit Europe/Berlin als sicherem Fallback. */
export function defaultInstantlyTimezone(): string {
  const detected =
    typeof Intl !== "undefined" ? normalizeInstantlyTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone) : "Europe/Berlin";
  return INSTANTLY_TIMEZONE_OPTIONS.some((o) => o.value === detected) ? detected : "Europe/Berlin";
}

/** Instantlys campaign_schedule-Objekt: schedules[] mit name, timing.from/to, days (Objekt mit boolean-Keys "0".."6"), timezone. */
export function buildCampaignSchedule({ days, from, to, timezone }: CampaignScheduleInput) {
  const daysObj: Record<string, boolean> = {};
  for (let d = 0; d <= 6; d++) daysObj[String(d)] = days.includes(d);
  return { schedules: [{ name: "Standard", timing: { from, to }, days: daysObj, timezone: normalizeInstantlyTimezone(timezone) }] };
}

// Laut Instantly-Doku wird beim Top-Level-Feld "sequences" nur das erste Element
// verwendet (Array existiert nur aus Kompatibilitaetsgruenden). Jeder Schritt hat
// "variants" (fuer A/B-Tests), wir nutzen bewusst nur eine Variante pro Schritt.
export function buildCampaignSequence(steps: SequenceStep[]) {
  return [
    {
      steps: steps.map((s) => ({
        type: "email",
        delay: s.delayDays ?? 0,
        variants: [{ subject: s.subject, body: s.body }],
      })),
    },
  ];
}

/** Instantlys numerischer Kampagnen-Status, siehe Schema-Doku (schemas/def-1). */
export const INSTANTLY_CAMPAIGN_STATUS = {
  DRAFT: 0,
  ACTIVE: 1,
  PAUSED: 2,
  COMPLETED: 3,
  RUNNING_SUBSEQUENCES: 4,
  BOUNCE_PROTECT: -2,
  ACCOUNTS_UNHEALTHY: -1,
  ACCOUNT_SUSPENDED: -99,
} as const;

/** Lokaler Status-String (Check-Constraint auf public.campaigns), aus Instantlys Zahlencode abgeleitet. */
export type LocalCampaignStatus = "draft" | "active" | "paused" | "completed" | "error";

export function toLocalStatus(instantlyStatus: number | null | undefined): LocalCampaignStatus {
  switch (instantlyStatus) {
    case INSTANTLY_CAMPAIGN_STATUS.DRAFT:
      return "draft";
    case INSTANTLY_CAMPAIGN_STATUS.ACTIVE:
    case INSTANTLY_CAMPAIGN_STATUS.RUNNING_SUBSEQUENCES:
      return "active";
    case INSTANTLY_CAMPAIGN_STATUS.PAUSED:
      return "paused";
    case INSTANTLY_CAMPAIGN_STATUS.COMPLETED:
      return "completed";
    default:
      // Alle negativen Fehlerstatus (Account Suspended/Unhealthy, Bounce
      // Protect) landen bewusst in "error", statt still als "paused" zu
      // erscheinen -- das sind Faelle, die der Kunde aktiv sehen soll.
      return instantlyStatus != null && instantlyStatus < 0 ? "error" : "draft";
  }
}

import type { SupabaseClient } from "@supabase/supabase-js";

/** Lokale Zeile aus public.campaigns (Spiegel der Instantly-Kampagne, siehe Migration 0023). */
export type LocalCampaign = {
  id: string;
  workspace_id: string;
  search_id: string | null;
  name: string;
  status: LocalCampaignStatus;
  instantly_campaign_id: string | null;
  mailboxes: string[];
  days: number[];
  send_window_start: string;
  send_window_end: string;
  timezone: string;
  daily_limit: number | null;
  activated_at: string | null;
  created_at: string;
};

/** Laedt eine lokale Kampagne, aber nur wenn sie tatsaechlich diesem Workspace gehoert (RLS greift zusaetzlich, das hier ist die explizite Kontext-Pruefung fuer bessere Fehlermeldungen). */
export async function loadOwnedCampaign(
  supabase: SupabaseClient,
  workspaceId: string,
  campaignId: string
): Promise<LocalCampaign | null> {
  const { data } = await supabase
    .from("campaigns")
    .select("*")
    .eq("id", campaignId)
    .eq("workspace_id", workspaceId)
    .single();
  return (data as LocalCampaign) ?? null;
}

/** Instantly-Kampagnen-Objekt, nur die Felder, die wir hier tatsaechlich lesen. */
export type InstantlyCampaign = {
  id: string;
  name: string;
  status: number;
  campaign_schedule?: {
    schedules?: Array<{ timing?: { from?: string; to?: string }; days?: Record<string, boolean>; timezone?: string }>;
  };
  sequences?: Array<{ steps?: Array<{ delay?: number; variants?: Array<{ subject?: string; body?: string }> }> }>;
  email_list?: string[];
  daily_limit?: number | null;
};

/** Instantlys Sequenz-Objekt zurueck in unsere editierbare Step-Form uebersetzen. */
export function sequenceFromInstantly(campaign: InstantlyCampaign): SequenceStep[] {
  const steps = campaign.sequences?.[0]?.steps ?? [];
  return steps.map((s) => ({
    subject: s.variants?.[0]?.subject ?? "",
    body: s.variants?.[0]?.body ?? "",
    delayDays: s.delay ?? 0,
  }));
}

/** Instantlys Schedule-Objekt zurueck in unsere editierbare Form uebersetzen. */
export function scheduleFromInstantly(campaign: InstantlyCampaign): CampaignScheduleInput {
  const sched = campaign.campaign_schedule?.schedules?.[0];
  const daysObj = sched?.days ?? {};
  const days = Object.keys(daysObj)
    .filter((k) => daysObj[k])
    .map(Number)
    .sort();
  return {
    days: days.length > 0 ? days : [1, 2, 3, 4, 5],
    from: sched?.timing?.from ?? "09:00",
    to: sched?.timing?.to ?? "17:00",
    timezone: sched?.timezone ?? "Europe/Vienna",
  };
}
