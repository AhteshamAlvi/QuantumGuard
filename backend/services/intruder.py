# ══════════════════════════════════════════════════════════════
# services/intruder.py — REMOVED (client-driven architecture)
# ══════════════════════════════════════════════════════════════
#
# The Intruder is a real client (device), not a server simulation.
#
# - Quantum interception: handled inside qkd/bb84.py (interception_intensity)
# - Classical key capture: server sends the key to intruder in key_exchange.py
# - File relay: server routes encrypted data through intruder in ws.py
#
# The intruder client (frontend) decides what to do with the data.
# This file is intentionally empty.
