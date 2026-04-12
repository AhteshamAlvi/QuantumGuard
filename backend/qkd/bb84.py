# ══════════════════════════════════════════════════════════════
# qkd/bb84.py — BB84 Quantum Key Distribution Simulation
# ══════════════════════════════════════════════════════════════
# Holds all the helpers for the sim

import random

def generate_bits(n: int) -> list[int]:
    return [random.randint(0, 1) for _ in range(n)]

def generate_bases(n: int) -> list[str]:  # "Z" or "X"
    return [random.choice(["Z", "X"]) for _ in range(n)]

def encode_qubits(bits: list[int], bases: list[str]) -> list[dict]:
    return [{"bit": bit, "basis": basis} for bit, basis in zip(bits, bases)]

def should_intercept(active: bool, intensity: float) -> bool:
    if not active:
        return False

    return random.random() < intensity

def intercept_choose_basis() -> str:
    return random.choice(["Z", "X"])

# finds which bases don't match between origin and target. If bases match keep the bit, If not discard it
def sift_key(origin_bits: list[int], origin_bases: list[str], target_bits: list[int], target_bases: list[str]) -> list[int]:
    key = []

    for i in range(len(origin_bits)):
        if origin_bases[i] == target_bases[i]:
            key.append(origin_bits[i])

    return key

def compute_qber(origin_bits: list[int], target_bits: list[int], origin_bases: list[str], target_bases: list[str]) -> float:
    errors = 0
    total = 0

    for i in range(len(origin_bits)):
        if origin_bases[i] == target_bases[i]:
            total += 1
            if origin_bits[i] != target_bits[i]:
                errors += 1

    if total == 0:
        return 0.0

    return errors / total