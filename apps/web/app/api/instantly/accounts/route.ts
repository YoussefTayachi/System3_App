import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspace/server";
import { getInstantlyApiKey, instantlyRequest, InstantlyApiError } from "@/lib/instantly";

// Provider-Codes laut Instantly API v2: 1=Custom IMAP/SMTP, 2=Google, 3=Microsoft, 4=AWS.
// Fuer 2/3 nutzen wir stattdessen den OAuth-Flow (siehe app/api/instantly/oauth/*),
// dieser Endpunkt hier deckt Custom IMAP/SMTP ab.

async function requireKey(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: "unauthorized" }, { status: 401 }) } as const;

  const ws = await getCurrentWorkspace(supabase);
  if (!ws) return { error: NextResponse.json({ error: "Kein Workspace" }, { status: 400 }) } as const;

  const apiKey = await getInstantlyApiKey(supabase, ws.workspace.id);
  if (!apiKey) {
    return {
      error: NextResponse.json(
        { error: "Kein Instantly-API-Key in den Einstellungen hinterlegt." },
        { status: 400 }
      ),
    } as const;
  }
  return { apiKey } as const;
}

export async function GET() {
  const supabase = await createClient();
  const r = await requireKey(supabase);
  if ("error" in r) return r.error;

  try {
    const data = await instantlyRequest(r.apiKey, "/api/v2/accounts?limit=100");
    return NextResponse.json(data);
  } catch (e) {
    const status = e instanceof InstantlyApiError ? e.status : 500;
    return NextResponse.json({ error: (e as Error).message }, { status });
  }
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const r = await requireKey(supabase);
  if ("error" in r) return r.error;

  const body = await req.json();
  const { email, first_name, last_name, imap_host, imap_port, imap_username, imap_password, smtp_host, smtp_port, smtp_username, smtp_password, daily_limit } = body;
  if (!email || !imap_host || !smtp_host || !imap_username || !smtp_username) {
    return NextResponse.json({ error: "Pflichtfelder fehlen" }, { status: 400 });
  }

  try {
    const data = await instantlyRequest(r.apiKey, "/api/v2/accounts", {
      method: "POST",
      body: JSON.stringify({
        email,
        first_name: first_name || email.split("@")[0],
        last_name: last_name || "",
        provider_code: 1, // Custom IMAP/SMTP
        imap_host,
        imap_port: Number(imap_port) || 993,
        imap_username,
        imap_password,
        smtp_host,
        smtp_port: Number(smtp_port) || 587,
        smtp_username,
        smtp_password,
        daily_limit: daily_limit ? Number(daily_limit) : undefined,
      }),
    });
    return NextResponse.json(data);
  } catch (e) {
    const status = e instanceof InstantlyApiError ? e.status : 500;
    return NextResponse.json({ error: (e as Error).message }, { status });
  }
}
