import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspace/server";
import { getInstantlyApiKey, instantlyRequest, InstantlyApiError } from "@/lib/instantly";

// Instantly fuehrt Warmup-Enable/Disable asynchron als Background Job aus
// (Antwort ist ein Job-Objekt, kein sofortiger Endzustand). Fuer den Zweck
// hier (Toggle in den Settings) reicht es, den Job anzustoßen; der neue
// warmup_status zeigt sich beim naechsten Laden der Konto-Liste.
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const ws = await getCurrentWorkspace(supabase);
  if (!ws) return NextResponse.json({ error: "Kein Workspace" }, { status: 400 });

  const apiKey = await getInstantlyApiKey(supabase, ws.workspace.id);
  if (!apiKey) return NextResponse.json({ error: "Kein Instantly-API-Key hinterlegt." }, { status: 400 });

  const { action, email } = await req.json();
  if (!email || (action !== "enable" && action !== "disable")) {
    return NextResponse.json({ error: "Ungueltige Eingabe" }, { status: 400 });
  }

  try {
    const data = await instantlyRequest(apiKey, `/api/v2/accounts/warmup/${action}`, {
      method: "POST",
      body: JSON.stringify({ emails: [email] }),
    });
    return NextResponse.json(data);
  } catch (e) {
    const status = e instanceof InstantlyApiError ? e.status : 500;
    return NextResponse.json({ error: (e as Error).message }, { status });
  }
}
