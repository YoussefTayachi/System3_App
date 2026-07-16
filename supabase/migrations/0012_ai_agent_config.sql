-- AI-Agent-Tab: konfigurierbare Personalisierung.
-- personalization_prompt (existiert bereits seit 0006) wird jetzt als vollstaendiger,
-- ueberschreibbarer System-Prompt genutzt statt nur als Stil-Hinweis.
alter table public.workspaces
  add column if not exists personalization_source text not null default 'company_summary'
    check (personalization_source in ('company_summary', 'website_text', 'both')),
  add column if not exists personalization_max_words integer not null default 22,
  add column if not exists personalization_banned_words text;

alter table public.businesses
  add column if not exists personalization_needs_review boolean not null default false;
