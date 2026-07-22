"""Klassifiziert eine gefundene E-Mail als 'personal' (echte Person) oder
'generic' (Rollen-Adresse wie info@/office@). Nur personenbezogene Treffer
sind fuer Cold-Outreach wirklich verwertbar -- eine generische Adresse landet
meist in einem geteilten Postfach, das niemand konsequent liest.

Zwei Quellen fuer die Einordnung:
- Hunter liefert das Feld direkt mit ('personal'/'generic' im Domain-Search-
  Response) -- wird bevorzugt, wenn vorhanden.
- Sonst per Praefix-Heuristik gegen bekannte Rollen-Postfaecher (KI-Websuche
  liefert kein eigenes type-Feld).
"""
import re

GENERIC_LOCAL_PARTS = {
    "info", "office", "contact", "kontakt", "hello", "hallo", "support",
    "admin", "administration", "sales", "vertrieb", "mail", "email", "team",
    "service", "help", "hilfe", "billing", "buchhaltung", "no-reply",
    "noreply", "webmaster", "postmaster", "enquiries", "inquiries", "general",
    "reception", "empfang", "marketing", "press", "presse", "jobs", "career",
    "careers", "bewerbung",
}


def classify_email(email: str | None, hunter_type: str | None = None) -> str | None:
    """Gibt 'personal', 'generic' oder None (unbekannt, z.B. keine E-Mail
    vorhanden) zurueck."""
    if hunter_type in ("personal", "generic"):
        return hunter_type
    if not email or "@" not in email:
        return None
    local_part = re.sub(r"[^a-z-]", "", email.split("@", 1)[0].strip().lower())
    return "generic" if local_part in GENERIC_LOCAL_PARTS else "personal"
