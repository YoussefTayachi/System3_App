"""Blockliste: E-Mails und Domains, die nie kontaktiert/angezeigt werden sollen."""
from urllib.parse import urlparse

from worker.db import sb


def load_suppression(workspace_id: str) -> tuple[set[str], set[str]]:
    """Gibt (emails, domains) der Blockliste zurück, alles lowercase."""
    rows = (
        sb()
        .table("suppression_list")
        .select("email,domain")
        .eq("workspace_id", workspace_id)
        .execute()
        .data
    )
    emails = {r["email"].lower() for r in rows if r.get("email")}
    domains = {r["domain"].lower() for r in rows if r.get("domain")}
    return emails, domains


def domain_of(url_or_email: str | None) -> str | None:
    if not url_or_email:
        return None
    s = url_or_email.strip().lower()
    if "@" in s:
        return s.rsplit("@", 1)[1]
    netloc = urlparse(s if "//" in s else f"https://{s}").netloc
    return netloc.removeprefix("www.") or None


def is_suppressed(
    emails: set[str], domains: set[str], email: str | None = None, website: str | None = None
) -> bool:
    if email:
        e = email.strip().lower()
        if e in emails:
            return True
        d = domain_of(e)
        if d and d in domains:
            return True
    if website:
        d = domain_of(website)
        if d and d in domains:
            return True
    return False
