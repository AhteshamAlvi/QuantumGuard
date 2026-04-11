# ══════════════════════════════════════════════════════════════
# routes/session.py — REST endpoints for session management
# ══════════════════════════════════════════════════════════════
#
# These are plain HTTP endpoints (not WebSocket). The frontend
# calls them before opening a WebSocket connection.
#
# ── POST /sessions ───────────────────────────────────────────
#
# Creates a new session.
#
#   1. Call session_manager.create_session() to get a new Session object.
#   2. Return: { "session_id": "<6-char code>" }
#   3. Status 200.
#
# The session starts in "lobby" phase with no devices connected.
# Devices connect later via WebSocket.
#
# ── POST /sessions/{session_id}/join ─────────────────────────
#
# Validates that a session exists before the frontend opens a WebSocket.
#
#   1. Call session_manager.get_session(session_id).
#   2. If None → return 404: { "detail": "Session not found" }
#   3. If found → return 200: { "success": true }
#
# This does NOT add a device. Device registration happens when
# the WebSocket connects and sends "role_selected".
#
# ── GET /sessions/{session_id} ───────────────────────────────
#
# Returns the current session state. Used as a fallback if the
# frontend's WebSocket disconnects and needs to resync.
#
#   1. Call session_manager.get_session(session_id).
#   2. If None → 404.
#   3. Return:
#      {
#        "session_id": str,
#        "phase": str,
#        "mode": str | null,
#        "devices": [{ "role": str, "connected": bool }, ...]
#      }
#
# ── Implementation Notes ─────────────────────────────────────
#
# - Use APIRouter(). Register in app.py with prefix="/api".
# - Import session_manager from services.session_manager.
# - All three endpoints are simple — each is 5-10 lines.
# - Use HTTPException(status_code=404) for missing sessions.
