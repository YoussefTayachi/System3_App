"""Pipeline 4 — Personalisierung.

Lädt die Website des Leads, extrahiert den Text (trafilatura) und lässt GPT
die personalisierte Eröffnung für die Akquise-Mail schreiben
({{personalization}}-Variable). Der User kann den Stil selbst vorgeben
(workspaces.personalization_prompt); sonst gilt ein Default.
Ergebnis -> businesses.personalization.
"""
import httpx
import trafilatura
from openai import OpenAI
from tenacity import retry, stop_after_attempt, wait_exponential

from worker.db import sb
from worker.keys import get_api_key

MODEL = "gpt-4.1-mini"
MAX_SITE_CHARS = 6000

DEFAULT_STYLE = (
    "Genau EIN Satz. Konkret auf das beziehen, was dieses Unternehmen laut Website macht oder "
    "anbietet (z. B. ein spezielles Angebot, eine Besonderheit, eine Spezialisierung). "
    "Keine leeren Schmeicheleien ('tolle Website', 'beeindruckend'), keine Anrede, keine Emojis, "
    "kein Verkaufsangebot."
)


def build_system_prompt(custom_style: str | None) -> str:
    style = custom_style.strip() if custom_style and custom_style.strip() else DEFAULT_STYLE
    return (
        "Du schreibst die personalisierte Eröffnung einer Cold-E-Mail an ein Unternehmen, "
        "basierend auf dessen Website-Text. Schreibe in der Sprache, in der die Website "
        "verfasst ist, außer die Stil-Vorgaben verlangen etwas anderes.\n\n"
        f"Stil-Vorgaben des Absenders:\n{style}\n\n"
        "Antworte NUR mit dem Text selbst — keine Anführungszeichen, keine Erklärungen, "
        "kein Betreff."
    )


def fetch_website_text(url: str) -> str | None:
    r = httpx.get(
        url,
        timeout=20,
        follow_redirects=True,
        headers={"User-Agent": "Mozilla/5.0 (compatible; System3Bot/1.0)"},
    )
    r.raise_for_status()
    return trafilatura.extract(r.text)


@retry(stop=stop_after_attempt(3), wait=wait_exponential(min=5, max=60), reraise=True)
def generate_personalization(
    company_name: str, site_text: str, api_key: str, custom_style: str | None
) -> str:
    client = OpenAI(api_key=api_key)
    resp = client.responses.create(
        model=MODEL,
        input=[
            {"role": "system", "content": build_system_prompt(custom_style)},
            {
                "role": "user",
                "content": f"Unternehmen: {company_name}\n\nWebsite-Text:\n{site_text[:MAX_SITE_CHARS]}",
            },
        ],
    )
    return resp.output_text.strip().strip('"')


def run(job: dict) -> None:
    ws = job["workspace_id"]
    business_id = job["payload"]["business_id"]
    biz = sb().table("businesses").select("*").eq("id", business_id).single().execute().data
    if not biz.get("website") or biz.get("personalization"):
        return
    try:
        site_text = fetch_website_text(biz["website"])
    except httpx.HTTPError:
        return  # Website nicht erreichbar -> keine Personalisierung, kein Retry-Spam
    if not site_text or len(site_text) < 100:
        return
    workspace = (
        sb().table("workspaces").select("personalization_prompt").eq("id", ws).single().execute().data
    )
    line = generate_personalization(
        biz["name"], site_text, get_api_key(ws, "openai"), workspace.get("personalization_prompt")
    )
    sb().table("businesses").update({"personalization": line}).eq("id", business_id).execute()
