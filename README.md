# System3 — B2B Lead-Gen & Cold-Outreach (BYOK)

SaaS: Leads per Nische finden (Google Maps) → Decisionmaker identifizieren (OpenAI Web Search) → E-Mails finden (Hunter) → personalisierte Akquise-Mails über die eigenen Postfächer des Users versenden (eigener Sequencer, kein Instantly).

**BYOK-Prinzip:** User hinterlegt eigene API-Keys (Google Maps, OpenAI, Hunter) und eigene SMTP/IMAP-Postfächer. Keys werden serverseitig verschlüsselt (Fernet) in Supabase gespeichert.

## Struktur

```
apps/
  api/     FastAPI-Backend (REST für Frontend)
  worker/  Pipelines (get_businesses, find_decisionmaker, hunt_persons, personalize) + Sending Engine
  web/     Next.js-Frontend (Phase 4)
supabase/
  migrations/  SQL-Migrations (Source of Truth fürs Schema, via Supabase MCP/CLI applied)
docs/
  PROJEKTPLAN.md
```

## Setup (lokal)

```bash
cp .env.example .env   # Werte eintragen
cd apps/api && pip install -e ".[dev]" && uvicorn app.main:app --reload
cd apps/worker && pip install -e ".[dev]" && python -m worker.main
```

## Konventionen

- Python 3.11+, ruff (Lint+Format), pytest
- Migrations: fortlaufend nummeriert, niemals editieren, nur neue anlegen
- Secrets nur in `.env` / Deployment-Env, nie committen
