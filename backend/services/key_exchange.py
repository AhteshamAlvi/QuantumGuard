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
from qkd.bb84 import generate_bits, generate_bases, encode_qubits, should_intercept, intercept_choose_basis, sift_key, compute_qber
from services import session_manager
from services.qiskit_engine import measure_qubit

QBER_THRESHOLD = 0.11       # defines the error bound (11%)
NUM_QUBITS = 256
MAX_ATTEMPTS = 100

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

    # Step 2: Simulate transmission over channel
    if "intruder" in session.devices and session.intruder_settings.attackActive:
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
    while session.metrics.keyExchangeAttempts < MAX_ATTEMPTS:
        # Reset BB84 state for this attempt
        session.bb84_ready = False
        session.bb84_target_bits = []
        session.bb84_target_bases = []

        # ── Phase 1: Origin prepares qubits ──
        origin_bits = generate_bits(NUM_QUBITS)
        origin_bases = generate_bases(NUM_QUBITS)

        session.metrics.keyExchangeAttempts += 1
        session.bb84_origin_bits = origin_bits
        session.bb84_origin_bases = origin_bases

        # Tell Origin what they prepared
        await session_manager.send_to(session, "origin", make_msg(
            "bb84_prepare",
            bits=origin_bits,
            bases=origin_bases,
            count=NUM_QUBITS,
        ))

        await asyncio.sleep(0.5)

        # Intruder doesn't manually do stuff. Server applies interception using Qiskit, then tells intruder what happened.
        qubits = encode_qubits(origin_bits, origin_bases)
        intruder_active = (
            "intruder" in session.devices
            and session.intruder_settings.attackActive
        )
        intercepted_count = 0

        if intruder_active:
            intensity = session.intruder_settings.interceptionIntensity
            for i, q in enumerate(qubits):
                if should_intercept(True, intensity):
                    intercepted_count += 1
                    eve_basis = intercept_choose_basis()
                    # Qiskit measures the qubit — collapses it
                    measured_bit = measure_qubit(q["bit"], q["basis"], eve_basis)
                    # Eve re-sends in her own basis (disturbs state)
                    qubits[i] = {"bit": measured_bit, "basis": eve_basis}

            # Tell intruder what they intercepted (summary, not the key)
            await session_manager.send_to(session, "intruder", make_msg(
                "bb84_intercept_result",
                intercepted=intercepted_count,
                total=NUM_QUBITS,
                intensity=intensity,
            ))

        await asyncio.sleep(0.5)

        # Target receives the batch (possibly disturbed by intruder)
        await session_manager.send_to(session, "target", make_msg(
            "bb84_transmit",
            qubits=qubits,
        ))

        timeout = 15  # seconds
        start = asyncio.get_event_loop().time()

        while True:
            if session.bb84_ready:
                break

            if asyncio.get_event_loop().time() - start > timeout:
                session.phase = "aborted"
                session.metrics.transferSuccess = False
                await session_manager.broadcast(session, make_msg(
                    "phase_update", phase=session.phase
                ))
                return

            await asyncio.sleep(0.1)

        target_bits = session.bb84_target_bits
        target_bases = session.bb84_target_bases

        # QBER and sift key
        qber = compute_qber(origin_bits, target_bits, origin_bases, target_bases)
        key_bits = sift_key(origin_bits, origin_bases, target_bits, target_bases)
        session.metrics.qber = qber

        # Broadcast QBER to all devices
        await session_manager.broadcast(session, make_msg(
            "bb84_result",
            qber=qber,
            sifted_key_length=len(key_bits),
            detected=qber > QBER_THRESHOLD,
        ))

        await asyncio.sleep(0.5)

        # decides the outcome
        if qber < QBER_THRESHOLD:
            # if the key was accepted, rebuilds the key and then transfers the file
            raw_bytes = bits_to_bytes(key_bits)
            key_bytes = derive_aes_key(raw_bytes)
            key_b64 = base64.b64encode(key_bytes).decode()

            session.shared_key = key_bytes
            session.metrics.keyEstablished = True
            session.metrics.intruderDetected = False

            # Origin gets key
            await session_manager.send_to(session, "origin", make_msg(
                "key_established", key=key_b64, mode="quantum"
            ))

            await asyncio.sleep(0.3)

            # Key travels over channel so that the intruder can't capture it
            if "intruder" in session.devices:
                await session_manager.send_to(session, "intruder", make_msg(
                    "key_established",
                    mode="quantum",
                    captured=False,
                    reason="QBER within threshold — key bits are secure",
                ))
                await asyncio.sleep(0.3)

            # Target gets key
            await session_manager.send_to(session, "target", make_msg(
                "key_established", key=key_b64, mode="quantum"
            ))

            await session_manager.broadcast(session, make_msg(
                "metrics_update", metrics=session.metrics.model_dump()
            ))

            session.phase = "transferring"

            await session_manager.broadcast(session, make_msg(
                "phase_update", phase=session.phase
            ))
            return

        # Intrusion detected — notify all clients and retry
        session.metrics.intruderDetected = True
        session.metrics.keyEstablished = False

        await session_manager.broadcast(session, make_msg(
            "metrics_update", metrics=session.metrics.model_dump()
        ))
        await session_manager.broadcast(session, make_msg(
            "bb84_retry",
            attempt=session.metrics.keyExchangeAttempts,
            max_attempts=MAX_ATTEMPTS,
            qber=qber,
        ))

        # Pause so users can see the retry message before next attempt
        await asyncio.sleep(2.0)
        continue
    
    session.phase = "aborted"
    await session_manager.broadcast(session, make_msg(
        "phase_update", phase=session.phase
    ))