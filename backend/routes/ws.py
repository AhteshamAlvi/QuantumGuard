# ══════════════════════════════════════════════════════════════
# routes/ws.py — WebSocket message router
# ══════════════════════════════════════════════════════════════
#
# Pure router: receives messages from clients, routes them to
# the right recipients. Clients own encryption, decryption, and
# execution. Server only coordinates state and relays messages.

import asyncio
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from models import Session, IntruderSettings, make_msg
from crypto import sha256_hash
from services import session_manager, key_exchange

router = APIRouter()


@router.websocket("/ws/{session_id}")
async def session_ws(ws: WebSocket, session_id: str):
    await ws.accept()

    session = session_manager.get_session(session_id)
    if not session:
        await ws.send_json(make_msg("error", message="Session not found"))
        await ws.close(code=4004)
        return

    # Wait for role selection as the first message
    role = None
    try:
        first_msg = await ws.receive_json()
        if first_msg.get("type") != "role_selected":
            await ws.send_json(make_msg("error", message="First message must be role_selected"))
            await ws.close(code=4001)
            return

        role = first_msg.get("role") or first_msg.get("payload", {}).get("role")
        if not session_manager.add_device(session_id, role, ws):
            await ws.send_json(make_msg("error", message=f"Role '{role}' is already taken"))
            await ws.close(code=4002)
            return

        # Broadcast updated device list
        await session_manager.broadcast(session, make_msg(
            "device_update", devices=session_manager.get_device_list(session_id)
        ))

        # Send current session state to the newly connected device
        await ws.send_json(make_msg(
            "session_state",
            phase=session.phase,
            mode=session.mode,
            devices=session_manager.get_device_list(session_id),
            metrics=session.metrics.model_dump(),
        ))

        # Message loop
        while True:
            msg = await ws.receive_json()
            await _handle_message(session, role, msg)

    except WebSocketDisconnect:
        pass
    except Exception:
        pass
    finally:
        if role:
            session_manager.remove_device(session_id, role)
            remaining = session_manager.get_session(session_id)
            if remaining:
                await session_manager.broadcast(remaining, make_msg(
                    "device_update",
                    devices=session_manager.get_device_list(session_id)
                ))


async def _handle_message(session: Session, sender_role: str, msg: dict) -> None:
    """Dispatch a client message to the appropriate handler."""
    msg_type = msg.get("type", "")

    if msg_type == "mode_selected":
        mode = msg.get("mode") or msg.get("payload", {}).get("mode")
        session.mode = mode
        await session_manager.broadcast(session, make_msg("mode_update", mode=mode))

    elif msg_type == "start_simulation":
        session.phase = "key_exchange"
        await session_manager.broadcast(session, make_msg("phase_update", phase="key_exchange"))
        # Key exchange runs async — server coordinates BB84 or classical
        asyncio.create_task(_run_simulation(session))

    elif msg_type == "file_upload":
        # Origin sends file metadata, then binary data follows
        if sender_role != "origin":
            return
        session.file_hash = msg.get("hash")

    elif msg_type == "file_binary":
        # Origin sends raw file bytes (base64 encoded in JSON)
        if sender_role != "origin":
            return
        import base64
        file_b64 = msg.get("data", "")
        session.file_data = base64.b64decode(file_b64)
        session.file_hash = sha256_hash(session.file_data)

    elif msg_type == "intruder_settings":
        if sender_role != "intruder":
            return
        payload = msg.get("payload", msg)
        session.intruder_settings = IntruderSettings(
            attackActive=payload.get("attackActive", True),
            interceptionIntensity=payload.get("interceptionIntensity", 0.5),
        )

    elif msg_type == "encrypted_file":
        # Origin sends encrypted file data — route through intruder to target
        await _route_encrypted_file(session, sender_role, msg)

    elif msg_type == "relay_file":
        # Intruder relays (possibly modified) encrypted data to target
        await _route_relay(session, sender_role, msg)

    elif msg_type == "transfer_result":
        # Target reports decryption success/failure
        await _handle_transfer_result(session, sender_role, msg)


async def _run_simulation(session: Session) -> None:
    """Run key exchange, then wait for client-driven file transfer."""
    await key_exchange.run(session)
    # After key exchange, the phase is either "transferring" or "aborted".
    # If "transferring", clients now drive the file transfer:
    #   1. Origin encrypts file with the key and sends "encrypted_file"
    #   2. Server routes through intruder (if present) to target
    #   3. Target decrypts and reports result


async def _route_encrypted_file(session: Session, sender_role: str, msg: dict) -> None:
    """Route Origin's encrypted file through Intruder to Target."""
    if sender_role != "origin":
        return

    # Stream bit visualization to Origin + Target (not Intruder)
    if session.file_data:
        bits = _file_to_bits(session.file_data)
        await session_manager.send_to(session, "origin", make_msg(
            "bit_stream_init", bits=bits[:512], length=min(len(bits), 512)
        ))
        await session_manager.send_to(session, "target", make_msg(
            "bit_stream_init", bits=bits[:512], length=min(len(bits), 512)
        ))

    # If intruder is connected, route through them first
    if "intruder" in session.devices:
        await session_manager.send_to(session, "intruder", make_msg(
            "intercepted_file",
            data=msg.get("data"),
            nonce=msg.get("nonce"),
            hash=session.file_hash,
        ))
    else:
        # No intruder — send directly to target
        await session_manager.send_to(session, "target", make_msg(
            "file_incoming",
            data=msg.get("data"),
            nonce=msg.get("nonce"),
            hash=session.file_hash,
        ))


async def _route_relay(session: Session, sender_role: str, msg: dict) -> None:
    """Intruder relays data to Target (may have read/modified it)."""
    if sender_role != "intruder":
        return

    # Update metrics if intruder claims they captured the file
    if msg.get("captured"):
        session.metrics.intruderCapturedFile = True
        await session_manager.broadcast(session, make_msg(
            "metrics_update", metrics=session.metrics.model_dump()
        ))

    await session_manager.send_to(session, "target", make_msg(
        "file_incoming",
        data=msg.get("data"),
        nonce=msg.get("nonce"),
        hash=session.file_hash,
    ))


async def _handle_transfer_result(session: Session, sender_role: str, msg: dict) -> None:
    """Target reports whether decryption succeeded."""
    if sender_role != "target":
        return

    success = msg.get("success", False)
    hash_match = msg.get("hashMatch", False)

    session.metrics.transferSuccess = success
    session.metrics.fileHashMatch = hash_match

    if success:
        session.phase = "complete"
    else:
        session.phase = "failed"

    await session_manager.broadcast(session, make_msg(
        "metrics_update", metrics=session.metrics.model_dump()
    ))
    await session_manager.broadcast(session, make_msg(
        "phase_update", phase=session.phase
    ))


def _file_to_bits(file_bytes: bytes, max_bits: int = 512) -> list[int]:
    """Convert raw bytes to individual bits for visualization."""
    bits = []
    for byte in file_bytes:
        for i in range(7, -1, -1):
            bits.append((byte >> i) & 1)
            if len(bits) >= max_bits:
                return bits
    return bits
