# ══════════════════════════════════════════════════════════════
# services/key_exchange.py — Orchestrates key exchange for both modes
# ══════════════════════════════════════════════════════════════
#
# Called by routes/ws.py when a "start_simulation" message arrives.
# This is an async function that drives the key exchange phase,
# updates session metrics, and broadcasts updates to all devices.
#
# ── Interface ────────────────────────────────────────────────
#
# async def run(session: Session) -> None:
#     """
#     Run the key exchange for the given session. Mutates session.metrics,
#     session.shared_key, and session.phase in place. Broadcasts updates
#     to all devices via session_manager.
#     """
#
# ── Classical Mode ───────────────────────────────────────────
#
# When session.mode == "classical":
#
#   1. Generate a random key: 16 bytes (128 bits) via os.urandom(16).
#
#   2. The Intruder intercepts it (this is the whole point):
#      - Call intruder.intercept_classical_key(session, key_bytes).
#      - This stores a copy on the intruder side and sets
#        session.metrics.intruderCapturedKey = True.
#
#   3. Key is "delivered" to Target (in reality both sides just get it).
#      - session.shared_key = key_bytes
#      - session.metrics.keyExchangeAttempts = 1
#      - session.metrics.keyEstablished = True
#
#   4. Broadcast metrics_update to all devices.
#
#   5. Add a small delay (asyncio.sleep(1.5)) for dramatic effect.
#      The frontend shows "Exchanging keys..." during this.
#
#   6. Set session.phase = "transferring".
#      Broadcast phase_update.
#
# Classical is instant and always succeeds. The drama is that
# the Intruder silently stole the key.
#
# ── Quantum Mode (BB84) ─────────────────────────────────────
#
# When session.mode == "quantum":
#
#   MAX_ATTEMPTS = 3
#   QBER_THRESHOLD = 0.11
#
#   Loop up to MAX_ATTEMPTS times:
#
#     1. Increment session.metrics.keyExchangeAttempts.
#
#     2. Call qkd.bb84.simulate_bb84(
#            num_qubits=256,
#            intruder_active=session.intruder_settings.attackActive,
#            interception_intensity=session.intruder_settings.interceptionIntensity,
#        )
#        This returns a result dict with "key", "qber", etc.
#
#     3. Set session.metrics.qber = result["qber"].
#
#     4. Broadcast metrics_update (so the UI updates the QBER gauge live).
#
#     5. Add a delay (asyncio.sleep(1.5)) per attempt for visual pacing.
#
#     6. Check QBER:
#        if result["qber"] > QBER_THRESHOLD:
#            - Key rejected. Intruder detected.
#            - session.metrics.intruderDetected = True
#            - Broadcast metrics_update.
#            - If this was the last attempt:
#                session.phase = "aborted"
#                session.metrics.transferSuccess = False
#                Broadcast phase_update.
#                Return.
#            - Otherwise: continue loop (retry).
#
#        else:
#            - Key accepted.
#            - Convert result["key"] (list of bits) to bytes for use
#              as encryption key. Pad or truncate to 16 bytes.
#            - session.shared_key = key_bytes
#            - session.metrics.keyEstablished = True
#            - session.metrics.intruderDetected = False
#            - Broadcast metrics_update.
#            - session.phase = "transferring"
#            - Broadcast phase_update.
#            - Return.
#
# ── Helper ───────────────────────────────────────────────────
#
# def bits_to_bytes(bits: list[int]) -> bytes:
#     """Pack a list of 0/1 ints into bytes (MSB first, zero-padded)."""
#     - Group bits into chunks of 8.
#     - Each chunk → one byte.
#     - Return bytes.
#
# ── Notes ────────────────────────────────────────────────────
#
# - This function does NOT handle file transfer. It only handles
#   key exchange. After it returns, routes/ws.py checks the phase
#   and proceeds to file_transfer.run() if phase == "transferring".
# - Import session_manager for broadcast/send_to.
# - Import qkd.bb84 for simulate_bb84.
# - Import services.intruder for classical interception.
# - Import models.make_msg (or build dicts inline) for message construction.
