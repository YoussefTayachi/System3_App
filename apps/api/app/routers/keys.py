"""BYOK: User-API-Keys verschlüsselt speichern. (Phase 1: Auth-Dependency ergänzen)"""
from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(prefix="/keys", tags=["keys"])


class ApiKeyIn(BaseModel):
    provider: str  # google_maps | openai | hunter
    key: str


@router.put("")
def upsert_key(body: ApiKeyIn) -> dict:
    # TODO Phase 1: workspace aus JWT, encrypt(body.key) -> api_keys upsert
    raise NotImplementedError
