-- Leichtes CRM-Tracking pro Kontakt (Punkt 5 aus dem Differenzierungs-Plan).
-- Manuell setzbar; sobald die Instantly-Integration steht, kann "replied"
-- automatisch aus den Antwort-Daten gesetzt werden statt nur manuell.
alter table public.contacts
  add column if not exists outreach_status text not null default 'new'
    check (outreach_status in ('new', 'contacted', 'replied', 'meeting_booked', 'customer', 'not_interested'));

create index if not exists contacts_workspace_status_idx on public.contacts (workspace_id, outreach_status);
