# ══════════════════════════════════════════════════════════════
# crypto.py — Encryption and hashing utilities
# ══════════════════════════════════════════════════════════════
#
# Two concerns, both simple:
#   1. Symmetric encryption/decryption of file chunks using a shared key.
#   2. SHA-256 hashing for file integrity verification.
#
# ── Encryption ───────────────────────────────────────────────
#
# def xor_encrypt(data: bytes, key: bytes) -> bytes:
#     """XOR each byte of data with the key (cycling the key)."""
#
#     Implementation:
#       return bytes(b ^ key[i % len(key)] for i, b in enumerate(data))
#
#     XOR is symmetric — the same function encrypts and decrypts.
#     This is intentionally weak crypto. It's a simulation: the point
#     is to show that the Intruder can reverse it if they have the key,
#     not to provide real security.
#
#     Called by:
#       - services/file_transfer.py  → encrypt chunks before sending
#       - services/file_transfer.py  → decrypt chunks on receipt
#       - services/intruder.py       → decrypt intercepted chunks (classical mode)
#
# ── Hashing ──────────────────────────────────────────────────
#
# def sha256_hash(data: bytes) -> str:
#     """Return the hex SHA-256 digest of the given bytes."""
#
#     Implementation:
#       import hashlib
#       return hashlib.sha256(data).hexdigest()
#
#     Called by:
#       - services/file_transfer.py  → Origin hashes the original file
#       - services/file_transfer.py  → Target hashes the reassembled file
#       - The two hashes are compared to set metrics.fileHashMatch
#
# ── Notes ────────────────────────────────────────────────────
#
# This file should be ~10 lines of actual code. No classes needed.
# Both functions are pure — no state, no side effects.
