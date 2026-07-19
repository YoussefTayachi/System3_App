-- Nachtrag: 2026-07-19, siehe Kommentar in 0014. Eigene, benutzerdefinierte
-- Prompt-Vorlagen im AI-Agent-Tab (bis zu 5 pro Workspace, in der UI durchgesetzt).
-- Die mitgelieferte "Thaw"-Standardvorlage lebt weiterhin in
-- workspaces.personalization_prompt (seit 0006/0012), diese Tabelle ist nur fuer
-- zusaetzliche, selbst erstellte Vorlagen.
create table if not exists public.personalization_templates (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  prompt text not null default '',
  max_words integer not null default 22,
  banned_words text not null default '',
  created_at timestamptz not null default now()
);

alter table public.personalization_templates enable row level security;
create policy personalization_templates_owner on public.personalization_templates for all
  using (public.is_workspace_owner(workspace_id)) with check (public.is_workspace_owner(workspace_id));
