import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireInstantlyContext, instantlyRequest, InstantlyApiError } from "@/lib/instantly";

// Instantly fuehrt Warmup-Enable/Disable asynchron als Background Job aus
// (Antwort ist ein Job-Objekt, kein sofortiger Endzustand). Fuer den Zweck
// hier (Toggle in den Settings) reicht es, den Job anzustoßen; der neue
// warmup_status zeigt sich beim naechsten Laden der Konto-Liste.
export async function POST(req: Request) {
  const supabase = await createClient();
  const ctx = await requireInstantlyContext(supabase);
  if ("error" in ctx) return ctx.error;

  const { action, email } = await req.json();
  if (!email || (action !== "enable" && action !== "disable")) {
    return NextResponse.json({ error: "Ungueltige Eingabe" }, { status: 400 });
  }

  try {
    const data = await instantlyRequest(ctx.apiKey, `/api/v2/accounts/warmup/${action}`, {
      method: "POST",
      body: JSON.stringify({ emails: [email] }),
    });
    return NextResponse.json(data);
  } catch (e) {
    const status = e instanceof InstantlyApiError ? e.status : 500;
    return NextResponse.json({ error: (e as Error).message }, { status });
  }
}
