import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireInstantlyContext, instantlyRequest, InstantlyApiError } from "@/lib/instantly";

export async function DELETE(req: Request, { params }: { params: Promise<{ email: string }> }) {
  const { email } = await params;
  const supabase = await createClient();
  const ctx = await requireInstantlyContext(supabase);
  if ("error" in ctx) return ctx.error;

  try {
    await instantlyRequest(ctx.apiKey, `/api/v2/accounts/${encodeURIComponent(email)}`, { method: "DELETE" });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const status = e instanceof InstantlyApiError ? e.status : 500;
    return NextResponse.json({ error: (e as Error).message }, { status });
  }
}
