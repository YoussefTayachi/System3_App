-- Atomarer Job-Claim für den Worker (SKIP LOCKED, nur Service-Role)
create or replace function public.claim_job(p_worker text)
returns setof public.jobs
language plpgsql security definer set search_path = public as $$
declare j_id uuid;
begin
  select id into j_id from public.jobs
   where status = 'pending' and run_at <= now()
   order by run_at
   for update skip locked
   limit 1;
  if j_id is null then return; end if;
  update public.jobs
     set status = 'running', locked_at = now(), locked_by = p_worker, attempts = attempts + 1
   where id = j_id;
  return query select * from public.jobs where id = j_id;
end $$;
revoke execute on function public.claim_job(text) from public, anon, authenticated;
