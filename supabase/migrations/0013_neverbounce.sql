-- NeverBounce als vierter BYOK-Provider (E-Mail-Verifizierung, gezielt auf Anfrage
-- statt automatisch fuer jeden Fund -- schont Credits).
alter table public.api_keys drop constraint if exists api_keys_provider_check;
alter table public.api_keys add constraint api_keys_provider_check
  check (provider in ('google_maps', 'openai', 'hunter', 'neverbounce'));

alter table public.contacts add column if not exists email_verified_by text;
