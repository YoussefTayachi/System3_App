from fastapi import FastAPI

from app.routers import keys, searches

app = FastAPI(title="Thaw API", version="0.1.0")
app.include_router(keys.router)
app.include_router(searches.router)


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}
