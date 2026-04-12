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
from crypto import sha256_hash, aes_encrypt, aes_decrypt
from services import session_manager, key_exchange

router = APIRouter()

# defines Websocket endpoint. This is where clients connect to the server.
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

    # File transfer is server-driven after key exchange completes.
    # See _run_file_transfer() — no client messages needed for transfer.


async def _run_simulation(session: Session) -> None:
    """Run key exchange, then drive file transfer through the channel."""
    await key_exchange.run(session)

    # If key exchange succeeded, run the file transfer
    if session.phase == "transferring" and session.file_data and session.shared_key:
        await _run_file_transfer(session)


async def _run_file_transfer(session: Session) -> None:
    """
    Encrypt → route through Intruder → decrypt at Target.
    Flow: Origin → Intruder → Target (mirrors key_exchange routing).
    """
    import base64

    file_data = session.file_data
    key = session.shared_key
    original_hash = sha256_hash(file_data)

    # Step 1: Encrypt the file (on behalf of Origin)
    nonce, ciphertext = aes_encrypt(file_data, key)
    nonce_b64 = base64.b64encode(nonce).decode()
    cipher_b64 = base64.b64encode(ciphertext).decode()

    # Send bit visualization to Origin + Target (never Intruder)
    bits = _file_to_bits(file_data)
    await session_manager.send_to(session, "origin", make_msg(
        "bit_stream_init", bits=bits[:512], length=min(len(bits), 512)
    ))
    await session_manager.send_to(session, "target", make_msg(
        "bit_stream_init", bits=bits[:512], length=min(len(bits), 512)
    ))

    # Tell Origin the file was encrypted and sent
    await session_manager.send_to(session, "origin", make_msg(
        "file_encrypted", hash=original_hash
    ))

    await asyncio.sleep(0.5)

    # Step 2: Route through Intruder (if connected and active)
    if "intruder" in session.devices and session.intruder_settings.attackActive:
        # Intruder intercepts the ciphertext
        # In classical mode they have the key, in quantum they don't
        has_key = session.metrics.intruderCapturedKey

        await session_manager.send_to(session, "intruder", make_msg(
            "intercepted_file",
            nonce=nonce_b64,
            data=cipher_b64,
            hash=original_hash,
            has_key=has_key,
        ))

        if has_key:
            # Classical: intruder can decrypt → they captured the file
            session.metrics.intruderCapturedFile = True
        else:
            # Quantum: intruder sees ciphertext but can't decrypt
            session.metrics.intruderCapturedFile = False

        await session_manager.broadcast(session, make_msg(
            "metrics_update", metrics=session.metrics.model_dump()
        ))

        await asyncio.sleep(1.0)

        # Intruder forwards to Target (data passes through unchanged)
        await session_manager.send_to(session, "target", make_msg(
            "file_incoming",
            nonce=nonce_b64,
            data=cipher_b64,
            hash=original_hash,
            via="intruder",
        ))
    else:
        # No active intruder → direct delivery
        await session_manager.send_to(session, "target", make_msg(
            "file_incoming",
            nonce=nonce_b64,
            data=cipher_b64,
            hash=original_hash,
            via="direct",
        ))

    await asyncio.sleep(0.5)

    # Step 3: Decrypt at Target
    decrypted = aes_decrypt(nonce, ciphertext, key)

    if decrypted is not None:
        target_hash = sha256_hash(decrypted)
        hash_match = (target_hash == original_hash)
        session.metrics.transferSuccess = True
        session.metrics.fileHashMatch = hash_match

        await session_manager.send_to(session, "target", make_msg(
            "file_decrypted",
            success=True,
            hash=target_hash,
            hashMatch=hash_match,
        ))
    else:
        session.metrics.transferSuccess = False
        session.metrics.fileHashMatch = False

        await session_manager.send_to(session, "target", make_msg(
            "file_decrypted",
            success=False,
        ))

    # Step 4: Final state
    await session_manager.broadcast(session, make_msg(
        "metrics_update", metrics=session.metrics.model_dump()
    ))

    session.phase = "complete" if session.metrics.transferSuccess else "failed"
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
