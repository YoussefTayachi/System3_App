"""Pipeline 1 — Port von n8n 'Get_Businesses'.

Ablauf (wie im n8n-Workflow, verbessert):
1. Geocoding: GET maps.googleapis.com/maps/api/geocode/json (location -> lat/lng)
2. Places Text Search: POST places.googleapis.com/v1/places:searchText
   - FieldMask inkl. places.id (NEU: place_id als Dedupe-Key statt Name)
   - Pagination via nextPageToken bis max_results erreicht
3. Upsert in public.businesses (unique workspace_id+place_id)
"""


def run(job: dict) -> None:
    # TODO Phase 1
    raise NotImplementedError
