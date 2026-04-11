# ══════════════════════════════════════════════════════════════
# routes/ws.py — WebSocket endpoint for real-time communication
# ══════════════════════════════════════════════════════════════
#
# This is the central nervous system of the app. One WebSocket
# endpoint handles ALL communication for ALL roles within a session.
#
# ── Endpoint ─────────────────────────────────────────────────
#
# @router.websocket("/ws/{session_id}")
# async def session_ws(ws: WebSocket, session_id: str):
#
#   1. ACCEPT the connection.
#      - Call session_manager.get_session(session_id).
#      - If session doesn't exist → close with code 4004.
#
#   2. WAIT FOR ROLE SELECTION.
#      - First message from client must be:
#        { "type": "role_selected", "payload": { "role": "origin"|"target"|"intruder" } }
#      - Validate the role isn't already taken in this session.
#      - If taken → send error message and close.
#      - Register: session_manager.add_device(session_id, role, ws).
#      - Broadcast "device_update" to all connected devices:
#        { "type": "device_update", "payload": { "devices": [...] } }
#
#   3. MESSAGE LOOP.
#      - Wrap in try/finally so we always clean up on disconnect.
#      - Loop: msg = await ws.receive_json()
#      - Dispatch on msg["type"]:
#
#        "mode_selected":
#          - Set session.mode = payload.mode.
#          - Broadcast "mode_selected" to all devices so UI syncs.
#
#        "start_simulation":
#          - Only proceed if all 3 roles are connected (or allow 2 for testing).
#          - Set session.phase = "key_exchange".
#          - Broadcast phase_update.
#          - Call key_exchange.run(session) — this is async and will:
#              a) Run classical or quantum key exchange.
#              b) Update session.metrics along the way.
#              c) Broadcast metrics_update after each attempt.
#              d) Set phase to "transferring" or "aborted".
#              e) Broadcast phase_update.
#          - If phase is "transferring", proceed to file transfer:
#              a) Call file_transfer.run(session) — handles bit streaming.
#              b) Updates metrics.transferSuccess, fileHashMatch, etc.
#              c) Sets phase to "complete".
#              d) Broadcasts final metrics_update + phase_update.
#
#        "file_upload":
#          - Only accepted from Origin role.
#          - After this JSON message, read the next frame as binary:
#            file_data = await ws.receive_bytes()
#          - Store file_data on the session object.
#          - Compute and store session.file_hash = sha256_hash(file_data).
#
#        "intruder_settings":
#          - Only accepted from Intruder role.
#          - Update session.intruder_settings with payload values.
#          - No broadcast needed (settings are consumed server-side).
#
#   4. CLEANUP (in the finally block):
#      - session_manager.remove_device(session_id, role)
#      - Broadcast "device_update" to remaining devices.
#      - If no devices remain, optionally delete the session.
#
# ── Bit Stream During Transfer ───────────────────────────────
#
# During the "transferring" phase, the file_transfer service
# streams bit-level visualization data. This is handled inside
# file_transfer.run() but the key rules are:
#
#   - "init", "bit", "done" messages go to Origin + Target ONLY.
#   - NEVER send bit stream messages to the Intruder.
#   - Use session_manager.send_to(session_id, "origin", msg)
#     and session_manager.send_to(session_id, "target", msg).
#
# ── Helper Functions (keep in this file) ─────────────────────
#
# def file_to_bits(file_bytes: bytes) -> list[int]:
#     """Convert raw bytes to individual bits, MSB first."""
#     bits = []
#     for byte in file_bytes:
#         for i in range(7, -1, -1):
#             bits.append((byte >> i) & 1)
#     return bits
#
# This is used by file_transfer.py to generate the bit stream
# visualization. Keep it here or in file_transfer.py — either works.
# Currently lives here because the earlier prototype put it here.
#
# ── Implementation Notes ─────────────────────────────────────
#
# - Use APIRouter(). Register in app.py at root (no prefix).
# - Handle WebSocketDisconnect from starlette.websockets.
# - All simulation logic (key exchange, file transfer) is async.
#   Run it with asyncio — the WebSocket stays open throughout.
# - Keep this file as a thin dispatcher. The real logic lives in
#   services/key_exchange.py, services/file_transfer.py, and
#   services/intruder.py.
