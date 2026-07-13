"""Pipeline 3 — Port von n8n 'Hunt_Persons'.

- Hunter Domain-Search (department=executive,management, limit 5)
- NEU: verification.status == 'invalid' wird NICHT uebernommen (n8n speicherte alles)
- confidence + verification_status -> public.contacts (source='hunter')
"""


def run(job: dict) -> None:
    # TODO Phase 1
    raise NotImplementedError
