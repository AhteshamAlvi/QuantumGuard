# ══════════════════════════════════════════════════════════════
# services/session_manager.py — In-memory session store
# ══════════════════════════════════════════════════════════════
#
# This is the single source of truth for all active sessions.
# Plain Python dict — no database, no persistence. Sessions live
# only as long as the server process runs. Fine for a hackathon.
#
# ── State ────────────────────────────────────────────────────
#
# _sessions: dict[str, Session] = {}
#
# Module-level dict. Imported by routes/ and services/ modules.
# Session is the model from models.py.
#
# ── Functions ────────────────────────────────────────────────
#
# def create_session() -> Session:
#     """Create a new session with a unique 6-char ID."""
#     - Generate a random 6-char uppercase alphanumeric code.
#       Use random.choices(string.ascii_uppercase + string.digits, k=6).
#     - Ensure uniqueness: regenerate if ID already exists (unlikely).
#     - Instantiate a Session with default values:
#         phase="lobby", mode=None, devices={}, metrics=Metrics(),
#         intruder_settings=IntruderSettings(), shared_key=None, file_hash=None
#     - Store in _sessions[session_id].
#     - Return the Session object.
#
# def get_session(session_id: str) -> Session | None:
#     """Look up a session by ID. Returns None if not found."""
#     return _sessions.get(session_id)
#
# def add_device(session_id: str, role: str, ws: WebSocket) -> bool:
#     """Register a WebSocket connection for a role in a session."""
#     - Get the session. If not found, return False.
#     - If role is already in session.devices, return False (role taken).
#     - Set session.devices[role] = ws.
#     - Return True.
#
# def remove_device(session_id: str, role: str) -> None:
#     """Unregister a device when its WebSocket disconnects."""
#     - Get the session. If not found, return.
#     - Pop role from session.devices.
#     - If session.devices is now empty, delete the session from _sessions.
#       (Auto-cleanup: no orphaned sessions.)
#
# def get_device_list(session_id: str) -> list[dict]:
#     """Return the device status list for a "device_update" broadcast."""
#     - Get the session.
#     - For each role in ["origin", "target", "intruder"]:
#         {"role": role, "connected": role in session.devices}
#     - Return the list.
#
# async def broadcast(session_id: str, message: dict) -> None:
#     """Send a JSON message to ALL connected devices in a session."""
#     - Get the session.
#     - For each ws in session.devices.values():
#         try: await ws.send_json(message)
#         except: pass  (device may have disconnected between check and send)
#
# async def send_to(session_id: str, role: str, message: dict) -> None:
#     """Send a JSON message to ONE specific role."""
#     - Get the session.
#     - If role in session.devices:
#         try: await session.devices[role].send_json(message)
#         except: pass
#
# async def send_to_except(session_id: str, exclude_role: str, message: dict) -> None:
#     """Send to all devices EXCEPT the given role."""
#     - Useful for sending bit stream to Origin+Target but not Intruder:
#       await send_to_except(session_id, "intruder", msg)
#
# ── Notes ────────────────────────────────────────────────────
#
# - All functions are synchronous except broadcast/send_to/send_to_except.
# - No locking needed — FastAPI runs on a single asyncio loop,
#   so there are no race conditions on the dict.
# - If you wanted multi-worker support, you'd need Redis or similar.
#   Don't bother for the hackathon.
