-- Punkt 4 Stufe 2 aus dem Differenzierungs-Plan: Branding pro Client-Workspace +
-- ein teilbarer, oeffentlicher Report im Look des jeweiligen Endkunden der Agentur.
alter table public.workspaces
  add column if not exists brand_name text,
  add column if not exists brand_color text,
  add column if not exists brand_logo_url text;

-- Nur Aggregat-Zahlen, absichtlich KEINE einzelnen Kontakte/E-Mails/Namen --
-- diese Funktion ist bewusst fuer anonyme, nicht eingeloggte Betrachter ueber
-- einen Report-Link gedacht (Sicherheit ueber die Unraet-barkeit der UUID,
-- gleiches Prinzip wie bei den meisten "Share-Link"-Features).
create or replace function public.get_workspace_report(p_workspace_id uuid)
returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'workspace_name', w.name,
    'brand_name', w.brand_name,
    'brand_color', w.brand_color,
    'brand_logo_url', w.brand_logo_url,
    'contacts_total', (select count(*) from public.contacts c where c.workspace_id = w.id),
    'contacts_with_email', (select count(*) from public.contacts c where c.workspace_id = w.id and c.email is not null),
    'meetings_booked', (select count(*) from public.contacts c where c.workspace_id = w.id and c.outreach_status in ('meeting_booked','customer')),
    'emails_sent', coalesce((select sum(ics.emails_sent_count) from public.instantly_campaign_stats ics where ics.workspace_id = w.id), 0),
    'replies_unique', coalesce((select sum(ics.reply_count_unique) from public.instantly_campaign_stats ics where ics.workspace_id = w.id), 0),
    'opportunity_value', coalesce((select sum(ics.total_opportunity_value) from public.instantly_campaign_stats ics where ics.workspace_id = w.id), 0)
  )
  from public.workspaces w where w.id = p_workspace_id;
$$;
revoke all on function public.get_workspace_report(uuid) from public;
grant execute on function public.get_workspace_report(uuid) to anon, authenticated;
