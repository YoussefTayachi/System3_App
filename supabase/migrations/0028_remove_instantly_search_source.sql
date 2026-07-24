-- Instantly SuperSearch als Suchquelle wieder entfernt: Instantlys "search
-- before enrich"-API verlangt zwingend mind. einen aktivierten (kostenpflichtigen)
-- Enrichment-Typ, ein echter kostenloser API-Weg existiert nicht (siehe
-- Rueckbau in get_businesses.py / new-search-form.tsx). Hunter Discover
-- (source='corporate') bleibt als echte Gratis-Datenbankquelle bestehen.
alter table public.searches drop constraint if exists searches_source_check;
alter table public.searches add constraint searches_source_check
  check (source in ('maps', 'corporate'));
