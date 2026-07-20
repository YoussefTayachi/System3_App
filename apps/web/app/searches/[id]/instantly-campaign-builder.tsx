"use client";
import { useEffect, useState } from "react";
import { useT } from "../../language-provider";
import { useToast } from "../../toast-provider";

type Account = { email: string; status: number };
type Step = { subject: string; body: string; delayDays: number };

const inputCls =
  "rounded-lg border border-edge2 bg-field px-3.5 py-2.5 text-sm text-ink " +
  "placeholder-mute outline-none transition-colors focus:border-sky-500";

const DAY_LABELS = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];

/**
 * Phase 2 aus instantly_native_integration_plan.md: Kampagne inkl. Sequence
 * direkt aus Thaw anlegen (POST /api/instantly/campaigns), statt CSV-Export +
 * manuellem Aufbau in Instantly. Optionales Feature -- nur sichtbar/nutzbar,
 * wenn ein Instantly-Key hinterlegt ist; ersetzt nicht den bisherigen manuellen
 * "Kampagnen-ID einfuegen"-Weg fuer Kunden, die die Kampagne lieber selbst in
 * Instantly bauen (siehe SearchSettings).
 */
export default function InstantlyCampaignBuilder({
  searchId,
  hasInstantlyKey,
  existingCampaignId,
  contactsWithEmailCount,
}: {
  searchId: string;
  hasInstantlyKey: boolean;
  existingCampaignId: string | null;
  contactsWithEmailCount: number;
}) {
  const { t } = useT();
  const C = t.searchDetail.campaignBuilder;
  const { push } = useToast();
  const [open, setOpen] = useState(false);
  const [accounts, setAccounts] = useState<Account[] | null>(null);
  const [selectedMailboxes, setSelectedMailboxes] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [steps, setSteps] = useState<Step[]>([{ subject: "", body: "", delayDays: 0 }]);
  const [days, setDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [from, setFrom] = useState("09:00");
  const [to, setTo] = useState("17:00");
  const [timezone, setTimezone] = useState(
    typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "Europe/Vienna"
  );
  const [dailyLimit, setDailyLimit] = useState("50");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!open || accounts !== null) return;
    fetch("/api/instantly/accounts")
      .then((r) => r.json())
      .then((body) => setAccounts(body.items ?? []))
      .catch(() => setAccounts([]));
  }, [open, accounts]);

  function toggleDay(d: number) {
    setDays((cur) => (cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d].sort()));
  }

  function toggleMailbox(email: string) {
    setSelectedMailboxes((cur) => (cur.includes(email) ? cur.filter((x) => x !== email) : [...cur, email]));
  }

  function updateStep(i: number, patch: Partial<Step>) {
    setSteps((cur) => cur.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  }

  function addStep() {
    setSteps((cur) => [...cur, { subject: "", body: "", delayDays: 3 }]);
  }

  function removeStep(i: number) {
    setSteps((cur) => cur.filter((_, idx) => idx !== i));
  }

  async function createCampaign() {
    if (!name.trim() || selectedMailboxes.length === 0 || steps.some((s) => !s.subject.trim() || !s.body.trim())) {
      push(C.validationError, "error");
      return;
    }
    setCreating(true);
    const res = await fetch("/api/instantly/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        searchId,
        name,
        mailboxes: selectedMailboxes,
        steps,
        days,
        from,
        to,
        timezone,
        dailyLimit: Number(dailyLimit) || undefined,
      }),
    });
    const responseBody = await res.json().catch(() => ({}));
    setCreating(false);
    if (res.ok) {
      push(C.created(responseBody.leads_added ?? 0), "success");
      setOpen(false);
      window.location.reload();
    } else {
      push(t.common.error + (responseBody.error ?? res.status), "error");
    }
  }

  if (!hasInstantlyKey) return null;

  if (existingCampaignId) {
    return (
      <div className="rounded-lg border border-edge2 bg-panel px-4 py-3 text-sm text-faint">
        {C.linkedHeading} <code className="rounded bg-panel2 px-1.5 py-0.5 font-mono text-[11px] text-mute">{existingCampaignId}</code>
        <span className="ml-2">{C.linkedHint}</span>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-edge2 bg-panel p-4">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between text-left text-sm font-medium text-ink"
      >
        {C.heading}
        <span className="text-xs text-faint">{open ? C.collapse : C.expand}</span>
      </button>

      {open && (
        <div className="mt-4 space-y-4">
          <p className="text-xs text-faint">{C.description(contactsWithEmailCount)}</p>

          <input
            placeholder={C.namePlaceholder}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputCls + " w-full"}
          />

          <div>
            <p className="mb-1.5 text-xs font-medium text-faint">{C.mailboxesLabel}</p>
            {accounts === null && <p className="text-xs text-faint">{t.common.saving}</p>}
            {accounts !== null && accounts.length === 0 && <p className="text-xs text-faint">{C.noMailboxes}</p>}
            <div className="flex flex-wrap gap-2">
              {(accounts ?? []).map((a) => (
                <button
                  key={a.email}
                  onClick={() => toggleMailbox(a.email)}
                  className={
                    "rounded-full border px-3 py-1 text-xs transition-colors " +
                    (selectedMailboxes.includes(a.email)
                      ? "border-sky-500 bg-sky-500/10 text-sky-600 dark:text-sky-300"
                      : "border-edge2 text-faint hover:border-sky-500/50")
                  }
                >
                  {a.email}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-xs font-medium text-faint">{C.sequenceLabel}</p>
            {steps.map((s, i) => (
              <div key={i} className="rounded-lg border border-edge2 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-medium text-soft">{C.stepLabel(i + 1)}</span>
                  <div className="flex items-center gap-2">
                    {i > 0 && (
                      <label className="flex items-center gap-1.5 text-[11px] text-faint">
                        {C.delayLabel}
                        <input
                          type="number"
                          min={0}
                          value={s.delayDays}
                          onChange={(e) => updateStep(i, { delayDays: Number(e.target.value) || 0 })}
                          className={inputCls + " w-16 px-2 py-1"}
                        />
                      </label>
                    )}
                    {steps.length > 1 && (
                      <button onClick={() => removeStep(i)} className="text-[11px] text-red-500 hover:text-red-400">
                        {t.common.delete}
                      </button>
                    )}
                  </div>
                </div>
                <input
                  placeholder={C.subjectPlaceholder}
                  value={s.subject}
                  onChange={(e) => updateStep(i, { subject: e.target.value })}
                  className={inputCls + " mb-2 w-full"}
                />
                <textarea
                  placeholder={C.bodyPlaceholder}
                  value={s.body}
                  onChange={(e) => updateStep(i, { body: e.target.value })}
                  rows={4}
                  className={inputCls + " w-full resize-y"}
                />
              </div>
            ))}
            <button onClick={addStep} className="text-xs font-medium text-sky-600 hover:text-sky-500 dark:text-sky-400">
              {C.addStep}
            </button>
          </div>

          <div>
            <p className="mb-1.5 text-xs font-medium text-faint">{C.scheduleLabel}</p>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex gap-1">
                {DAY_LABELS.map((label, d) => (
                  <button
                    key={d}
                    onClick={() => toggleDay(d)}
                    className={
                      "h-7 w-7 rounded-md border text-[11px] transition-colors " +
                      (days.includes(d)
                        ? "border-sky-500 bg-sky-500/10 text-sky-600 dark:text-sky-300"
                        : "border-edge2 text-faint hover:border-sky-500/50")
                    }
                  >
                    {label}
                  </button>
                ))}
              </div>
              <input type="time" value={from} onChange={(e) => setFrom(e.target.value)} className={inputCls} />
              <span className="text-xs text-faint">{C.until}</span>
              <input type="time" value={to} onChange={(e) => setTo(e.target.value)} className={inputCls} />
              <input
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className={inputCls + " w-40"}
                placeholder="Europe/Vienna"
              />
              <input
                type="number"
                value={dailyLimit}
                onChange={(e) => setDailyLimit(e.target.value)}
                className={inputCls + " w-24"}
                placeholder={C.dailyLimitPlaceholder}
              />
            </div>
          </div>

          <button
            onClick={createCampaign}
            disabled={creating}
            className="rounded-lg bg-sky-600 px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-sky-600/25 transition-all hover:bg-sky-500 disabled:opacity-50"
          >
            {creating ? C.creating : C.create}
          </button>
        </div>
      )}
    </div>
  );
}
