"""Suchen anlegen -> Job 'get_businesses' in Queue."""
from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(prefix="/searches", tags=["searches"])


class SearchIn(BaseModel):
    query: str  # Nische, z.B. "restaurants"
    location: str  # z.B. "london"
    radius_m: int = 1000
    max_results: int = 100


@router.post("")
def create_search(body: SearchIn) -> dict:
    # TODO Phase 1: search-Row anlegen + Job enqueuen
    raise NotImplementedError
