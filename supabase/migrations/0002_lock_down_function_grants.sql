-- handle_new_user: nur Trigger, niemals via API aufrufbar
revoke execute on function public.handle_new_user() from public, anon, authenticated;
-- is_workspace_owner: wird in RLS-Policies genutzt -> authenticated braucht EXECUTE, anon nicht
revoke execute on function public.is_workspace_owner(uuid) from public, anon;
grant execute on function public.is_workspace_owner(uuid) to authenticated;
