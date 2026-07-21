"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useT } from "../../../language-provider";
import { useToast } from "../../../toast-provider";
import { useWorkspace } from "../../../workspace-provider";
import { inputCls } from "@/lib/ui";
import CampaignForm, { emptyCampaignFormValue, type CampaignFormValue } from "../campaign-form";

type SearchOption = { id: string; name: string | null; query: string; location: string; instantly_campaign_id: string | null };

export default function NewCampaignPage() {
  const { t } = useT();
  const F = t.instantly.campaigns.form;
  const router = useRouter();
  const searchParams = useSearchParams();
  const { push } = useToast();
  const { workspaceId } = useWorkspace();

  const [searches, setSearches] = useState<SearchOption[] | null>(null);
  const [searchId, setSearchId] = useState(searchParams.get("searchId") ?? "");
  const [value, setValue] = useState<CampaignFormValue>(emptyCampaignFormValue());
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    createClient()
      .from("searches")
      .select("id, name, query, location, instantly_campaign_id")
      .eq("workspace_id", workspaceId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .then(({ data }) => setSearches(data ?? []));
  }, [workspaceId]);

  async function create() {
    if (
      !searchId ||
      !value.name.trim() ||
      value.mailboxes.length === 0 ||
      value.steps.some((s) => !s.subject.trim() || !s.body.trim())
    ) {
      push(F.validationError, "error");
      return;
    }
    setCreating(true);
    const res = await fetch("/api/instantly/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        searchId,
        name: value.name,
        mailboxes: value.mailboxes,
        steps: value.steps,
        days: value.days,
        from: value.from,
        to: value.to,
        timezone: value.timezone,
        dailyLimit: Number(value.dailyLimit) || undefined,
      }),
    });
    const body = await res.json().catch(() => ({}));
    setCreating(false);
    if (res.ok) {
      push(F.created, "success");
      router.push(`/instantly/campaigns/${body.campaign_id}`);
    } else {
      push(t.common.error + (body.error ?? res.status), "error");
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">{t.instantly.campaigns.newPageTitle}</h1>
      </div>

      <div>
        <p className="mb-1.5 text-xs font-medium text-faint">{F.searchLabel}</p>
        {searches !== null && searches.length === 0 && <p className="text-xs text-faint">{F.noSearches}</p>}
        <select value={searchId} onChange={(e) => setSearchId(e.target.value)} className={inputCls + " w-full"}>
          <option value="">{F.searchPlaceholder}</option>
          {(searches ?? []).map((s) => (
            <option key={s.id} value={s.id} disabled={!!s.instantly_campaign_id}>
              {(s.name || s.query) + " · " + s.location + (s.instantly_campaign_id ? " (bereits verknüpft)" : "")}
            </option>
          ))}
        </select>
      </div>

      <CampaignForm
        value={value}
        onChange={setValue}
        onSubmit={create}
        submitting={creating}
        submitLabel={F.create}
        submittingLabel={F.creating}
      />
    </div>
  );
}
