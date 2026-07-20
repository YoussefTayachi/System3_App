import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspace/server";
import { getInstantlyApiKey, instantlyRequest, InstantlyApiError } from "@/lib/instantly";

type SequenceStep = { subject: string; body: string; delayDays?: number };

type CreateCampaignBody = {
  searchId: string;
  name: string;
  mailboxes: string[];
  steps: SequenceStep[];
  days: number[]; // 0=Sonntag..6=Samstag
  from: string; // "09:00"
  to: string; // "17:00"
  timezone: string; // z.B. "Europe/Vienna"
  dailyLimit?: number;
};

// Instantlys campaign_schedule-Objekt (POST /api/v2/campaigns): schedules[] mit
// name, timing.from/to (HH:MM), days (Objekt mit boolean-Keys "0".."6"), timezone.
function buildSchedule(days: number[], from: string, to: string, timezone: string) {
  const daysObj: Record<string, boolean> = {};
  for (let d = 0; d <= 6; d++) daysObj[String(d)] = days.includes(d);
  return { schedules: [{ name: "Standard", timing: { from, to }, days: daysObj, timezone }] };
}

// Laut Instantly-Doku wird beim Top-Level-Feld "sequences" nur das erste Element
// verwendet (Array existiert nur aus Kompatibilitaetsgruenden). Jeder Schritt hat
// "variants" (fuer A/B-Tests), wir nutzen bewusst nur eine Variante pro Schritt.
// Diese Schritt-Struktur ist aus der Doku abgeleitet, aber nicht an einem echten
// Account verifiziert -- vor dem ersten echten Versand mit einem Test-Account pruefen.
function buildSequence(steps: SequenceStep[]) {
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

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const ws = await getCurrentWorkspace(supabase);
  if (!ws) return NextResponse.json({ error: "Kein Workspace" }, { status: 400 });

  const apiKey = await getInstantlyApiKey(supabase, ws.workspace.id);
  if (!apiKey) {
    return NextResponse.json({ error: "Kein Instantly-API-Key in den Einstellungen hinterlegt." }, { status: 400 });
  }

  const body = (await req.json()) as CreateCampaignBody;
  const { searchId, name, mailboxes, steps, days, from, to, timezone, dailyLimit } = body;

  if (!searchId || !name?.trim() || !mailboxes?.length || !steps?.length || !days?.length || !from || !to || !timezone) {
    return NextResponse.json({ error: "Pflichtfelder fehlen" }, { status: 400 });
  }

  const { data: search } = await supabase
    .from("searches")
    .select("id")
    .eq("id", searchId)
    .eq("workspace_id", ws.workspace.id)
    .single();
  if (!search) return NextResponse.json({ error: "Suche nicht gefunden" }, { status: 404 });

  const { data: contacts } = await supabase
    .from("contacts")
    .select("email, first_name, last_name, businesses!inner(name, personalization, search_id)")
    .eq("workspace_id", ws.workspace.id)
    .eq("businesses.search_id", searchId)
    .not("email", "is", null)
    .limit(5000);

  type ContactRow = {
    email: string | null;
    first_name: string | null;
    last_name: string | null;
    businesses: { name: string | null; personalization: string | null } | null;
  };

  const leads = ((contacts ?? []) as unknown as ContactRow[])
    .filter((c) => !!c.email)
    .map((c) => ({
      email: c.email as string,
      first_name: c.first_name || undefined,
      last_name: c.last_name || undefined,
      company_name: c.businesses?.name || undefined,
      personalization: c.businesses?.personalization || undefined,
    }));

  if (leads.length === 0) {
    return NextResponse.json({ error: "Keine Kontakte mit E-Mail-Adresse in dieser Suche gefunden." }, { status: 400 });
  }

  try {
    const campaign = await instantlyRequest<{ id: string }>(apiKey, "/api/v2/campaigns", {
      method: "POST",
      body: JSON.stringify({
        name: name.trim(),
        campaign_schedule: buildSchedule(days, from, to, timezone),
        sequences: buildSequence(steps),
        email_list: mailboxes,
        daily_limit: dailyLimit || undefined,
      }),
    });

    // Instantly erlaubt max. 1000 Leads pro Aufruf von /leads/add, deshalb in Chargen.
    for (let i = 0; i < leads.length; i += 1000) {
      const chunk = leads.slice(i, i + 1000);
      await instantlyRequest(apiKey, "/api/v2/leads/add", {
        method: "POST",
        body: JSON.stringify({ campaign_id: campaign.id, leads: chunk }),
      });
    }

    await supabase
      .from("searches")
      .update({ instantly_campaign_id: campaign.id })
      .eq("id", searchId)
      .eq("workspace_id", ws.workspace.id);

    return NextResponse.json({ ok: true, campaign_id: campaign.id, leads_added: leads.length });
  } catch (e) {
    const status = e instanceof InstantlyApiError ? e.status : 500;
    return NextResponse.json({ error: (e as Error).message }, { status });
  }
}
