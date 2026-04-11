# ══════════════════════════════════════════════════════════════
# qkd/bb84.py — BB84 Quantum Key Distribution Simulation
# ══════════════════════════════════════════════════════════════
#
# This is the core quantum physics simulation. It models the full
# BB84 protocol between two parties (Origin and Target) with an
# optional eavesdropper (Intruder).
#
# BB84 crash course:
#   - Origin picks random bits and random bases (rectilinear + or diagonal x).
#   - Each bit+basis encodes a "qubit" (polarized photon state).
#   - Target picks random bases independently and "measures" each qubit.
#   - If bases match, the measured bit equals the sent bit (no error).
#   - If bases don't match, the result is random (50/50).
#   - After measurement, both sides publicly compare BASES (not bits).
#   - They keep only the bits where bases matched → this is the "sifted key".
#   - They sacrifice a random subset of the sifted key to compute QBER.
#   - If QBER > threshold (0.11), an eavesdropper is present → abort.
#
# ── Utilities (merged from old utils.py and metrics.py) ──────
#
# def random_bits(n: int) -> list[int]:
#     """Generate n random bits (0 or 1)."""
#     import random
#     return [random.randint(0, 1) for _ in range(n)]
#
# def random_bases(n: int) -> list[int]:
#     """Generate n random bases. 0 = rectilinear (+), 1 = diagonal (x)."""
#     Same implementation as random_bits — bases are also 0/1.
#
# def compute_qber(errors: int, total: int) -> float:
#     """Quantum Bit Error Rate = mismatches / checked bits."""
#     return errors / total if total > 0 else 0.0
#
# ── Core Protocol ────────────────────────────────────────────
#
# def simulate_bb84(
#     num_qubits: int = 256,
#     intruder_active: bool = False,
#     interception_intensity: float = 0.5,
# ) -> dict:
#     """
#     Run a full BB84 key exchange simulation. Returns a dict with
#     all the data the backend needs to update metrics and decide
#     whether to accept or reject the key.
#
#     Steps:
#
#     1. ORIGIN PREPARES
#        - origin_bits  = random_bits(num_qubits)
#        - origin_bases = random_bases(num_qubits)
#        - Each (bit, basis) pair represents a qubit:
#            basis 0, bit 0 → |0⟩    (horizontal)
#            basis 0, bit 1 → |1⟩    (vertical)
#            basis 1, bit 0 → |+⟩    (diagonal 45°)
#            basis 1, bit 1 → |−⟩    (diagonal 135°)
#
#     2. INTRUDER INTERCEPTS (if active)
#        - For each qubit, with probability = interception_intensity:
#            - Intruder picks a random basis and "measures" the qubit.
#            - If intruder's basis matches origin's → bit is unchanged.
#            - If bases differ → bit is randomized (50% chance of flip).
#            - The qubit is then "re-sent" in the intruder's basis.
#              This is the key insight: measurement disturbs the state.
#        - With probability (1 - interception_intensity):
#            - Qubit passes through untouched.
#        - Track how many qubits the intruder measured (for logging).
#
#     3. TARGET MEASURES
#        - target_bases = random_bases(num_qubits)
#        - For each qubit:
#            - If target_basis == sending_basis (origin's, or intruder's
#              if intruder re-sent): bit = the sent bit.
#            - If bases differ: bit = random (50/50).
#            - Note: "sending_basis" is origin_basis if intruder didn't
#              touch it, or intruder_basis if intruder re-sent it.
#
#     4. BASIS RECONCILIATION (public channel — intruder can see this)
#        - Compare origin_bases and target_bases publicly.
#        - Keep only indices where bases match → "sifted" indices.
#        - sifted_origin_bits = [origin_bits[i] for i in sifted]
#        - sifted_target_bits = [target_bits[i] for i in sifted]
#
#     5. ERROR ESTIMATION
#        - Pick a random subset of the sifted bits (e.g. 50%) as "check bits".
#        - Count mismatches between origin and target check bits.
#        - qber = compute_qber(mismatches, len(check_bits))
#        - The remaining sifted bits (non-check) become the final key.
#
#     6. RETURN
#        Return a dict:
#        {
#            "key": final_key_bits (list[int]) or None if QBER too high,
#            "qber": float,
#            "sifted_count": int,        — how many bits survived sifting
#            "check_count": int,         — how many were used for QBER check
#            "error_count": int,         — mismatches in check bits
#            "intruder_measured": int,   — how many qubits intruder touched
#            "key_length": int,          — length of the final key (0 if rejected)
#        }
#
#     The caller (services/key_exchange.py) checks qber against the
#     threshold and decides to accept or reject.
#     """
#
# ── Notes ────────────────────────────────────────────────────
#
# - Use numpy for vectorized operations if you want speed, but
#   plain Python lists + random module work fine for 256-512 qubits.
# - num_qubits=256 gives ~64 sifted bits after basis matching
#   (~50% match) and ~32 final key bits after check bit sacrifice.
#   That's enough for a demo. Increase for more visual drama.
# - The interception_intensity parameter is key: at 1.0 the intruder
#   measures every qubit; at 0.0 they're fully passive. This maps
#   directly to the slider in the Intruder UI.
# - This file should be self-contained — no imports from services/
#   or routes/. It's a pure simulation, called by key_exchange.py.
