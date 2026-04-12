# ══════════════════════════════════════════════════════════════
# services/session_manager.py — In-memory session store
# ══════════════════════════════════════════════════════════════

import random
import string
from fastapi import WebSocket
from models import Session, Metrics, IntruderSettings

_sessions: dict[str, Session] = {}


def create_session() -> Session:
    while True:
        sid = "".join(random.choices(string.ascii_uppercase + string.digits, k=6))
        if sid not in _sessions:
            break

    # Stores metric and intruder objects in session
    session = Session(
        session_id=sid,
        metrics=Metrics(),
        intruder_settings=IntruderSettings(),
    )
    # creates a new session object and stores inside _sessions
    _sessions[sid] = session
    return session

# looks up a session by ID
def get_session(session_id: str) -> Session | None:
    return _sessions.get(session_id)

# adds a device to a session by its role
def add_device(session_id: str, role: str, ws: WebSocket) -> bool:
    session = _sessions.get(session_id)
    if not session or role in session.devices:
        return False
    session.devices[role] = ws
    return True


# removes a device if disconnects and deletes it if its empty
def remove_device(session_id: str, role: str) -> None:
    session = _sessions.get(session_id)
    if not session:
        return
    session.devices.pop(role, None)
    if not session.devices:
        _sessions.pop(session_id, None)

# gets all the devices in the session
def get_device_list(session_id: str) -> list[dict]:
    session = _sessions.get(session_id)
    if not session:
        return []
    return [
        {"role": r, "connected": r in session.devices}
        for r in ("origin", "target", "intruder")
    ]

# broadcasts to all devices in the session
async def broadcast(session: Session, message: dict) -> None:
    for ws in list(session.devices.values()):
        try:
            await ws.send_json(message)
        except Exception:
            pass

# sends to a specific device
async def send_to(session: Session, role: str, message: dict) -> None:
    ws = session.devices.get(role)
    if ws:
        try:
            await ws.send_json(message)
        except Exception:
            pass

# sends to everyone except the specified device
async def send_to_except(session: Session, exclude_role: str, message: dict) -> None:
    for role, ws in list(session.devices.items()):
        if role != exclude_role:
            try:
                await ws.send_json(message)
            except Exception:
                pass
