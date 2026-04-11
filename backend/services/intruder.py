# ══════════════════════════════════════════════════════════════
# services/intruder.py — Man-in-the-middle attack simulation
# ══════════════════════════════════════════════════════════════
#
# This module implements the Intruder's behavior for both modes.
# It does NOT interact with the WebSocket directly — it's a pure
# logic layer called by key_exchange.py and file_transfer.py.
#
# ── Classical Mode Functions ─────────────────────────────────
#
# def intercept_classical_key(session: Session, key: bytes) -> bytes:
#     """
#     Called during classical key exchange.
#
#     - Store a copy of the key on the session for later use:
#       session._intruder_captured_key = key
#     - Set session.metrics.intruderCapturedKey = True.
#     - Return the key unchanged (it's forwarded to Target as-is).
#
#     In classical mode, the Intruder gets the key for free. No errors,
#     no detection. This is the whole point of the classical demo.
#     """
#
# def relay_file(session: Session, encrypted_data: bytes) -> bytes:
#     """
#     Called during file transfer. The Intruder sits between Origin
#     and Target and processes the encrypted data.
#
#     Classical mode (intruder has the key):
#       - Decrypt: plaintext = crypto.xor_encrypt(encrypted_data, session._intruder_captured_key)
#       - Store the plaintext (log it, save reference on session, etc.)
#       - Re-encrypt: re_encrypted = crypto.xor_encrypt(plaintext, session._intruder_captured_key)
#       - Set session.metrics.intruderCapturedFile = True.
#       - Return re_encrypted (forwarded to Target).
#       - Note: re-encryption with XOR produces identical ciphertext,
#         but we do the round-trip to demonstrate the concept.
#
#     Quantum mode (intruder does NOT have the key):
#       - Cannot decrypt. Just forward encrypted_data unchanged.
#       - session.metrics.intruderCapturedFile stays False.
#       - Return encrypted_data.
#     """
#
# ── Quantum Mode ─────────────────────────────────────────────
#
# The Intruder's quantum interference is handled INSIDE qkd/bb84.py,
# not in this file. bb84.simulate_bb84() takes intruder_active and
# interception_intensity as parameters and models the measurement
# disturbance internally.
#
# This file does NOT need a quantum interception function. The only
# quantum-related thing here is that relay_file() checks the mode
# and knows it can't decrypt in quantum mode.
#
# ── Why This File Exists ─────────────────────────────────────
#
# It centralizes the Intruder's "powers" so key_exchange.py and
# file_transfer.py don't have to think about Intruder logic.
# They just call intercept_classical_key() and relay_file() and
# the right thing happens based on mode.
#
# ── Notes ────────────────────────────────────────────────────
#
# - Import crypto (xor_encrypt) from crypto.py.
# - Access session.mode to branch on "classical" vs "quantum".
# - Access session._intruder_captured_key (set by intercept_classical_key).
# - This file should be ~30 lines of actual code.
