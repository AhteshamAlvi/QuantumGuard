# ══════════════════════════════════════════════════════════════
# models.py — All data models and message schemas
# ══════════════════════════════════════════════════════════════

from __future__ import annotations
from dataclasses import dataclass, field
from typing import Literal
from fastapi import WebSocket
from pydantic import BaseModel


# ── Type Aliases ─────────────────────────────────────────────

Role = Literal["origin", "target", "intruder"]
Mode = Literal["classical", "quantum"]
SessionPhase = Literal["lobby", "key_exchange", "transferring", "complete", "aborted", "failed"]


# ── Pydantic Models (serializable) ──────────────────────────

class Metrics(BaseModel):
    qber: float | None = None
    keyExchangeAttempts: int = 0
    keyEstablished: bool = False
    intruderDetected: bool = False
    intruderCapturedKey: bool = False
    intruderCapturedFile: bool = False
    fileHashMatch: bool | None = None
    transferSuccess: bool | None = None


class IntruderSettings(BaseModel):
    attackActive: bool = True
    interceptionIntensity: float = 0.5


# ── Session (mutable, in-memory state) ──────────────────────

@dataclass
class Session:
    session_id: str
    devices: dict[str, WebSocket] = field(default_factory=dict)
    mode: str | None = None
    phase: str = "lobby"
    intruder_settings: IntruderSettings = field(default_factory=IntruderSettings)
    shared_key: bytes | None = None
    file_data: bytes | None = None
    file_hash: str | None = None
    metrics: Metrics = field(default_factory=Metrics)


# ── Message Helper ───────────────────────────────────────────

def make_msg(msg_type: str, **payload) -> dict:
    """Build a message dict for ws.send_json()."""
    return {"type": msg_type, **payload}
