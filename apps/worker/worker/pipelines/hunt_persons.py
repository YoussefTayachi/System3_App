"""Pipeline 3 — Port von n8n 'Hunt_Persons'.

Hunter Domain-Search (executive/management, limit 5).
Verbesserung ggü. n8n: E-Mails mit verification.status == 'invalid' werden verworfen.
"""
from urllib.parse import urlparse

import httpx
from tenacity import retry, stop_after_attempt, wait_exponential

from worker.db import sb
from worker.keys import get_api_key

HUNTER_URL = "https://api.hunter.io/v2/domain-search"


def extract_domain(url: str) -> str:
    netloc = urlparse(url if "//" in url else f"https://{url}").netloc
    return netloc.removeprefix("www.")


def parse_hunter_emails(payload: dict) -> list[dict]:
    out = []
    for e in payload.get("data", {}).get("emails", []):
        if (e.get("verification") or {}).get("status") == "invalid":
            continue
        out.append(
            {
                "first_name": e.get("first_name"),
                "last_name": e.get("last_name"),
                "full_name": " ".join(filter(None, [e.get("first_name"), e.get("last_name")]))
                or None,
                "title": e.get("position"),
                "seniority": e.get("seniority"),
                "department": e.get("department"),
                "email": e.get("value"),
                "email_confidence": e.get("confidence"),
                "email_verification_status": (e.get("verification") or {}).get("status"),
                "phone": e.get("phone_number"),
                "linkedin": e.get("linkedin"),
                "twitter": e.get("twitter"),
                "source": "hunter",
            }
        )
    return out


@retry(stop=stop_after_attempt(3), wait=wait_exponential(min=2, max=30), reraise=True)
def domain_search(domain: str, api_key: str) -> dict:
    r = httpx.get(
        HUNTER_URL,
        params={
            "domain": domain,
            "limit": 5,
            "department": "executive,management",
            "api_key": api_key,
        },
        timeout=30,
    )
    r.raise_for_status()
    return r.json()


def run(job: dict) -> None:
    ws = job["workspace_id"]
    business_id = job["payload"]["business_id"]
    biz = sb().table("businesses").select("*").eq("id", business_id).single().execute().data

    def set_status(status: str) -> None:
        sb().table("businesses").update({"hunter_status": status}).eq("id", business_id).execute()

    if not biz.get("website"):
        set_status("not_found")
        return
    set_status("running")
    try:
        payload = domain_search(extract_domain(biz["website"]), get_api_key(ws, "hunter"))
        contacts = [
            c | {"workspace_id": ws, "business_id": business_id}
            for c in parse_hunter_emails(payload)
        ]
        if contacts:
            sb().table("contacts").insert(contacts).execute()
            set_status("found")
        else:
            set_status("not_found")
    except Exception:
        set_status("failed")
        raise
