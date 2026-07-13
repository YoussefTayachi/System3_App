"""Worker-Entrypoint: pollt public.jobs und dispatcht an Pipelines."""
import time

PIPELINES = {
    "get_businesses": "worker.pipelines.get_businesses:run",
    "find_decisionmaker": "worker.pipelines.find_decisionmaker:run",
    "hunt_persons": "worker.pipelines.hunt_persons:run",
    "personalize": "worker.pipelines.personalize:run",
    # Phase 3: "send_batch", "poll_inbox"
}


def main() -> None:
    while True:
        # TODO Phase 1: job = queue.claim_job(); dispatch; ack
        time.sleep(5)


if __name__ == "__main__":
    main()
