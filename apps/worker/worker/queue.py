"""Postgres-basierte Job-Queue (Tabelle public.jobs, Zugriff via Service-Role).

Polling mit SKIP-LOCKED-Semantik: Job auf 'running' setzen, ausführen,
'completed'/'failed' + Retry mit Backoff (max_attempts).
"""
# TODO Phase 1: claim_job(), complete_job(), fail_job()
