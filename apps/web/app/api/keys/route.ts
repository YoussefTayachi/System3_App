import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspace/server";
import { fernetEncrypt } from "@/lib/fernet";

const PROVIDERS = ["google_maps", "openai", "hunter", "neverbounce", "instantly"];

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { provider, key } = await req.json();
  if (!PROVIDERS.includes(provider) || typeof key !== "string" || key.length < 8) {
    return NextResponse.json({ error: "Ungültige Eingabe" }, { status: 400 });
  }
  const ws = await getCurrentWorkspace(supabase);
  if (!ws) return NextResponse.json({ error: "Kein Workspace" }, { status: 400 });

  const key_ciphertext = fernetEncrypt(process.env.APP_ENCRYPTION_KEY!, key.trim());
  const { error } = await supabase
    .from("api_keys")
    .upsert({ workspace_id: ws.workspace.id, provider, key_ciphertext }, { onConflict: "workspace_id,provider" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { provider } = await req.json();
  if (!PROVIDERS.includes(provider)) {
    return NextResponse.json({ error: "Ungültige Eingabe" }, { status: 400 });
  }
  const ws = await getCurrentWorkspace(supabase);
  if (!ws) return NextResponse.json({ error: "Kein Workspace" }, { status: 400 });

  const { error } = await supabase
    .from("api_keys")
    .delete()
    .eq("workspace_id", ws.workspace.id)
    .eq("provider", provider);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
