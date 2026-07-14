-- Alle Suchen mit Zählern und Anreicherungs-Fortschritt in einem Roundtrip
create or replace function public.search_overview()
returns jsonb language sql stable security definer set search_path = public as $$
with ws as (select id from public.workspaces where owner_id = auth.uid() limit 1)
select coalesce(jsonb_agg(to_jsonb(t) order by t.created_at desc), '[]'::jsonb)
from (
  select s.id, s.query, s.location, s.source, s.status, s.max_results, s.created_at,
    (select count(*) from public.businesses b where b.search_id = s.id) as businesses,
    (select count(*) from public.businesses b where b.search_id = s.id
       and b.decisionmaker_status not in ('pending','running')) as businesses_done,
    (select count(*) from public.contacts c join public.businesses b on b.id = c.business_id
       where b.search_id = s.id) as contacts,
    (select count(*) from public.contacts c join public.businesses b on b.id = c.business_id
       where b.search_id = s.id and c.email is not null) as with_email
  from public.searches s, ws
  where s.workspace_id = ws.id
) t;
$$;
revoke execute on function public.search_overview() from public, anon;
grant execute on function public.search_overview() to authenticated;
