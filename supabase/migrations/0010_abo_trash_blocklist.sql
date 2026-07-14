-- Lead-Abo, benennbare Listen, Papierkorb
alter table public.searches add column if not exists name text;
alter table public.searches add column if not exists schedule text not null default 'none'
  check (schedule in ('none','daily','weekly'));
alter table public.searches add column if not exists next_run_at timestamptz;
alter table public.searches add column if not exists deleted_at timestamptz;

-- Blockliste: auch ganze Domains (Bestandskunden-Firmen) blockierbar
alter table public.suppression_list alter column email drop not null;
alter table public.suppression_list add column if not exists domain text;
alter table public.suppression_list add constraint suppression_target
  check (email is not null or domain is not null);
create unique index if not exists suppression_domain_ux
  on public.suppression_list (workspace_id, domain) where domain is not null;

-- search_overview: Namen + Abo + Papierkorb beruecksichtigen (Neudefinition siehe DB)
