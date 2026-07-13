-- Neue Suche (aus dem Frontend) erzeugt automatisch einen get_businesses-Job
create or replace function public.enqueue_search_job()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.jobs (workspace_id, type, payload)
  values (new.workspace_id, 'get_businesses', jsonb_build_object('search_id', new.id, 'auto_enrich', true));
  return new;
end $$;
revoke execute on function public.enqueue_search_job() from public, anon, authenticated;
create trigger on_search_created after insert on public.searches
  for each row execute function public.enqueue_search_job();
