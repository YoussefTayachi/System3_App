"""Pipeline 2 — Port von n8n 'Find_Decisionmaker'.

Verbesserungen ggü. n8n:
- OpenAI Responses API mit web_search-Tool UND Structured Output (JSON Schema)
  -> kein '```json'-Prompt-Parsing, kein Switch/Stop-and-Error mehr noetig
- Rate-Limit/Retry via tenacity statt Wait-Nodes
- Ergebnis -> public.contacts (source='ai_websearch'), Status am Business
"""


def run(job: dict) -> None:
    # TODO Phase 1
    raise NotImplementedError
