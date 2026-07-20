import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspace/server";
import { getInstantlyApiKey, instantlyRequest, InstantlyApiError } from "@/lib/instantly";

export async function GET(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const ws = await getCurrentWorkspace(supabase);
  if (!ws) return NextResponse.json({ error: "Kein Workspace" }, { status: 400 });

  const apiKey = await getInstantlyApiKey(supabase, ws.workspace.id);
  if (!apiKey) return NextResponse.json({ error: "Kein Instantly-API-Key hinterlegt." }, { status: 400 });

  const sessionId = new URL(req.url).searchParams.get("sessionId");
  if (!sessionId) return NextResponse.json({ error: "sessionId fehlt" }, { status: 400 });

  try {
    const data = await instantlyRequest(apiKey, `/api/v2/oauth/session/status/${encodeURIComponent(sessionId)}`);
    return NextResponse.json(data);
  } catch (e) {
    const status = e instanceof InstantlyApiError ? e.status : 500;
    return NextResponse.json({ error: (e as Error).message }, { status });
  }
}
