"""Zugriff auf die verschlüsselten User-API-Keys."""
from worker.crypto import decrypt
from worker.db import sb


class MissingApiKey(Exception):
    """User hat für diesen Provider keinen Key hinterlegt."""


def get_api_key(workspace_id: str, provider: str) -> str:
    rows = (
        sb()
        .table("api_keys")
        .select("key_ciphertext")
        .eq("workspace_id", workspace_id)
        .eq("provider", provider)
        .execute()
        .data
    )
    if not rows:
        raise MissingApiKey(f"Kein API-Key für Provider '{provider}' hinterlegt")
    return decrypt(rows[0]["key_ciphertext"])
