-- Nachtrag: 2026-07-18, siehe Kommentar in 0014. RPC fuer eine privatsphaerenfreundliche
-- Rate-Limit-Pruefung (Frontend darf nicht direkt in website_leads lesen, aber muss
-- pruefen koennen, ob dieselbe E-Mail kuerzlich schon einen Lead angelegt hat).
create or replace function public.count_recent_website_leads(p_email text)
returns integer
language sql
security definer
set search_path to 'public'
as $$
  select count(*)::int from public.website_leads
  where email = p_email and created_at > now() - interval '24 hours';
$$;

revoke execute on function public.count_recent_website_leads(text) from public;
grant execute on function public.count_recent_website_leads(text) to anon, authenticated;
