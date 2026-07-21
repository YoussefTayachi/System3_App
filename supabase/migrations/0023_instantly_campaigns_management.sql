-- Repurpose the never-used in-house sequencer tables (campaigns/campaign_steps/
-- campaign_leads, siehe 0001_initial_schema.sql -- schon frueh durch die native
-- Instantly-Integration ersetzt, siehe Kommentar in 0019_instantly_integration.sql)
-- als lokaler Spiegel fuer Instantly-Kampagnen, statt ein Parallel-Schema
-- aufzubauen. Instantly bleibt die Quelle der Wahrheit fuer den tatsaechlichen
-- Sende-Status; diese Zeilen sind das, was die eigene Kampagnen-UI (Liste,
-- Bearbeiten, Pause/Resume, "weitere Leads hinzufuegen") liest/schreibt, ohne
-- bei jedem Seitenaufruf gegen Instantly zu muessen. searches.instantly_campaign_id
-- bleibt unveraendert bestehen (poll_instantly.py liest ausschliesslich das),
-- campaigns.instantly_campaign_id ist der App-seitige Zwilling davon.

alter table public.campaigns
  add column if not exists instantly_campaign_id text,
  add column if not exists search_id uuid references public.searches(id) on delete set null,
  add column if not exists mailboxes text[] not null default '{}',
  add column if not exists days smallint[] not null default '{1,2,3,4,5}',
  add column if not exists daily_limit integer,
  add column if not exists activated_at timestamptz;

create unique index if not exists campaigns_instantly_campaign_id_ux
  on public.campaigns (instantly_campaign_id) where instantly_campaign_id is not null;

create index if not exists campaigns_search_id_idx on public.campaigns (search_id);

-- 'error' zusaetzlich zulassen, damit Instantlys negative Status-Codes (Account
-- Suspended / Accounts Unhealthy / Bounce Protect) nicht faelschlich als
-- "paused" dargestellt werden muessen.
alter table public.campaigns drop constraint if exists campaigns_status_check;
alter table public.campaigns add constraint campaigns_status_check
  check (status in ('draft','active','paused','completed','error'));

comment on table public.campaigns is 'Lokaler Spiegel von Instantly-Kampagnen (siehe lib/instantly/campaigns.ts). Nicht die interne Sende-Engine -- die wurde nie gebaut, Instantly versendet.';
comment on column public.campaigns.instantly_campaign_id is 'ID der zugehoerigen Kampagne in Instantly. Quelle der Wahrheit fuer Sende-Status bleibt Instantly selbst.';
comment on table public.campaign_leads is 'Tracking, welche Kontakte bereits zu einer Kampagne hinzugefuegt wurden (idempotenz fuer "weitere Leads nachreichen"). status/current_step/next_send_at sind Reste der nie gebauten eigenen Sende-Engine und werden fuer Instantly-Kampagnen nicht gepflegt.';
