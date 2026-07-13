"""Postgres-basierte Job-Queue (public.jobs).

claim_job() nutzt die DB-Funktion claim_job(p_worker) mit FOR UPDATE SKIP LOCKED,
damit mehrere Worker-Instanzen konfliktfrei parallel laufen können.
"""
import socket
from datetime import datetime, timedelta, timezone

from worker.db import sb

WORKER_ID = socket.gethostname()


def claim_job() -> dict | None:
    rows = sb().rpc("claim_job", {"p_worker": WORKER_ID}).execute().data or []
    return rows[0] if rows else None


def complete_job(job_id: str) -> None:
    sb().table("jobs").update({"status": "completed"}).eq("id", job_id).execute()


def fail_job(job: dict, error: str) -> None:
    """Retry mit quadratischem Backoff bis max_attempts, danach endgültig failed."""
    if job["attempts"] >= job["max_attempts"]:
        patch = {"status": "failed", "last_error": error[:2000]}
    else:
        delay_s = 60 * job["attempts"] ** 2
        run_at = datetime.now(timezone.utc) + timedelta(seconds=delay_s)
        patch = {"status": "pending", "last_error": error[:2000], "run_at": run_at.isoformat()}
    sb().table("jobs").update(patch).eq("id", job["id"]).execute()


def enqueue(workspace_id: str, job_type: str, payload: dict | None = None) -> None:
    sb().table("jobs").insert(
        {"workspace_id": workspace_id, "type": job_type, "payload": payload or {}}
    ).execute()
