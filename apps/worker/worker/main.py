"""Worker-Entrypoint: pollt public.jobs und dispatcht an Pipelines."""
import logging
import time

from worker import queue
from worker.pipelines import find_decisionmaker, get_businesses, hunt_persons, personalize

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("worker")

HANDLERS = {
    "get_businesses": get_businesses.run,
    "find_decisionmaker": find_decisionmaker.run,
    "hunt_persons": hunt_persons.run,
    "personalize": personalize.run,
    # Phase 3: send_batch, poll_inbox
}

POLL_INTERVAL_S = 5


def main() -> None:
    log.info("Worker gestartet (%s)", queue.WORKER_ID)
    while True:
        job = queue.claim_job()
        if job is None:
            time.sleep(POLL_INTERVAL_S)
            continue
        log.info("Job %s (%s) gestartet", job["id"], job["type"])
        handler = HANDLERS.get(job["type"])
        try:
            if handler is None:
                raise ValueError(f"Unbekannter Job-Typ: {job['type']}")
            handler(job)
            queue.complete_job(job["id"])
            log.info("Job %s abgeschlossen", job["id"])
        except Exception as exc:  # noqa: BLE001
            log.exception("Job %s fehlgeschlagen", job["id"])
            queue.fail_job(job, str(exc))


if __name__ == "__main__":
    main()
