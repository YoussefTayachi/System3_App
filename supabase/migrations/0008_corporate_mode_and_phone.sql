alter table public.contacts add column if not exists phone text;
alter table public.searches add column if not exists source text not null default 'maps'
  check (source in ('maps','corporate'));
alter table public.searches add column if not exists filters jsonb not null default '{}'::jsonb;
