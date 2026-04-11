# WebSocket endpoint handling real-time communication between the three devices.
#
# TODO [WIRING]: The frontend (useWebSocket.ts) connects to:
#
#   WS /ws/{session_id}
#
# Inbound message types (from frontend → backend):
#   - "role_selected"       → { role: "origin"|"target"|"intruder" }
#   - "mode_selected"       → { mode: "classical"|"quantum" }
#   - "start_simulation"    → { mode }  — triggers key exchange flow
#   - "file_upload"         → { name, size } + binary chunks
#   - "intruder_settings"   → { attackActive, interceptionIntensity }
#
# Outbound message types (backend → frontend):
#   - "device_update"       → { devices: [{ role, connected }] }
#   - "phase_update"        → { phase: "key_exchange"|"transferring"|"complete"|"aborted" }
#   - "metrics_update"      → { qber, keyExchangeAttempts, keyEstablished, ... }
#   - "transfer_chunk"      → binary data relayed to Target
#   - "transfer_complete"   → { success, fileHashMatch }
#   - "error"               → { message }
#
# All messages are JSON with { "type": "<type>", "payload": { ... } }.
# Message schemas must match frontend/src/types.ts → WsMessage.
#
# Routing logic:
#   Origin ↔ Intruder ↔ Target (all traffic passes through Intruder).
#   Use services/session_manager.py to look up connections per session.
#   Use services/key_exchange.py to drive the key exchange flow.
#   Use services/intruder.py to apply MITM logic before forwarding.
#   Use services/file_transfer.py to handle chunked file relay.
