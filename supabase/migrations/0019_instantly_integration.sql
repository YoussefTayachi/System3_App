-- Punkt 0 aus dem Differenzierungs-Plan: Instantly bleibt die Sende-Infrastruktur
-- (Warmup, Zustellbarkeit), wir holen per Polling (Growth-Plan-tauglich, kein
-- Webhook noetig, Webhooks erfordern Hypergrowth) die Ergebnisse zurueck:
-- Kampagnen-Analytics + einzelne Antworten.

-- 1. Instantly als 5. BYOK-Provider
alter table public.api_keys drop constraint if exists api_keys_provider_check;
alter table public.api_keys add constraint api_keys_provider_check
  check (provider in ('google_maps', 'openai', 'hunter', 'neverbounce', 'instantly'));

-- 2. Verknuepfung Suche/Liste <-> Instantly-Kampagne
alter table public.searches
  add column if not exists instantly_campaign_id text,
  add column if not exists instantly_last_polled_at timestamptz;

-- 3. Neuer Job-Typ fuer den periodischen Poll
alter table public.jobs drop constraint if exists jobs_type_check;
alter table public.jobs add constraint jobs_type_check
  check (type in ('get_businesses', 'find_decisionmaker', 'hunt_persons', 'personalize',
                   'send_batch', 'poll_inbox', 'poll_instantly'));

-- 4. Cache der zuletzt abgerufenen Instantly-Kampagnen-Analytics (die Next.js-Seiten
-- rufen nie live die Instantly-API auf, nur der Worker mit dem BYOK-Key tut das,
-- gleiches Muster wie bei Hunter/NeverBounce/OpenAI)
create table if not exists public.instantly_campaign_stats (
  search_id uuid primary key references public.searches(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  leads_count integer not null default 0,
  contacted_count integer not null default 0,
  emails_sent_count integer not null default 0,
  open_count integer not null default 0,
  reply_count integer not null default 0,
  reply_count_unique integer not null default 0,
  bounced_count integer not null default 0,
  unsubscribed_count integer not null default 0,
  completed_count integer not null default 0,
  total_opportunities integer not null default 0,
  total_opportunity_value numeric not null default 0,
  updated_at timestamptz not null default now()
);
alter table public.instantly_campaign_stats enable row level security;
create policy instantly_campaign_stats_owner on public.instantly_campaign_stats for all
  using (public.is_workspace_owner(workspace_id)) with check (public.is_workspace_owner(workspace_id));

-- 5. Eingehende Antworten direkt an einen Kontakt haengen (statt an die nie gebaute
-- interne Sende-Engine/campaign_leads) + Dedupe-Schluessel + Punkt-1-Klassifizierung
alter table public.messages
  add column if not exists contact_id uuid references public.contacts(id) on delete cascade,
  add column if not exists instantly_email_id text,
  add column if not exists ai_interest text check (ai_interest in ('interested', 'not_interested', 'question'));

alter table public.messages drop constraint if exists messages_status_check;
alter table public.messages add constraint messages_status_check
  check (status in ('scheduled', 'sent', 'failed', 'bounced', 'replied', 'received'));

create unique index if not exists messages_instantly_email_id_ux
  on public.messages (workspace_id, instantly_email_id) where instantly_email_id is not null;
