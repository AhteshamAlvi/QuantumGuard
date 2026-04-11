# Orchestrates classical and quantum (BB84) key exchange flows.
#
# TODO [WIRING]: Implement two key exchange paths:
#
# Classical mode:
#   1. Origin generates a random key (e.g. 128 random bits).
#   2. Key is sent through the Intruder to Target (via WebSocket relay).
#   3. Intruder silently copies the key → set metrics.intruderCapturedKey = True.
#   4. Key is established immediately. Update phase to "transferring".
#
# Quantum mode (BB84):
#   1. Call qkd/bb84.py to simulate the BB84 protocol.
#   2. If Intruder is active, apply measurement interference based on
#      intruder_settings.interceptionIntensity (use services/intruder.py).
#   3. Compute QBER via qkd/metrics.py → compute_qber().
#   4. If QBER > 0.11 (standard BB84 threshold):
#        → Reject key, increment keyExchangeAttempts, broadcast metrics.
#        → Retry up to N times, then set phase to "aborted".
#   5. If QBER <= 0.11:
#        → Accept key, set keyEstablished = True, proceed to "transferring".
#
# After key exchange, broadcast a metrics_update and phase_update to all devices.
