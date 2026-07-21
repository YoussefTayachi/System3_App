"use client";
import { useEffect, useRef, useState } from "react";
import { useT } from "../../language-provider";
import { inputCls, primaryBtnCls } from "@/lib/ui";
import { INSTANTLY_TIMEZONE_OPTIONS, defaultInstantlyTimezone } from "@/lib/instantly/campaigns";

type Account = { email: string; status: number };
export type Step = { subject: string; body: string; delayDays: number };
export type CampaignFormValue = {
  name: string;
  mailboxes: string[];
  steps: Step[];
  days: number[];
  from: string;
  to: string;
  timezone: string;
  dailyLimit: string;
};

const DAY_LABELS = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];

export function emptyCampaignFormValue(): CampaignFormValue {
  return {
    name: "",
    mailboxes: [],
    steps: [{ subject: "", body: "", delayDays: 0 }],
    days: [1, 2, 3, 4, 5],
    from: "09:00",
    to: "17:00",
    timezone: defaultInstantlyTimezone(),
    dailyLimit: "50",
  };
}

/**
 * Reines Formular fuer Kampagnen-Name/Mailboxen/Sequenz/Zeitplan -- wird
 * sowohl beim Anlegen (campaigns/new) als auch beim Bearbeiten
 * (campaigns/[id]) verwendet. Haelt selbst keinen Server-State, der Aufrufer
 * kontrolliert `value`/`onChange` und entscheidet, was beim Submit passiert
 * (POST vs. PATCH) -- so bleibt die Logik fuer "anlegen" vs. "bearbeiten" an
 * einer Stelle je Seite, statt in einer gemeinsamen Komponente verzweigt zu
 * werden.
 */
export default function CampaignForm({
  value,
  onChange,
  onSubmit,
  submitting,
  submitLabel,
  submittingLabel,
}: {
  value: CampaignFormValue;
  onChange: (v: CampaignFormValue) => void;
  onSubmit: () => void;
  submitting: boolean;
  submitLabel: string;
  submittingLabel: string;
}) {
  const { t } = useT();
  const F = t.instantly.campaigns.form;
  const [accounts, setAccounts] = useState<Account[] | null>(null);

  useEffect(() => {
    fetch("/api/instantly/accounts")
      .then((r) => r.json())
      .then((body) => setAccounts(body.items ?? []))
      .catch(() => setAccounts([]));
  }, []);

  function toggleDay(d: number) {
    onChange({ ...value, days: value.days.includes(d) ? value.days.filter((x) => x !== d) : [...value.days, d].sort() });
  }

  function toggleMailbox(email: string) {
    onChange({
      ...value,
      mailboxes: value.mailboxes.includes(email) ? value.mailboxes.filter((x) => x !== email) : [...value.mailboxes, email],
    });
  }

  function updateStep(i: number, patch: Partial<Step>) {
    onChange({ ...value, steps: value.steps.map((s, idx) => (idx === i ? { ...s, ...patch } : s)) });
  }

  function addStep() {
    onChange({ ...value, steps: [...value.steps, { subject: "", body: "", delayDays: 3 }] });
  }

  function removeStep(i: number) {
    onChange({ ...value, steps: value.steps.filter((_, idx) => idx !== i) });
  }

  // Variablen per Klick einfuegen statt selbst tippen zu muessen: merkt sich,
  // welches Feld (Betreff/Text welches Schritts) zuletzt fokussiert war, und
  // fuegt dort an der Cursor-Position ein. Namen/Syntax ({{firstName}} etc.)
  // muessen exakt Instantlys vordefinierten Lead-Variablen entsprechen (siehe
  // https://help.instantly.ai/en/articles/6135930), sonst wird beim Versand
  // nichts ersetzt.
  const subjectRefs = useRef<(HTMLInputElement | null)[]>([]);
  const bodyRefs = useRef<(HTMLTextAreaElement | null)[]>([]);
  const [activeField, setActiveField] = useState<{ step: number; field: "subject" | "body" } | null>(null);

  const VARIABLES: { token: string; label: string }[] = [
    { token: "{{firstName}}", label: F.variableFirstName },
    { token: "{{lastName}}", label: F.variableLastName },
    { token: "{{companyName}}", label: F.variableCompanyName },
    { token: "{{email}}", label: F.variableEmail },
    { token: "{{personalization}}", label: F.variablePersonalization },
  ];

  function insertVariable(stepIndex: number, token: string) {
    const field = activeField && activeField.step === stepIndex ? activeField.field : "body";
    const el = field === "subject" ? subjectRefs.current[stepIndex] : bodyRefs.current[stepIndex];
    const current = value.steps[stepIndex][field];
    const start = el?.selectionStart ?? current.length;
    const end = el?.selectionEnd ?? current.length;
    const next = current.slice(0, start) + token + current.slice(end);
    updateStep(stepIndex, { [field]: next } as Partial<Step>);
    // Cursor hinter das eingefuegte Token setzen, nachdem React den neuen Wert gerendert hat.
    requestAnimationFrame(() => {
      el?.focus();
      const pos = start + token.length;
      el?.setSelectionRange(pos, pos);
    });
  }

  return (
    <div className="space-y-4">
      <input
        placeholder={F.namePlaceholder}
        value={value.name}
        onChange={(e) => onChange({ ...value, name: e.target.value })}
        className={inputCls + " w-full"}
      />

      <div>
        <p className="mb-1.5 text-xs font-medium text-faint">{F.mailboxesLabel}</p>
        {accounts === null && <p className="text-xs text-faint">{t.common.saving}</p>}
        {accounts !== null && accounts.length === 0 && <p className="text-xs text-faint">{F.noMailboxes}</p>}
        <div className="flex flex-wrap gap-2">
          {(accounts ?? []).map((a) => (
            <button
              key={a.email}
              type="button"
              onClick={() => toggleMailbox(a.email)}
              className={
                "rounded-full border px-3 py-1 text-xs transition-colors " +
                (value.mailboxes.includes(a.email)
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
        <p className="text-xs font-medium text-faint">{F.sequenceLabel}</p>
        {value.steps.map((s, i) => (
          <div key={i} className="rounded-lg border border-edge2 p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-medium text-soft">{F.stepLabel(i + 1)}</span>
              <div className="flex items-center gap-2">
                {i > 0 && (
                  <label className="flex items-center gap-1.5 text-[11px] text-faint">
                    {F.delayLabel}
                    <input
                      type="number"
                      min={0}
                      value={s.delayDays}
                      onChange={(e) => updateStep(i, { delayDays: Number(e.target.value) || 0 })}
                      className={inputCls + " w-16 px-2 py-1"}
                    />
                  </label>
                )}
                {value.steps.length > 1 && (
                  <button type="button" onClick={() => removeStep(i)} className="text-[11px] text-red-500 hover:text-red-400">
                    {t.common.delete}
                  </button>
                )}
              </div>
            </div>
            <div className="mb-2 flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] text-faint">{F.insertVariable}</span>
              {VARIABLES.map((v) => (
                <button
                  key={v.token}
                  type="button"
                  onClick={() => insertVariable(i, v.token)}
                  className="rounded-full border border-edge2 px-2 py-0.5 text-[11px] text-faint transition-colors hover:border-sky-500/50 hover:text-sky-600 dark:hover:text-sky-400"
                >
                  {v.label}
                </button>
              ))}
            </div>
            <input
              ref={(el) => {
                subjectRefs.current[i] = el;
              }}
              placeholder={F.subjectPlaceholder}
              value={s.subject}
              onChange={(e) => updateStep(i, { subject: e.target.value })}
              onFocus={() => setActiveField({ step: i, field: "subject" })}
              className={inputCls + " mb-2 w-full"}
            />
            <textarea
              ref={(el) => {
                bodyRefs.current[i] = el;
              }}
              placeholder={F.bodyPlaceholder}
              value={s.body}
              onChange={(e) => updateStep(i, { body: e.target.value })}
              onFocus={() => setActiveField({ step: i, field: "body" })}
              rows={4}
              className={inputCls + " w-full resize-y"}
            />
          </div>
        ))}
        <button type="button" onClick={addStep} className="text-xs font-medium text-sky-600 hover:text-sky-500 dark:text-sky-400">
          {F.addStep}
        </button>
      </div>

      <div>
        <p className="mb-1.5 text-xs font-medium text-faint">{F.scheduleLabel}</p>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-1">
            {DAY_LABELS.map((label, d) => (
              <button
                key={d}
                type="button"
                onClick={() => toggleDay(d)}
                className={
                  "h-7 w-7 rounded-md border text-[11px] transition-colors " +
                  (value.days.includes(d)
                    ? "border-sky-500 bg-sky-500/10 text-sky-600 dark:text-sky-300"
                    : "border-edge2 text-faint hover:border-sky-500/50")
                }
              >
                {label}
              </button>
            ))}
          </div>
          <input type="time" value={value.from} onChange={(e) => onChange({ ...value, from: e.target.value })} className={inputCls} />
          <span className="text-xs text-faint">{F.until}</span>
          <input type="time" value={value.to} onChange={(e) => onChange({ ...value, to: e.target.value })} className={inputCls} />
          <select
            value={value.timezone}
            onChange={(e) => onChange({ ...value, timezone: e.target.value })}
            className={inputCls + " w-48"}
          >
            {INSTANTLY_TIMEZONE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <input
            type="number"
            value={value.dailyLimit}
            onChange={(e) => onChange({ ...value, dailyLimit: e.target.value })}
            className={inputCls + " w-24"}
            placeholder={F.dailyLimitPlaceholder}
          />
        </div>
      </div>

      <button onClick={onSubmit} disabled={submitting} className={primaryBtnCls}>
        {submitting ? submittingLabel : submitLabel}
      </button>
    </div>
  );
}
