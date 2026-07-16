-- Firmenbeschreibung, die im bereits bestehenden find_decisionmaker-Job miterzeugt wird
-- (kein neuer Job, keine neuen Kosten -- die Websuche laeuft ohnehin).
alter table public.businesses add column if not exists company_summary text;
