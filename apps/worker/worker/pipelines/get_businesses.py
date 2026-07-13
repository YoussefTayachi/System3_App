"""Pipeline 1 — Port von n8n 'Get_Businesses'.

1. Geocoding (location -> lat/lng)
2. Places Text Search mit Pagination (nextPageToken) bis max_results
3. Upsert in public.businesses (Dedupe via workspace_id+place_id statt Name)
4. Auto-Enrichment: enqueued find_decisionmaker + hunt_persons pro Business
"""
import httpx
from tenacity import retry, stop_after_attempt, wait_exponential

from worker.db import sb
from worker.keys import get_api_key
from worker.queue import enqueue

GEOCODE_URL = "https://maps.googleapis.com/maps/api/geocode/json"
PLACES_URL = "https://places.googleapis.com/v1/places:searchText"
FIELD_MASK = (
    "places.id,places.displayName,places.formattedAddress,places.priceLevel,"
    "places.nationalPhoneNumber,places.internationalPhoneNumber,places.websiteUri,"
    "places.rating,nextPageToken"
)


@retry(stop=stop_after_attempt(3), wait=wait_exponential(min=2, max=30), reraise=True)
def geocode(location: str, api_key: str) -> dict:
    r = httpx.get(GEOCODE_URL, params={"address": location, "key": api_key}, timeout=30)
    r.raise_for_status()
    results = r.json().get("results") or []
    if not results:
        raise ValueError(f"Geocoding ohne Treffer für '{location}'")
    return results[0]["geometry"]["location"]  # {lat, lng}


@retry(stop=stop_after_attempt(3), wait=wait_exponential(min=2, max=30), reraise=True)
def search_places_page(
    query: str, lat: float, lng: float, radius_m: int, api_key: str, page_token: str = ""
) -> dict:
    body: dict = {
        "textQuery": query,
        "locationBias": {
            "circle": {"center": {"latitude": lat, "longitude": lng}, "radius": radius_m}
        },
    }
    if page_token:
        body["pageToken"] = page_token
    r = httpx.post(
        PLACES_URL,
        json=body,
        headers={"X-Goog-Api-Key": api_key, "X-Goog-FieldMask": FIELD_MASK},
        timeout=30,
    )
    r.raise_for_status()
    return r.json()


def parse_place(p: dict) -> dict:
    return {
        "place_id": p.get("id"),
        "name": (p.get("displayName") or {}).get("text") or "NA",
        "website": p.get("websiteUri"),
        "address": p.get("formattedAddress"),
        "phone_national": p.get("nationalPhoneNumber"),
        "phone_international": p.get("internationalPhoneNumber"),
        "rating": p.get("rating"),
        "price_level": p.get("priceLevel"),
    }


def run(job: dict) -> None:
    ws = job["workspace_id"]
    search_id = job["payload"]["search_id"]
    auto_enrich = job["payload"].get("auto_enrich", True)

    search = sb().table("searches").select("*").eq("id", search_id).single().execute().data
    sb().table("searches").update({"status": "running"}).eq("id", search_id).execute()
    try:
        api_key = get_api_key(ws, "google_maps")
        loc = geocode(search["location"], api_key)
        collected, token = 0, ""
        while collected < search["max_results"]:
            data = search_places_page(
                search["query"], loc["lat"], loc["lng"], search["radius_m"], api_key, token
            )
            rows = [
                parse_place(p) | {"workspace_id": ws, "search_id": search_id}
                for p in (data.get("places") or [])[: search["max_results"] - collected]
            ]
            if rows:
                sb().table("businesses").upsert(
                    rows, on_conflict="workspace_id,place_id"
                ).execute()
                collected += len(rows)
            token = data.get("nextPageToken") or ""
            if not token:
                break
        sb().table("searches").update({"status": "completed"}).eq("id", search_id).execute()

        if auto_enrich:
            for b in (
                sb()
                .table("businesses")
                .select("id,website")
                .eq("search_id", search_id)
                .execute()
                .data
            ):
                enqueue(ws, "find_decisionmaker", {"business_id": b["id"]})
                if b.get("website"):
                    enqueue(ws, "hunt_persons", {"business_id": b["id"]})
    except Exception as exc:
        sb().table("searches").update({"status": "failed", "error": str(exc)[:1000]}).eq(
            "id", search_id
        ).execute()
        raise
