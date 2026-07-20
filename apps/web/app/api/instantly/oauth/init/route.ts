import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspace/server";
import { getInstantlyApiKey, instantlyRequest, InstantlyApiError } from "@/lib/instantly";

// Startet den Instantly-eigenen OAuth-Flow fuer Google Workspace/Microsoft.
// Instantly gibt eine auth_url + session_id zurueck; das Frontend oeffnet die
// auth_url in einem Popup und pollt danach /api/instantly/oauth/status.
// Hinweis: laut Instantly-Doku funktioniert der Google-OAuth-Flow nur mit
// Google-Workspace- (GSuite-)Konten, nicht mit privaten @gmail.com-Adressen.
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

  const { provider } = await req.json();
  if (provider !== "google" && provider !== "microsoft") {
    return NextResponse.json({ error: "Ungueltiger Provider" }, { status: 400 });
  }

  try {
    const data = await instantlyRequest(apiKey, `/api/v2/oauth/${provider}/init`, { method: "POST" });
    return NextResponse.json(data);
  } catch (e) {
    const status = e instanceof InstantlyApiError ? e.status : 500;
    return NextResponse.json({ error: (e as Error).message }, { status });
  }
}
