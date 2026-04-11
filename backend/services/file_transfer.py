# ══════════════════════════════════════════════════════════════
# services/file_transfer.py — Encrypted file transfer + bit stream
# ══════════════════════════════════════════════════════════════
#
# Called by routes/ws.py after key exchange succeeds (phase == "transferring").
# Handles two things simultaneously:
#   1. The actual encrypted file relay (Origin → Intruder → Target).
#   2. The bit stream visualization sent to Origin + Target.
#
# ── Interface ────────────────────────────────────────────────
#
# async def run(session: Session) -> None:
#     """
#     Transfer the file from Origin to Target through the Intruder.
#     Mutates session.metrics and session.phase. Broadcasts updates.
#     """
#
# ── Prerequisites ────────────────────────────────────────────
#
# Before calling this function, these must be set on the session:
#   - session.shared_key (bytes) — from key_exchange
#   - session.file_data (bytes) — raw file uploaded by Origin via "file_upload"
#   - session.file_hash (str) — SHA-256 of the original file
#
# ── Flow ─────────────────────────────────────────────────────
#
#   1. ENCRYPT
#      - encrypted = crypto.xor_encrypt(session.file_data, session.shared_key)
#
#   2. INTRUDER RELAY
#      - Call intruder.relay_file(session, encrypted).
#      - In classical mode: the intruder has the key, so it decrypts
#        the data, stores a plaintext copy, re-encrypts, and forwards.
#        Sets session.metrics.intruderCapturedFile = True.
#      - In quantum mode: the intruder does NOT have the key (if key
#        exchange succeeded, the intruder failed). It can only forward
#        the encrypted blob. intruderCapturedFile stays False.
#      - The function returns the (possibly re-encrypted) data to
#        forward to Target.
#
#   3. DECRYPT (Target side, simulated server-side)
#      - decrypted = crypto.xor_encrypt(relayed_data, session.shared_key)
#
#   4. INTEGRITY CHECK
#      - target_hash = crypto.sha256_hash(decrypted)
#      - session.metrics.fileHashMatch = (target_hash == session.file_hash)
#
#   5. BIT STREAM VISUALIZATION (runs concurrently with above)
#      - Convert the file to bits: bits = file_to_bits(session.file_data)
#        Truncate to MAX_BITS (512) for UI performance.
#      - Simulate receiver bits with error rate based on mode:
#          Classical: error_rate = 0.0 (perfect, intruder doesn't corrupt)
#          Quantum (key secure): error_rate ≈ 0.02 (minor channel noise)
#      - Send to Origin + Target (NEVER Intruder):
#          a. { "type": "init", "sender_bits": bits, "length": len }
#             → Only to Origin (they see sent bits immediately).
#          b. For each receiver bit, with ~20ms delay:
#             { "type": "bit", "index": i, "value": 0|1 }
#             → To both Origin + Target.
#          c. { "type": "done", "sender_bits": bits, "receiver_bits": [...] }
#             → To both Origin + Target.
#      - Use session_manager.send_to() for targeted delivery.
#      - Use asyncio.sleep(0.02) between bits for visual pacing.
#
#   6. FINALIZE
#      - session.metrics.transferSuccess = True
#      - Broadcast metrics_update to all devices.
#      - session.phase = "complete"
#      - Broadcast phase_update to all devices.
#
# ── Helper ───────────────────────────────────────────────────
#
# MAX_BITS = 512
#
# def file_to_bits(file_bytes: bytes) -> list[int]:
#     """Convert raw bytes to individual bits, MSB first. Truncate to MAX_BITS."""
#     bits = []
#     for byte in file_bytes:
#         for i in range(7, -1, -1):
#             bits.append((byte >> i) & 1)
#             if len(bits) >= MAX_BITS:
#                 return bits
#     return bits
#
# def simulate_receiver_bits(bits: list[int], error_rate: float) -> list[int]:
#     """Simulate what the receiver gets — flips bits at the given error rate."""
#     import random
#     return [1 - b if random.random() < error_rate else b for b in bits]
#
# ── Notes ────────────────────────────────────────────────────
#
# - The bit stream visualization is the "wow factor" — it shows real
#   bits from the real uploaded file streaming across the screen.
# - The actual file transfer (encrypt → relay → decrypt → hash) is
#   separate from the visualization. The visualization is cosmetic
#   but uses real file data.
# - Import crypto (xor_encrypt, sha256_hash) from crypto.py.
# - Import session_manager for send_to / broadcast.
# - Import intruder for relay_file.
