-- Instantly SuperSearch als dritte Suchquelle neben Maps und Corporate
-- (Hunter Discover). Siehe apps/worker/worker/pipelines/instantly_search.py.
alter table public.searches drop constraint if exists searches_source_check;
alter table public.searches add constraint searches_source_check
  check (source in ('maps', 'corporate', 'instantly'));
