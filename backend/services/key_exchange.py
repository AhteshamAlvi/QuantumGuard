# ══════════════════════════════════════════════════════════════
# services/key_exchange.py — Orchestrates key exchange for both modes
# ══════════════════════════════════════════════════════════════
#
# Server-side coordination: runs BB84 or generates classical key,
# then distributes the key to clients via WebSocket messages.
# Clients receive the key and handle encryption/decryption themselves.

import asyncio
import os
import base64

from models import Session, make_msg
from crypto import derive_aes_key
from qkd.bb84 import simulate_bb84
from services import session_manager

MAX_ATTEMPTS = 3
QBER_THRESHOLD = 0.11


def bits_to_bytes(bits: list[int]) -> bytes:
    """Pack a list of 0/1 ints into bytes (MSB first, zero-padded)."""
    result = bytearray()
    for i in range(0, len(bits), 8):
        chunk = bits[i:i + 8]
        byte = 0
        for bit in chunk:
            byte = (byte << 1) | bit
        byte <<= (8 - len(chunk))  # zero-pad if last chunk is short
        result.append(byte)
    return bytes(result)


async def run(session: Session) -> None:
    """Run key exchange. Distributes the key to clients when done."""

    if session.mode == "classical":
        await _run_classical(session)
    else:
        await _run_quantum(session)


async def _run_classical(session: Session) -> None:
    # Generate a random 128-bit key
    key_bytes = os.urandom(16)
    key_b64 = base64.b64encode(key_bytes).decode()

    session.metrics.keyExchangeAttempts = 1
    session.shared_key = key_bytes

    await asyncio.sleep(1.5)  # dramatic pause

    # In classical mode, intruder silently intercepts the key
    session.metrics.intruderCapturedKey = True
    session.metrics.keyEstablished = True

    # Send key to ALL devices — intruder gets it for free (that's the point)
    await session_manager.send_to(session, "origin", make_msg(
        "key_established", key=key_b64, mode="classical"
    ))
    await session_manager.send_to(session, "target", make_msg(
        "key_established", key=key_b64, mode="classical"
    ))
    await session_manager.send_to(session, "intruder", make_msg(
        "key_established", key=key_b64, mode="classical", captured=True
    ))

    await session_manager.broadcast(session, make_msg(
        "metrics_update", metrics=session.metrics.model_dump()
    ))

    # Advance to transfer phase
    session.phase = "transferring"
    await session_manager.broadcast(session, make_msg(
        "phase_update", phase=session.phase
    ))


async def _run_quantum(session: Session) -> None:
    for attempt in range(1, MAX_ATTEMPTS + 1):
        session.metrics.keyExchangeAttempts = attempt

        result = simulate_bb84(
            num_qubits=256,
            intruder_active=session.intruder_settings.attackActive,
            interception_intensity=session.intruder_settings.interceptionIntensity,
        )

        session.metrics.qber = result["qber"]
        await session_manager.broadcast(session, make_msg(
            "metrics_update", metrics=session.metrics.model_dump()
        ))

        await asyncio.sleep(1.5)

        if result["qber"] > QBER_THRESHOLD:
            # Intruder detected — key rejected
            session.metrics.intruderDetected = True
            await session_manager.broadcast(session, make_msg(
                "metrics_update", metrics=session.metrics.model_dump()
            ))

            if attempt == MAX_ATTEMPTS:
                session.phase = "aborted"
                session.metrics.transferSuccess = False
                await session_manager.broadcast(session, make_msg(
                    "phase_update", phase=session.phase
                ))
                return
            # else: retry
        else:
            # Key accepted — derive AES key and distribute
            raw_bytes = bits_to_bytes(result["key"])
            key_bytes = derive_aes_key(raw_bytes)
            key_b64 = base64.b64encode(key_bytes).decode()

            session.shared_key = key_bytes
            session.metrics.keyEstablished = True
            session.metrics.intruderDetected = False

            # Send key to Origin + Target ONLY. Intruder does NOT get it.
            await session_manager.send_to(session, "origin", make_msg(
                "key_established", key=key_b64, mode="quantum"
            ))
            await session_manager.send_to(session, "target", make_msg(
                "key_established", key=key_b64, mode="quantum"
            ))
            # Intruder learns that key exchange succeeded but NOT the key
            await session_manager.send_to(session, "intruder", make_msg(
                "key_established", mode="quantum", captured=False
            ))

            await session_manager.broadcast(session, make_msg(
                "metrics_update", metrics=session.metrics.model_dump()
            ))

            session.phase = "transferring"
            await session_manager.broadcast(session, make_msg(
                "phase_update", phase=session.phase
            ))
            return
