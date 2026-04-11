# REST endpoints for creating, joining, and querying sessions.
#
# TODO [WIRING]: The frontend (useSession.ts) expects these endpoints:
#
#   POST /api/sessions
#     → Creates a new session.
#     → Returns: { "session_id": "<6-char code>" }
#
#   POST /api/sessions/{session_id}/join
#     → Joins an existing session.
#     → Returns: { "success": true } or 404 if not found.
#
#   GET /api/sessions/{session_id}
#     → Returns session state: connected devices, roles taken, mode, phase.
#     → Used by the frontend to poll state if WebSocket disconnects.
#
# Use services/session_manager.py to manage session state.
