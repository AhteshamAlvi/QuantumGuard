# ══════════════════════════════════════════════════════════════
# models.py — All data models and message schemas
# ══════════════════════════════════════════════════════════════

from __future__ import annotations
from dataclasses import dataclass, field
from fastapi import WebSocket
from pydantic import BaseModel


# keeps track of what's happening over the session
class Metrics(BaseModel):
    qber: float | None = None
    keyExchangeAttempts: int = 0
    keyEstablished: bool = False
    intruderDetected: bool = False
    intruderCapturedKey: bool = False
    intruderCapturedFile: bool = False
    fileHashMatch: bool | None = None
    transferSuccess: bool | None = None


# keeps track of what's happening to the intruder
class IntruderSettings(BaseModel):
    attackActive: bool = True
    interceptionIntensity: float = 0.5


# makes one session instance and its stored data
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
    # BB84 state — server stores Origin's bits/bases, waits for Target's
    bb84_origin_bits: list[int] = field(default_factory=list)
    bb84_origin_bases: list[str] = field(default_factory=list)
    bb84_target_bits: list[int] = field(default_factory=list)
    bb84_target_bases: list[str] = field(default_factory=list)
    bb84_ready: bool = False  # set True when Target sends measurement

# standard message builder
def make_msg(msg_type: str, **payload) -> dict:
    """Build a message dict for ws.send_json()."""
    return {"type": msg_type, **payload}
