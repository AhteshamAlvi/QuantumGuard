# ══════════════════════════════════════════════════════════════
# crypto.py — Key derivation and hashing utilities
# ══════════════════════════════════════════════════════════════
#
# Used server-side for:
#   - Deriving AES keys from BB84 bit output
#   - Hashing files for integrity verification
#
# Encryption/decryption of file data happens on the clients.
# The server only derives keys and distributes them.

import hashlib


def derive_aes_key(bb84_bits: bytes) -> bytes:
    """Hash arbitrary-length BB84 output down to a 16-byte AES-128 key."""
    return hashlib.sha256(bb84_bits).digest()[:16]


def sha256_hash(data: bytes) -> str:
    """SHA-256 hex digest for file integrity checks."""
    return hashlib.sha256(data).hexdigest()
