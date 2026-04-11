# ══════════════════════════════════════════════════════════════
# models.py — All data models and message schemas in one place
# ══════════════════════════════════════════════════════════════
#
# Contains Pydantic models and Python dataclasses/plain classes
# used throughout the backend. Everything here must stay in sync
# with frontend/src/types.ts.
#
# ── Enums / Literals ─────────────────────────────────────────
#
# Role = Literal["origin", "target", "intruder"]
# Mode = Literal["classical", "quantum"]
# SessionPhase = Literal["lobby", "key_exchange", "transferring", "complete", "aborted"]
#
# ── Session Model ────────────────────────────────────────────
#
# class Session:
#     """Represents a single game session with up to 3 connected devices."""
#
#     Fields:
#       session_id: str               — 6-char uppercase alphanumeric code
#       devices: dict[Role, WebSocket] — maps role to its active WS connection
#                                        (empty roles = not yet joined)
#       mode: Mode | None             — set when any device selects classical/quantum
#       phase: SessionPhase           — starts at "lobby", driven by the simulation
#       intruder_settings: IntruderSettings — attack toggle + intensity
#       shared_key: bytes | None      — the symmetric key once established
#       file_hash: str | None         — SHA-256 of the original file (set by Origin)
#       metrics: Metrics              — running metrics state, broadcast to all devices
#
#     Note: Store WebSocket references directly. This is an in-memory
#     hackathon app — no database, no serialization of sessions.
#
# ── Metrics Model ────────────────────────────────────────────
#
# class Metrics(BaseModel):
#     """Tracks simulation metrics. Broadcast to all devices on every change."""
#
#     Fields (must match frontend Metrics interface exactly):
#       qber: float | None = None
#       keyExchangeAttempts: int = 0
#       keyEstablished: bool = False
#       intruderDetected: bool = False
#       intruderCapturedKey: bool = False
#       intruderCapturedFile: bool = False
#       fileHashMatch: bool | None = None
#       transferSuccess: bool | None = None
#
#     Use .model_dump() to serialize for WebSocket broadcast.
#     Use model_copy(update={...}) to produce updated copies without mutation.
#
# ── IntruderSettings Model ───────────────────────────────────
#
# class IntruderSettings(BaseModel):
#     """Received from the Intruder device's UI controls."""
#
#     Fields:
#       attackActive: bool = True
#       interceptionIntensity: float = 0.5   — range [0.0, 1.0]
#
# ── WebSocket Message Models ─────────────────────────────────
#
# class WsMessage(BaseModel):
#     """Generic envelope for all WebSocket messages."""
#
#     Fields:
#       type: str       — one of the WsMessageType values below
#       payload: dict   — type-specific data
#
# Inbound types (frontend → backend):
#   "role_selected"     → payload: { role: Role }
#   "mode_selected"     → payload: { mode: Mode }
#   "start_simulation"  → payload: { mode: Mode }
#   "file_upload"       → payload: { name: str, size: int }
#   "intruder_settings" → payload: IntruderSettings fields
#
# Outbound types (backend → frontend):
#   "device_update"     → payload: { devices: [{ role: str, connected: bool }] }
#   "phase_update"      → payload: { phase: SessionPhase }
#   "metrics_update"    → payload: Metrics fields (flat dict)
#   "transfer_complete" → payload: { success: bool, fileHashMatch: bool }
#   "error"             → payload: { message: str }
#
# Bit stream messages (backend → Origin + Target ONLY, never Intruder):
#   "init"              → payload: { sender_bits: list[int], length: int }
#   "bit"               → payload: { index: int, value: int }
#   "done"              → payload: { sender_bits: list[int], receiver_bits: list[int] }
#
# ── Helper ───────────────────────────────────────────────────
#
# def make_msg(type: str, **payload) -> dict:
#     """Convenience to build a message dict for ws.send_json()."""
#     return {"type": type, "payload": payload}
#
# Use this everywhere instead of hand-writing dicts. Keeps
# the format consistent and easy to grep.
