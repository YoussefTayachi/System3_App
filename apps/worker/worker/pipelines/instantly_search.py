"""Instantly-Modus — Firmen per Instantly SuperSearch finden, ohne Credits.

Filter: Jobtitel, Standort, Branche, Firmengroesse, Keywords. Instantly stellt
dafuer einen eigenen "search before enrich"-Endpunkt bereit: Leads werden in
eine neue Lead-Liste importiert, OHNE dass eine Email-/Profil-Enrichment
aktiviert wird -- das kostet laut Instantlys eigener Credit-Doku 0 Credits,
Credits fallen erst bei work_email_enrichment/fully_enriched_profile an, die
hier bewusst deaktiviert bleiben (siehe _create_search_list).
Docs: https://developer.instantly.ai/api/v2/supersearchenrichment

Hinweis: Instantly liefert hier bereits einzelne Personen (Name, Titel) statt
nur Firmen, anders als Hunter Discover (discover.py). Wir werten trotzdem nur
company_name/company_domain aus und behandeln den Treffer wie im Corporate-
Modus als Firmen-Fund -- find_decisionmaker (OpenAI) sucht die Kontaktperson
danach unabhaengig und kostenlos (siehe get_businesses._finish). Das verschenkt
kurzfristig die von Instantly schon gefundene Person, ist aber deutlich
robuster: company_name/company_domain sind im Lead-Schema von Instantly
dokumentiert, die genauen Feldnamen fuer Jobtitel/LinkedIn-URL bei SuperSearch-
Treffern sind es (Stand jetzt) nicht. Sobald das an einem echten Account
verifiziert ist, laesst sich hier leicht ein direkter Personen-Pfad ergaenzen.
"""
import httpx
from tenacity import retry, retry_if_result, stop_after_attempt, wait_exponential

BASE_URL = "https://api.instantly.ai"
SEARCH_URL = f"{BASE_URL}/api/v2/supersearch-enrichment/enrich-leads-from-supersearch"
STATUS_URL = f"{BASE_URL}/api/v2/supersearch-enrichment"
LEADS_LIST_URL = f"{BASE_URL}/api/v2/leads/list"

# Instantlys Firmengroessen-Buckets sind fest vorgegebene Enum-Werte und decken
# sich nicht mit Hunters Buckets (siehe new-search-form.tsx HEADCOUNTS). Wir
# nutzen im Frontend bewusst dieselbe Hunter-Bucket-Liste fuer beide Quellen
# (ein Formular statt zwei), hier wird auf den naechstliegenden Instantly-
# Bucket gemappt.
HEADCOUNT_MAP = {
    "1-10": "0 - 25",
    "11-50": "25 - 100",
    "51-200": "100 - 250",
    "201-500": "250 - 1000",
    "501-1000": "250 - 1000",
    "1001-5000": "1K - 10K",
    "5001-10000": "1K - 10K",
    "10001+": "10K - 50K",
}


def _headers(api_key: str) -> dict:
    return {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}


def _raise_for_status_verbose(r: httpx.Response) -> None:
    """httpx.raise_for_status() haengt den Response-Body nicht an die
    Exception-Message an -- ohne das ist ein 400 von Instantly nicht
    diagnostizierbar (landet nur als 'Client error 400 Bad Request' in
    searches.error). Instantly liefert bei Validierungsfehlern i.d.R. eine
    JSON-Fehlermeldung im Body, die haengen wir an."""
    if r.is_success:
        return
    detail = r.text[:500]
    raise httpx.HTTPStatusError(
        f"{r.status_code} {r.reason_phrase} for url '{r.url}': {detail}",
        request=r.request,
        response=r,
    )


def build_search_filters(filters: dict) -> dict:
    """Erzeugt search_filters aus unseren unified Such-Filtern (pure, testbar).

    'locations' folgt dem Legacy-Array-Format, das Instantlys Doku fuer diesen
    Filter explizit als gueltig beschreibt. 'industry' und 'keyword_filter' sind
    in der oeffentlichen API-Doku nur als 'object' ohne Feldliste dokumentiert;
    das include/match-Muster hier ist die naheliegendste konsistente Lesart
    (siehe Modul-Docstring) und sollte vor produktivem Grosseinsatz einmal
    gegen einen echten Account verifiziert werden.
    """
    sf: dict = {}
    location: dict = {}
    if filters.get("city"):
        location["city"] = filters["city"]
    if filters.get("country"):
        location["country"] = filters["country"]
    if location:
        sf["locations"] = {"include": [location]}
    if filters.get("industry"):
        sf["industry"] = {"include": [filters["industry"]]}
    if filters.get("headcount"):
        bucket = HEADCOUNT_MAP.get(filters["headcount"])
        if bucket:
            sf["employee_count"] = [bucket]
    if filters.get("keywords"):
        kw = [k.strip() for k in str(filters["keywords"]).split(",") if k.strip()]
        if kw:
            sf["keyword_filter"] = {"include": kw, "match": "any"}
    if filters.get("job_title"):
        sf["title"] = {"include": [filters["job_title"]]}
    if not sf:
        raise ValueError("Instantly-Suche braucht mindestens einen Filter")
    return sf


@retry(stop=stop_after_attempt(3), wait=wait_exponential(min=2, max=30), reraise=True)
def _create_search_list(search_filters: dict, api_key: str, limit: int) -> str:
    body = {
        "search_filters": search_filters,
        "resource_type": 2,  # 2 = Liste (nicht an eine Kampagne haengen)
        "list_name": f"Frostbreaker Suche ({limit} Leads)",
        "limit": limit,
        # Der eigentliche Punkt dieser Pipeline: nur die kostenlose Suche
        # ausfuehren, keine kostenpflichtige Email-/Profil-Anreicherung.
        "work_email_enrichment": False,
        "fully_enriched_profile": False,
        "skip_rows_without_email": False,
    }
    r = httpx.post(SEARCH_URL, json=body, headers=_headers(api_key), timeout=30)
    _raise_for_status_verbose(r)
    return r.json()["resource_id"]


def _still_in_progress(payload: dict) -> bool:
    return bool(payload.get("in_progress"))


@retry(
    stop=stop_after_attempt(15),
    wait=wait_exponential(min=2, max=15),
    retry=retry_if_result(_still_in_progress),
)
def _poll_import_status(resource_id: str, api_key: str) -> dict:
    r = httpx.get(f"{STATUS_URL}/{resource_id}", headers=_headers(api_key), timeout=30)
    _raise_for_status_verbose(r)
    return r.json()


def _wait_for_import(resource_id: str, api_key: str) -> None:
    """Wartet best effort auf den Such-Import (max. ~2 Minuten). Laeuft die Zeit
    ab, wird trotzdem mit den bis dahin importierten Leads weitergemacht statt
    hart zu scheitern -- eine leere/kleinere Trefferliste ist kein Fehlerfall."""
    try:
        _poll_import_status(resource_id, api_key)
    except Exception:
        pass


@retry(stop=stop_after_attempt(3), wait=wait_exponential(min=2, max=30), reraise=True)
def _list_leads(resource_id: str, api_key: str, limit: int) -> list[dict]:
    body = {"filter": {"list_id": resource_id}, "limit": min(limit, 100)}
    r = httpx.post(LEADS_LIST_URL, json=body, headers=_headers(api_key), timeout=30)
    _raise_for_status_verbose(r)
    return r.json().get("items") or []


def parse_instantly_company(lead: dict) -> dict:
    domain = lead.get("company_domain")
    website = lead.get("website") or (f"https://{domain}" if domain else None)
    return {
        "place_id": None,
        "name": lead.get("company_name") or domain or "NA",
        "website": website,
    }


def discover_instantly_leads(filters: dict, api_key: str, limit: int) -> list[dict]:
    search_filters = build_search_filters(filters)
    resource_id = _create_search_list(search_filters, api_key, limit)
    _wait_for_import(resource_id, api_key)
    return _list_leads(resource_id, api_key, limit)
