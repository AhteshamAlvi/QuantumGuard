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
from qkd.bb84 import generate_bits, generate_bases, encode_qubits, sift_key, compute_qber
from services import session_manager

MAX_ATTEMPTS = 3
QBER_THRESHOLD = 0.11       # defines the error bound (11%)
NUM_QUBITS = 256

# converts bits into chunks of 8 (bytes)
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

# main entry function
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

    # Step 1: Origin receives/generated key
    await session_manager.send_to(session, "origin", make_msg(
        "key_generated", key=key_b64, mode="classical"
    ))

    await asyncio.sleep(0.5)

    # Step 2: Simulate transmission over channel (Origin → Target)
    if session.intruder_settings.attackActive:
        # Intruder intercepts the key
        session.metrics.intruderCapturedKey = True

        await session_manager.send_to(session, "intruder", make_msg(
            "intercepted_key", key=key_b64, mode="classical"
        ))

        await asyncio.sleep(0.5)

        # Intruder forwards the SAME key (passive MITM)
        await session_manager.send_to(session, "target", make_msg(
            "key_established",
            key=key_b64,
            mode="classical",
            via="intruder"
        ))
    else:
        # No attacker → direct delivery
        await session_manager.send_to(session, "target", make_msg(
            "key_established",
            key=key_b64,
            mode="classical",
            via="direct"
        ))

    # Step 3: Update metrics
    session.metrics.keyEstablished = True

    await session_manager.broadcast(session, make_msg(
        "metrics_update",
        metrics=session.metrics.model_dump()
    ))

    # Step 4: Advance phase
    session.phase = "transferring"
    await session_manager.broadcast(session, make_msg(
        "phase_update", phase=session.phase
    ))

# runs the quantum protocol
async def _run_quantum(session: Session) -> None:
    # Phase 1: Origin prepares
    origin_bits = generate_bits(NUM_QUBITS)
    origin_bases = generate_bases(NUM_QUBITS)

    session.metrics.keyExchangeAttempts += 1

    # Send preparation info to Origin
    await session_manager.send_to(session, "origin", make_msg(
        "bb84_prepare",
        bits=origin_bits,
        bases=origin_bases
    ))

    await asyncio.sleep(0.5)

    # Phase 2: Transmission (MITM routing)
    encoded = encode_qubits(origin_bits, origin_bases)

    if "intruder" in session.devices:
        # Route through intruder
        await session_manager.send_to(session, "intruder", make_msg(
            "bb84_transmit",
            qubits=encoded
        ))
    else:
        # Direct to target
        await session_manager.send_to(session, "target", make_msg(
            "bb84_transmit",
            qubits=encoded
        ))

    # Phase 3: Wait for Target measurement
    # Target will send back measurement via WebSocket
    timeout = 10  # seconds
    start = asyncio.get_event_loop().time()

    while True:
        if session.bb84 is not None:
            break

        if asyncio.get_event_loop().time() - start > timeout:
            session.phase = "aborted"
            session.metrics.transferSuccess = False

            await session_manager.broadcast(session, make_msg(
                "phase_update", 
                phase=session.phase
            ))
            session.bb84 = None
            return

        await asyncio.sleep(0.1)

    target_bits = session.bb84_target_bits
    target_bases = session.bb84_target_bases

    # Phase 4: Compute QBER + sift key
    qber = compute_qber(origin_bits, target_bits, origin_bases, target_bases)
    key_bits = sift_key(origin_bits, origin_bases, target_bits, target_bases)

    session.metrics.qber = qber

    # Phase 5: Decide outcome
    if qber > QBER_THRESHOLD:
        # Intruder detected
        session.metrics.intruderDetected = True
        session.metrics.keyEstablished = False
        session.metrics.transferSuccess = False

        session.phase = "aborted"

        await session_manager.broadcast(session, make_msg(
            "bb84_result",
            qber=qber,
            detected=True
        ))

        await session_manager.broadcast(session, make_msg(
            "phase_update",
            phase=session.phase
        ))
        session.bb84 = None
        return

    # ── Phase 6: Key accepted
    raw_bytes = bits_to_bytes(key_bits)
    key_bytes = derive_aes_key(raw_bytes)    
    key_b64 = base64.b64encode(key_bytes).decode()

    session.shared_key = key_bytes
    session.metrics.keyEstablished = True
    session.metrics.intruderDetected = False

    # Send key to Origin + Target ONLY
    await session_manager.send_to(session, "origin", make_msg(
        "key_established",
        key=key_b64,
        mode="quantum"
    ))

    await session_manager.send_to(session, "target", make_msg(
        "key_established",
        key=key_b64,
        mode="quantum"
    ))

    # Intruder only learns success/failure
    if "intruder" in session.devices:
        await session_manager.send_to(session, "intruder", make_msg(
            "key_established",
            mode="quantum",
            captured=False
        ))

    # Phase 7: Broadcast metrics + advance
    await session_manager.broadcast(session, make_msg(
        "metrics_update",
        metrics=session.metrics.model_dump()
    ))

    session.phase = "transferring"

    await session_manager.broadcast(session, make_msg(
        "phase_update",
        phase=session.phase
    ))

    session.bb84 = None