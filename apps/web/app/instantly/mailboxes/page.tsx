import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspace/server";
import { getLangServer } from "@/lib/i18n/lang";
import { dict } from "@/lib/i18n/dict";
import MailboxesPanel from "./mailboxes-panel";

export default async function InstantlyMailboxesPage() {
  const lang = await getLangServer();
  const t = dict[lang];
  const supabase = await createClient();
  const ws = await getCurrentWorkspace(supabase);
  if (!ws) return <p className="text-faint">Kein Workspace gefunden.</p>;

  const { data: key } = await supabase
    .from("api_keys")
    .select("provider")
    .eq("workspace_id", ws.workspace.id)
    .eq("provider", "instantly")
    .maybeSingle();

  return (
    <div className="fade-up max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">{t.instantly.mailboxesPage.title}</h1>
        <p className="text-sm text-faint">{t.instantly.mailboxesPage.description}</p>
      </div>
      <MailboxesPanel hasInstantlyKey={!!key} />
    </div>
  );
}
