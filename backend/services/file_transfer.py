# ══════════════════════════════════════════════════════════════
# services/file_transfer.py — REMOVED (client-driven architecture)
# ══════════════════════════════════════════════════════════════
#
# File transfer is now client-driven:
#   1. Origin encrypts the file client-side and sends "encrypted_file"
#   2. Server routes it through Intruder (if connected) to Target
#   3. Target decrypts client-side and reports "transfer_result"
#
# All routing logic lives in routes/ws.py.
# This file is intentionally empty.
