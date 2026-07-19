-- Mehrere Workspaces pro Account (z.B. eine Agentur mit einem Workspace pro
-- Endkunde). Die Datenisolierung ueber workspace_id + RLS (is_workspace_owner)
-- bestand technisch schon vorher, workspaces.owner_id war nie auf "genau ein
-- Workspace pro User" beschraenkt. Es fehlte nur die Moeglichkeit, explizit zu
-- waehlen, WELCHER der eigenen Workspaces gerade gemeint ist -- dashboard_stats()
-- und search_overview() haben bisher stillschweigend "irgendeinen" (limit 1)
-- angenommen. Ab jetzt wird der Workspace explizit als Parameter uebergeben.

drop function if exists public.dashboard_stats();
create or replace function public.dashboard_stats(p_workspace_id uuid)
returns jsonb language sql stable security definer set search_path = public as $$
with ws as (select p_workspace_id as id where public.is_workspace_owner(p_workspace_id))
select jsonb_build_object(
  'searches_total',      (select count(*) from public.searches s, ws where s.workspace_id = ws.id),
  'businesses_total',    (select count(*) from public.businesses b, ws where b.workspace_id = ws.id),
  'contacts_total',      (select count(*) from public.contacts c, ws where c.workspace_id = ws.id),
  'contacts_with_email', (select count(*) from public.contacts c, ws where c.workspace_id = ws.id and c.email is not null),
  'personalized',        (select count(*) from public.businesses b, ws where b.workspace_id = ws.id and b.personalization is not null),
  'emails_sent',         (select count(*) from public.messages m, ws where m.workspace_id = ws.id and m.status = 'sent'),
  'replies',             (select count(*) from public.messages m, ws where m.workspace_id = ws.id and m.direction = 'inbound'),
  'jobs_active',         (select count(*) from public.jobs j, ws where j.workspace_id = ws.id and j.status in ('pending','running')),
  'jobs_failed',         (select count(*) from public.jobs j, ws where j.workspace_id = ws.id and j.status = 'failed'),
  'jobs_geocode',        (select count(*) from public.jobs j, ws where j.workspace_id = ws.id and j.type = 'get_businesses' and j.status = 'completed'),
  'jobs_decisionmaker',  (select count(*) from public.jobs j, ws where j.workspace_id = ws.id and j.type = 'find_decisionmaker' and j.status = 'completed'),
  'jobs_personalize',    (select count(*) from public.jobs j, ws where j.workspace_id = ws.id and j.type = 'personalize' and j.status = 'completed'),
  'jobs_hunter',         (select count(*) from public.jobs j, ws where j.workspace_id = ws.id and j.type = 'hunt_persons' and j.status = 'completed'),
  'activity', (
    select coalesce(jsonb_agg(jsonb_build_object('day', to_char(d.day, 'DD.MM'), 'leads', coalesce(x.cnt, 0)) order by d.day), '[]'::jsonb)
    from generate_series(current_date - 13, current_date, interval '1 day') as d(day)
    left join (
      select c.created_at::date as day, count(*) as cnt
      from public.contacts c, ws where c.workspace_id = ws.id
      group by 1
    ) x on x.day = d.day::date
  )
);
$$;
revoke execute on function public.dashboard_stats(uuid) from public, anon;
grant execute on function public.dashboard_stats(uuid) to authenticated;

drop function if exists public.search_overview();
create or replace function public.search_overview(p_workspace_id uuid)
returns jsonb language sql stable security definer set search_path = public as $$
with ws as (select p_workspace_id as id where public.is_workspace_owner(p_workspace_id))
select coalesce(jsonb_agg(to_jsonb(t) order by t.created_at desc), '[]'::jsonb)
from (
  select s.id, coalesce(s.name, s.query) as name, s.query, s.location, s.source, s.status,
    s.max_results, s.created_at, s.schedule, s.next_run_at,
    (select count(*) from public.businesses b where b.search_id = s.id) as businesses,
    (select count(*) from public.businesses b where b.search_id = s.id
       and b.decisionmaker_status not in ('pending','running')) as businesses_done,
    (select count(*) from public.contacts c join public.businesses b on b.id = c.business_id
       where b.search_id = s.id) as contacts,
    (select count(*) from public.contacts c join public.businesses b on b.id = c.business_id
       where b.search_id = s.id and c.email is not null) as with_email
  from public.searches s, ws
  where s.workspace_id = ws.id and s.deleted_at is null
) t;
$$;
revoke execute on function public.search_overview(uuid) from public, anon;
grant execute on function public.search_overview(uuid) to authenticated;

-- Sicherheitsnetz auf DB-Ebene: der letzte verbleibende Workspace eines Accounts
-- kann nicht geloescht werden, egal ueber welchen Client/API-Pfad. Die App prueft
-- das zwar auch selbst vor dem Loeschen, aber diese Regel soll unabhaengig vom
-- Frontend gelten.
create or replace function public.prevent_delete_last_workspace()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.workspaces where owner_id = old.owner_id) <= 1 then
    raise exception 'Der letzte Workspace eines Accounts kann nicht geloescht werden.';
  end if;
  return old;
end;
$$;

drop trigger if exists trg_prevent_delete_last_workspace on public.workspaces;
create trigger trg_prevent_delete_last_workspace
  before delete on public.workspaces
  for each row execute function public.prevent_delete_last_workspace();
