import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspace/server";
import { getInstantlyApiKey, instantlyRequest, InstantlyApiError } from "@/lib/instantly";

export async function DELETE(req: Request, { params }: { params: Promise<{ email: string }> }) {
  const { email } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const ws = await getCurrentWorkspace(supabase);
  if (!ws) return NextResponse.json({ error: "Kein Workspace" }, { status: 400 });

  const apiKey = await getInstantlyApiKey(supabase, ws.workspace.id);
  if (!apiKey) return NextResponse.json({ error: "Kein Instantly-API-Key hinterlegt." }, { status: 400 });

  try {
    await instantlyRequest(apiKey, `/api/v2/accounts/${encodeURIComponent(email)}`, { method: "DELETE" });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const status = e instanceof InstantlyApiError ? e.status : 500;
    return NextResponse.json({ error: (e as Error).message }, { status });
  }
}
