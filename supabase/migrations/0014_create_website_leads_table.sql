-- Nachtrag: diese Migration wurde am 2026-07-18 direkt gegen die DB gefahren
-- (create_website_leads_table), ohne dass die Datei damals ins Repo kam. Wird hier
-- nachgezogen, damit Repo und Live-Schema wieder deckungsgleich sind.
-- Herkunft: Lead-Erfassung aus der (mittlerweile wieder entfernten) interaktiven
-- Icebreaker-Demo auf der Marketing-Website. Tabelle ist seit Entfernung der Demo
-- ungenutzt, bewusst nicht gedroppt.
create table if not exists public.website_leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  company_name text not null,
  company_url text,
  company_description text,
  email text not null,
  consent boolean not null default false,
  icebreaker text,
  status text not null default 'new'
);

alter table public.website_leads enable row level security;

-- Anonyme Website-Besucher duerfen einen Lead anlegen, aber nur mit erteilter
-- Einwilligung (consent = true). Kein Select/Update/Delete fuer anon oder authenticated,
-- Auswertung laeuft ueber den Service-Role-Key im Backend.
create policy website_leads_insert_anon on public.website_leads for insert
  to anon with check (consent = true);
