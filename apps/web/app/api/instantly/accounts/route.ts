import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireInstantlyContext, instantlyRequest, InstantlyApiError } from "@/lib/instantly";

// Provider-Codes laut Instantly API v2: 1=Custom IMAP/SMTP, 2=Google, 3=Microsoft, 4=AWS.
// Fuer 2/3 nutzen wir stattdessen den OAuth-Flow (siehe app/api/instantly/oauth/*),
// dieser Endpunkt hier deckt Custom IMAP/SMTP ab.

export async function GET() {
  const supabase = await createClient();
  const ctx = await requireInstantlyContext(supabase);
  if ("error" in ctx) return ctx.error;

  try {
    const data = await instantlyRequest(ctx.apiKey, "/api/v2/accounts?limit=100");
    return NextResponse.json(data);
  } catch (e) {
    const status = e instanceof InstantlyApiError ? e.status : 500;
    return NextResponse.json({ error: (e as Error).message }, { status });
  }
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const ctx = await requireInstantlyContext(supabase);
  if ("error" in ctx) return ctx.error;

  const body = await req.json();
  const { email, first_name, last_name, imap_host, imap_port, imap_username, imap_password, smtp_host, smtp_port, smtp_username, smtp_password, daily_limit } = body;
  if (!email || !imap_host || !smtp_host || !imap_username || !smtp_username) {
    return NextResponse.json({ error: "Pflichtfelder fehlen" }, { status: 400 });
  }

  try {
    const data = await instantlyRequest(ctx.apiKey, "/api/v2/accounts", {
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
