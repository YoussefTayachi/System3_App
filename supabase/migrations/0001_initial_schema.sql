-- System3 initial schema: Workspaces, BYOK-Keys, Lead-Pipeline, Sending Engine, Job-Queue
create extension if not exists pgcrypto;

-- ============ Core ============
create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null default 'Mein Workspace',
  created_at timestamptz not null default now()
);

create table public.api_keys (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  provider text not null check (provider in ('google_maps','openai','hunter')),
  key_ciphertext text not null,
  created_at timestamptz not null default now(),
  unique (workspace_id, provider)
);

-- ============ Lead-Pipeline ============
create table public.searches (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  query text not null,
  location text not null,
  radius_m integer not null default 1000,
  max_results integer not null default 100,
  status text not null default 'pending' check (status in ('pending','running','completed','failed')),
  error text,
  created_at timestamptz not null default now()
);

create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  search_id uuid references public.searches(id) on delete set null,
  place_id text,
  name text not null,
  website text,
  address text,
  phone_national text,
  phone_international text,
  rating numeric,
  price_level text,
  decisionmaker_status text not null default 'pending' check (decisionmaker_status in ('pending','running','found','not_found','failed')),
  hunter_status text not null default 'pending' check (hunter_status in ('pending','running','found','not_found','failed')),
  created_at timestamptz not null default now(),
  unique (workspace_id, place_id)
);

create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  first_name text,
  last_name text,
  full_name text,
  title text,
  seniority text,
  department text,
  email text,
  email_confidence integer,
  email_verification_status text,
  linkedin text,
  twitter text,
  instagram text,
  facebook text,
  source text not null check (source in ('hunter','ai_websearch','manual')),
  personalization text,
  created_at timestamptz not null default now()
);
create index contacts_workspace_email_idx on public.contacts (workspace_id, email);

-- ============ Sending Engine ============
create table public.mailboxes (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  email text not null,
  from_name text,
  smtp_host text not null,
  smtp_port integer not null default 587,
  smtp_username text not null,
  smtp_password_ciphertext text not null,
  imap_host text,
  imap_port integer default 993,
  daily_limit integer not null default 20,
  ramp_up_increment integer not null default 5,
  ramp_up_max integer not null default 50,
  status text not null default 'active' check (status in ('active','paused','error')),
  created_at timestamptz not null default now(),
  unique (workspace_id, email)
);

create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  status text not null default 'draft' check (status in ('draft','active','paused','completed')),
  send_window_start time not null default '08:00',
  send_window_end time not null default '17:00',
  timezone text not null default 'Europe/Berlin',
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.campaign_steps (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  step_order integer not null,
  wait_days integer not null default 0,
  subject text not null,
  body text not null,
  unique (campaign_id, step_order)
);

create table public.campaign_leads (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  contact_id uuid not null references public.contacts(id) on delete cascade,
  status text not null default 'queued' check (status in ('queued','in_sequence','replied','bounced','unsubscribed','completed','failed')),
  current_step integer not null default 0,
  next_send_at timestamptz,
  unique (campaign_id, contact_id)
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  campaign_id uuid references public.campaigns(id) on delete set null,
  campaign_lead_id uuid references public.campaign_leads(id) on delete set null,
  mailbox_id uuid references public.mailboxes(id) on delete set null,
  step_order integer,
  direction text not null default 'outbound' check (direction in ('outbound','inbound')),
  status text not null default 'scheduled' check (status in ('scheduled','sent','failed','bounced','replied')),
  subject text,
  body text,
  scheduled_at timestamptz,
  sent_at timestamptz,
  smtp_message_id text,
  error text,
  created_at timestamptz not null default now()
);

create table public.suppression_list (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  email text not null,
  reason text not null check (reason in ('unsubscribed','bounced','manual','complaint')),
  created_at timestamptz not null default now(),
  unique (workspace_id, email)
);

-- ============ Job-Queue (Postgres-basiert, Worker nutzt Service-Role) ============
create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  type text not null check (type in ('get_businesses','find_decisionmaker','hunt_persons','personalize','send_batch','poll_inbox')),
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending','running','completed','failed')),
  attempts integer not null default 0,
  max_attempts integer not null default 3,
  run_at timestamptz not null default now(),
  locked_at timestamptz,
  locked_by text,
  last_error text,
  created_at timestamptz not null default now()
);
create index jobs_poll_idx on public.jobs (status, run_at) where status = 'pending';

-- ============ Audit-Log (DSGVO) ============
create table public.events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ============ RLS ============
create or replace function public.is_workspace_owner(ws uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.workspaces w where w.id = ws and w.owner_id = auth.uid());
$$;

alter table public.workspaces enable row level security;
create policy workspaces_owner on public.workspaces for all
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

alter table public.api_keys enable row level security;
create policy api_keys_owner on public.api_keys for all
  using (public.is_workspace_owner(workspace_id)) with check (public.is_workspace_owner(workspace_id));

alter table public.searches enable row level security;
create policy searches_owner on public.searches for all
  using (public.is_workspace_owner(workspace_id)) with check (public.is_workspace_owner(workspace_id));

alter table public.businesses enable row level security;
create policy businesses_owner on public.businesses for all
  using (public.is_workspace_owner(workspace_id)) with check (public.is_workspace_owner(workspace_id));

alter table public.contacts enable row level security;
create policy contacts_owner on public.contacts for all
  using (public.is_workspace_owner(workspace_id)) with check (public.is_workspace_owner(workspace_id));

alter table public.mailboxes enable row level security;
create policy mailboxes_owner on public.mailboxes for all
  using (public.is_workspace_owner(workspace_id)) with check (public.is_workspace_owner(workspace_id));

alter table public.campaigns enable row level security;
create policy campaigns_owner on public.campaigns for all
  using (public.is_workspace_owner(workspace_id)) with check (public.is_workspace_owner(workspace_id));

alter table public.campaign_steps enable row level security;
create policy campaign_steps_owner on public.campaign_steps for all
  using (exists (select 1 from public.campaigns c where c.id = campaign_id and public.is_workspace_owner(c.workspace_id)))
  with check (exists (select 1 from public.campaigns c where c.id = campaign_id and public.is_workspace_owner(c.workspace_id)));

alter table public.campaign_leads enable row level security;
create policy campaign_leads_owner on public.campaign_leads for all
  using (exists (select 1 from public.campaigns c where c.id = campaign_id and public.is_workspace_owner(c.workspace_id)))
  with check (exists (select 1 from public.campaigns c where c.id = campaign_id and public.is_workspace_owner(c.workspace_id)));

alter table public.messages enable row level security;
create policy messages_owner on public.messages for all
  using (public.is_workspace_owner(workspace_id)) with check (public.is_workspace_owner(workspace_id));

alter table public.suppression_list enable row level security;
create policy suppression_owner on public.suppression_list for all
  using (public.is_workspace_owner(workspace_id)) with check (public.is_workspace_owner(workspace_id));

alter table public.jobs enable row level security;
create policy jobs_owner_read on public.jobs for select
  using (public.is_workspace_owner(workspace_id));

alter table public.events enable row level security;
create policy events_owner_read on public.events for select
  using (public.is_workspace_owner(workspace_id));

-- Auto-Workspace bei Signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.workspaces (owner_id, name) values (new.id, 'Mein Workspace');
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();
