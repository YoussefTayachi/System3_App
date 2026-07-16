"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  DEFAULT_BANNED_WORDS,
  DEFAULT_MAX_WORDS,
  DEFAULT_PROMPT,
} from "@/lib/personalization-defaults";
import { useT } from "../language-provider";

type BusinessOption = { id: string; name: string; company_summary: string | null; website: string | null };
type TestResult = { text: string; problems: string[]; wordCount: number };

const inputCls =
  "rounded-lg border border-edge2 bg-field px-3.5 py-2.5 text-sm text-ink " +
  "placeholder-mute outline-none transition-colors focus:border-indigo-500";
const btnCls =
  "rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white shadow-lg " +
  "shadow-indigo-600/25 transition-all hover:bg-indigo-500 disabled:opacity-50";
const ghostBtnCls =
  "rounded-lg border border-edge2 px-4 py-2 text-sm text-soft transition-colors " +
  "hover:border-edge3 hover:text-ink disabled:opacity-50";

export default function AiAgentPage() {
  const { t, lang } = useT();
  const [wsId, setWsId] = useState<string | null>(null);
  const [systemPrompt, setSystemPrompt] = useState(DEFAULT_PROMPT);
  const [source, setSource] = useState<string>("company_summary");
  const [maxWords, setMaxWords] = useState(DEFAULT_MAX_WORDS);
  const [bannedWordsText, setBannedWordsText] = useState(DEFAULT_BANNED_WORDS.join(", "));
  const [saveStatus, setSaveStatus] = useState("");

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
  }, []);

  function resetToDefault() {
    setSystemPrompt(DEFAULT_PROMPT);
    setMaxWords(DEFAULT_MAX_WORDS);
    setBannedWordsText(DEFAULT_BANNED_WORDS.join(", "));
  }

  async function save() {
    if (!wsId) return;
    setSaveStatus(t.common.saving);
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
    setSaveStatus(error ? t.common.error + error.message : t.common.savedOk);
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
                  ? "border-indigo-500/60 bg-indigo-500/5"
                  : "border-edge2 hover:border-edge3")
              }
            >
              <div className="flex items-center gap-2">
                <input
                  type="radio"
                  name="source"
                  checked={source === opt.value}
                  onChange={() => setSource(opt.value)}
                  className="h-3.5 w-3.5 accent-indigo-500"
                />
                <span className="font-medium text-ink">{opt.label}</span>
              </div>
              <p className="mt-1 text-xs text-faint">{opt.hint}</p>
            </label>
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
          {saveStatus && <span className="text-xs text-faint">{saveStatus}</span>}
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
          <div className="lock-pop mt-4 rounded-lg border-l-2 border-indigo-500/50 bg-indigo-500/5 p-4">
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
