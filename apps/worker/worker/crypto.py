"""Ver-/Entschlüsselung der BYOK-Keys (Fernet)."""
from cryptography.fernet import Fernet

from worker.config import get_settings


def _fernet() -> Fernet:
    return Fernet(get_settings().app_encryption_key.encode())


def encrypt(plaintext: str) -> str:
    return _fernet().encrypt(plaintext.encode()).decode()


def decrypt(ciphertext: str) -> str:
    return _fernet().decrypt(ciphertext.encode()).decode()
