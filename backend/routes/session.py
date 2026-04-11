# ══════════════════════════════════════════════════════════════
# routes/session.py — REST endpoints for session management
# ══════════════════════════════════════════════════════════════

from fastapi import APIRouter, HTTPException
from services import session_manager

router = APIRouter()


@router.post("/sessions")
async def create_session():
    session = session_manager.create_session()
    return {"session_id": session.session_id}


@router.post("/sessions/{session_id}/join")
async def join_session(session_id: str):
    session = session_manager.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return {"success": True}


@router.get("/sessions/{session_id}")
async def get_session(session_id: str):
    session = session_manager.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return {
        "session_id": session.session_id,
        "phase": session.phase,
        "mode": session.mode,
        "devices": session_manager.get_device_list(session_id),
    }
