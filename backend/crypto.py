# ══════════════════════════════════════════════════════════════
# crypto.py — Encryption, decryption, key derivation, and hashing
# ══════════════════════════════════════════════════════════════

from cryptography.hazmat.primitives.ciphers.aead import AESGCM
import hashlib
import os


def derive_aes_key(bb84_bits: bytes) -> bytes:
    """Hash arbitrary-length BB84 output down to a 16-byte AES-128 key."""
    return hashlib.sha256(bb84_bits).digest()[:16]


def aes_encrypt(data: bytes, key: bytes) -> tuple[bytes, bytes]:
    """Encrypt data with AES-GCM. Returns (nonce, ciphertext)."""
    nonce = os.urandom(12)  # GCM standard nonce size
    aes = AESGCM(key)
    ciphertext = aes.encrypt(nonce, data, None)
    return nonce, ciphertext


def aes_decrypt(nonce: bytes, ciphertext: bytes, key: bytes) -> bytes | None:
    """Decrypt AES-GCM ciphertext. Returns None if decryption fails."""
    aes = AESGCM(key)
    try:
        return aes.decrypt(nonce, ciphertext, None)
    except Exception:
        return None


def sha256_hash(data: bytes) -> str:
    """SHA-256 hex digest for file integrity checks."""
    return hashlib.sha256(data).hexdigest()
