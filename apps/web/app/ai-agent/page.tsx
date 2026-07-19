"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  DEFAULT_BANNED_WORDS,
  DEFAULT_MAX_WORDS,
  DEFAULT_PROMPT,
} from "@/lib/personalization-defaults";
import { useT } from "../language-provider";
import { useToast } from "../toast-provider";

type BusinessOption = { id: string; name: string; company_summary: string | null; website: string | null };
type TestResult = { text: string; problems: string[]; wordCount: number };
type CustomTemplate = {
  id: string;
  name: string;
  prompt: string;
  max_words: number;
  banned_words: string;
};

const MAX_CUSTOM_TEMPLATES = 5;

const inputCls =
  "rounded-lg border border-edge2 bg-field px-3.5 py-2.5 text-sm text-ink " +
  "placeholder-mute outline-none transition-colors focus:border-sky-500";
const btnCls =
  "rounded-lg bg-sky-600 px-5 py-2.5 text-sm font-medium text-white shadow-lg " +
  "shadow-sky-600/25 transition-all hover:bg-sky-500 disabled:opacity-50";
const ghostBtnCls =
  "rounded-lg border border-edge2 px-4 py-2 text-sm text-soft transition-colors " +
  "hover:border-edge3 hover:text-ink disabled:opacity-50";

export default function AiAgentPage() {
  const { t, lang } = useT();
  const { push } = useToast();
  const [wsId, setWsId] = useState<string | null>(null);
  const [systemPrompt, setSystemPrompt] = useState(DEFAULT_PROMPT);
  const [source, setSource] = useState<string>("company_summary");
  const [maxWords, setMaxWords] = useState(DEFAULT_MAX_WORDS);
  const [bannedWordsText, setBannedWordsText] = useState(DEFAULT_BANNED_WORDS.join(", "));

  const [customTemplates, setCustomTemplates] = useState<CustomTemplate[]>([]);
  const [addingTemplate, setAddingTemplate] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState("");
  const [savingTemplate, setSavingTemplate] = useState(false);

  const [businesses, setBusinesses] = useState<BusinessOption[]>([]);
  const [testBusinessId, setTestBusinessId] = useState("");
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [testStatus, setTestStatus] = useState("");

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("workspaces")
      .select(
        "id, personalization_prompt, personalization_source, personalization_max_words, personalization_banned_words"
      )
      .limit(1)
      .single()
      .then(({ data }) => {
        if (!data) return;
        setWsId(data.id);
        setSystemPrompt(data.personalization_prompt || DEFAULT_PROMPT);
        setSource(data.personalization_source || "company_summary");
        setMaxWords(data.personalization_max_words || DEFAULT_MAX_WORDS);
        setBannedWordsText(data.personalization_banned_words || DEFAULT_BANNED_WORDS.join(", "));
      });
    supabase
      .from("businesses")
      .select("id, name, company_summary, website")
      .or("company_summary.not.is.null,website.not.is.null")
      .order("created_at", { ascending: false })
      .limit(100)
      .then(({ data }) => setBusinesses(data ?? []));
    loadTemplates();
  }, []);

  async function loadTemplates() {
    const supabase = createClient();
    const { data } = await supabase
      .from("personalization_templates")
      .select("id, name, prompt, max_words, banned_words")
      .order("created_at", { ascending: true });
    setCustomTemplates(data ?? []);
  }

  function resetToDefault() {
    setSystemPrompt(DEFAULT_PROMPT);
    setMaxWords(DEFAULT_MAX_WORDS);
    setBannedWordsText(DEFAULT_BANNED_WORDS.join(", "));
  }

  function applyCustomTemplate(tpl: CustomTemplate) {
    setSystemPrompt(tpl.prompt);
    setMaxWords(tpl.max_words);
    setBannedWordsText(tpl.banned_words);
  }

  const matchedCustom = customTemplates.find((tpl) => tpl.prompt.trim() === systemPrompt.trim());
  const activeTemplateId =
    systemPrompt.trim() === DEFAULT_PROMPT.trim() ? "default" : matchedCustom?.id ?? "custom";

  async function saveNewTemplate() {
    if (!wsId || !newTemplateName.trim() || customTemplates.length >= MAX_CUSTOM_TEMPLATES) return;
    setSavingTemplate(true);
    const supabase = createClient();
    const { error } = await supabase.from("personalization_templates").insert({
      workspace_id: wsId,
      name: newTemplateName.trim(),
      prompt: systemPrompt.trim(),
      max_words: maxWords,
      banned_words: bannedWordsText.trim(),
    });
    setSavingTemplate(false);
    if (error) {
      push(t.common.error + error.message, "error");
      return;
    }
    setNewTemplateName("");
    setAddingTemplate(false);
    push(t.aiAgent.templateSaved, "success");
    loadTemplates();
  }

  async function deleteTemplate(id: string, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const supabase = createClient();
    const { error } = await supabase.from("personalization_templates").delete().eq("id", id);
    if (error) {
      push(t.common.error + error.message, "error");
      return;
    }
    push(t.aiAgent.templateDeleted, "success");
    loadTemplates();
  }

  async function save() {
    if (!wsId) return;
    const supabase = createClient();
    const { error } = await supabase
      .from("workspaces")
      .update({
        personalization_prompt: systemPrompt.trim() === DEFAULT_PROMPT.trim() ? null : systemPrompt.trim(),
        personalization_source: source,
        personalization_max_words: maxWords,
        personalization_banned_words:
          bannedWordsText.trim() === DEFAULT_BANNED_WORDS.join(", ") ? null : bannedWordsText.trim(),
      })
      .eq("id", wsId);
    push(error ? t.common.error + error.message : t.common.savedOk, error ? "error" : "success");
  }

  async function runTest() {
    if (!testBusinessId) return;
    setTestStatus(t.common.saving);
    setTestResult(null);
    const res = await fetch("/api/personalize-test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        business_id: testBusinessId,
        system_prompt: systemPrompt,
        source,
        max_words: maxWords,
        banned_words: bannedWordsText.split(",").map((w) => w.trim()).filter(Boolean),
        lang,
      }),
    });
    const body = await res.json();
    setTestStatus("");
    if (!res.ok) {
      setTestStatus(t.common.error + (body.error ?? res.status));
      return;
    }
    setTestResult(body);
  }

  const selectedBusiness = businesses.find((b) => b.id === testBusinessId);

  return (
    <div className="fade-up max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">{t.aiAgent.title}</h1>
        <p className="text-sm text-faint">{t.aiAgent.subtitle}</p>
      </div>

      <div className="rounded-lg border border-edge/60 bg-panel p-6">
        <h2 className="mb-1 font-medium text-ink">{t.aiAgent.sourceHeading}</h2>
        <p className="mb-3 text-sm text-faint">{t.aiAgent.sourceSubtitle}</p>
        <div className="grid gap-2 sm:grid-cols-3">
          {t.aiAgent.sourceOptions.map((opt) => (
            <label
              key={opt.value}
              className={
                "cursor-pointer rounded-lg border p-3 text-sm transition-colors " +
                (source === opt.value
                  ? "border-sky-500/60 bg-sky-500/5"
                  : "border-edge2 hover:border-edge3")
              }
            >
              <div className="flex items-center gap-2">
                <input
                  type="radio"
                  name="source"
                  checked={source === opt.value}
                  onChange={() => setSource(opt.value)}
                  className="h-3.5 w-3.5 accent-sky-500"
                />
                <span className="font-medium text-ink">{opt.label}</span>
              </div>
              <p className="mt-1 text-xs text-faint">{opt.hint}</p>
            </label>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-edge/60 bg-panel p-6">
        <h2 className="mb-1 font-medium text-ink">{t.aiAgent.templateHeading}</h2>
        <p className="mb-3 text-sm text-faint">{t.aiAgent.templateSubtitle}</p>
        <div className="grid gap-2 sm:grid-cols-3">
          <label
            className={
              "cursor-pointer rounded-lg border p-3 text-sm transition-colors " +
              (activeTemplateId === "default"
                ? "border-sky-500/60 bg-sky-500/5"
                : "border-edge2 hover:border-edge3")
            }
          >
            <div className="flex items-center gap-2">
              <input
                type="radio"
                name="template"
                checked={activeTemplateId === "default"}
                onChange={resetToDefault}
                className="h-3.5 w-3.5 accent-sky-500"
              />
              <span className="font-medium text-ink">{t.aiAgent.thawTemplateLabel}</span>
              <span className="rounded-full bg-sky-500/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-sky-600 dark:text-sky-400">
                {t.aiAgent.thawTemplateBadge}
              </span>
            </div>
            <p className="mt-1 text-xs text-faint">{t.aiAgent.thawTemplateHint}</p>
          </label>

          {customTemplates.map((tpl) => (
            <label
              key={tpl.id}
              className={
                "group relative cursor-pointer rounded-lg border p-3 text-sm transition-colors " +
                (activeTemplateId === tpl.id
                  ? "border-sky-500/60 bg-sky-500/5"
                  : "border-edge2 hover:border-edge3")
              }
            >
              <div className="flex items-center gap-2">
                <input
                  type="radio"
                  name="template"
                  checked={activeTemplateId === tpl.id}
                  onChange={() => applyCustomTemplate(tpl)}
                  className="h-3.5 w-3.5 accent-sky-500"
                />
                <span className="truncate font-medium text-ink">{tpl.name}</span>
              </div>
              <button
                type="button"
                onClick={(e) => deleteTemplate(tpl.id, e)}
                className="absolute right-2 top-2 hidden text-faint hover:text-red-500 group-hover:block"
                aria-label={t.common.delete}
              >
                ✕
              </button>
            </label>
          ))}

          {customTemplates.length < MAX_CUSTOM_TEMPLATES &&
            (addingTemplate ? (
              <div className="rounded-lg border border-sky-500/60 bg-sky-500/5 p-3 text-sm">
                <input
                  autoFocus
                  value={newTemplateName}
                  onChange={(e) => setNewTemplateName(e.target.value)}
                  placeholder={t.aiAgent.newTemplateNamePlaceholder}
                  className="w-full rounded-md border border-edge2 bg-field px-2 py-1.5 text-sm text-ink outline-none focus:border-sky-500"
                />
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={saveNewTemplate}
                    disabled={!newTemplateName.trim() || savingTemplate}
                    className="rounded-md bg-sky-600 px-2.5 py-1 text-xs font-medium text-white disabled:opacity-50"
                  >
                    {t.common.save}
                  </button>
                  <button
                    onClick={() => {
                      setAddingTemplate(false);
                      setNewTemplateName("");
                    }}
                    className="rounded-md border border-edge2 px-2.5 py-1 text-xs text-soft hover:text-ink"
                  >
                    {t.aiAgent.cancel}
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setAddingTemplate(true)}
                className="flex items-center justify-center rounded-lg border border-dashed border-edge3 p-3 text-sm text-faint transition-colors hover:border-sky-500/60 hover:text-sky-600"
              >
                + {t.aiAgent.newTemplate}
              </button>
            ))}
        </div>
      </div>

      <div className="rounded-lg border border-edge/60 bg-panel p-6">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="font-medium text-ink">{t.aiAgent.promptHeading}</h2>
          <button onClick={resetToDefault} className="text-xs text-faint hover:text-ink">
            {t.aiAgent.resetToDefault}
          </button>
        </div>
        <p className="mb-3 text-sm text-faint">{t.aiAgent.promptDescription}</p>
        <textarea
          value={systemPrompt}
          onChange={(e) => setSystemPrompt(e.target.value)}
          rows={14}
          className={inputCls + " w-full resize-y font-mono text-[13px] leading-relaxed"}
        />

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-faint">{t.aiAgent.maxWords}</label>
            <input
              type="number"
              min={5}
              max={100}
              value={maxWords}
              onChange={(e) => setMaxWords(Number(e.target.value) || DEFAULT_MAX_WORDS)}
              className={inputCls + " w-28"}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-faint">{t.aiAgent.bannedWords}</label>
            <input
              value={bannedWordsText}
              onChange={(e) => setBannedWordsText(e.target.value)}
              className={inputCls + " w-full"}
            />
          </div>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <button onClick={save} className={btnCls}>{t.aiAgent.save}</button>
          {activeTemplateId === "custom" && customTemplates.length < MAX_CUSTOM_TEMPLATES && !addingTemplate && (
            <button onClick={() => setAddingTemplate(true)} className={ghostBtnCls}>
              {t.aiAgent.saveAsTemplate}
            </button>
          )}
        </div>
      </div>

      <div className="rounded-lg border border-edge/60 bg-panel p-6">
        <h2 className="mb-1 font-medium text-ink">{t.aiAgent.liveTestHeading}</h2>
        <p className="mb-3 text-sm text-faint">{t.aiAgent.liveTestDescription}</p>
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={testBusinessId}
            onChange={(e) => setTestBusinessId(e.target.value)}
            className={inputCls + " min-w-64"}
          >
            <option value="">{t.aiAgent.chooseBusiness}</option>
            {businesses.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
          <button onClick={runTest} disabled={!testBusinessId} className={ghostBtnCls}>
            {t.aiAgent.test}
          </button>
          {testStatus && <span className="text-xs text-faint">{testStatus}</span>}
        </div>

        {selectedBusiness?.company_summary && (
          <p className="mt-3 text-xs leading-relaxed text-faint">
            <span className="font-medium text-soft">{t.aiAgent.companySummaryPrefix}</span>
            {selectedBusiness.company_summary}
          </p>
        )}

        {testResult && (
          <div className="lock-pop mt-4 rounded-lg border-l-2 border-sky-500/50 bg-sky-500/5 p-4">
            <p className="text-sm italic leading-relaxed text-ink">{testResult.text}</p>
            <div className="mt-2 flex items-center gap-2 text-xs">
              <span className="text-faint">{testResult.wordCount} {t.aiAgent.words}</span>
              {testResult.problems.length === 0 ? (
                <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-emerald-600 dark:text-emerald-300">
                  {t.aiAgent.rulesFollowed}
                </span>
              ) : (
                <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-amber-700 dark:text-amber-300">
                  {testResult.problems.join(" · ")}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
