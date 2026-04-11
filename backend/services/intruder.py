# Simulates the man-in-the-middle attacker.
#
# TODO [WIRING]: Implement MITM behavior based on mode and intruder settings:
#
# Classical mode:
#   - Intercept the key during key exchange → store a copy.
#   - During file transfer, decrypt each chunk using the captured key,
#     store/log the plaintext, then re-encrypt and forward to Target.
#   - The Intruder obtains full file access without detection.
#
# Quantum mode (BB84):
#   - If attackActive is True:
#       Simulate measuring quantum states during BB84. This introduces
#       errors proportional to interceptionIntensity. Pass the intensity
#       to qkd/bb84.py so it can model the measurement disturbance.
#   - If attackActive is False:
#       Relay qubits without measurement (passive). No errors introduced.
#       The Intruder cannot obtain the key.
#
# Interface (called by services/key_exchange.py and services/file_transfer.py):
#
#   intercept_key(key, mode, settings) → key
#       Classical: returns key (and stores copy). Quantum: N/A.
#
#   apply_quantum_interference(qubits, settings) → disturbed_qubits
#       Models measurement disturbance for BB84 simulation.
#
#   relay_chunk(chunk, mode, captured_key) → chunk
#       Classical: decrypt, store plaintext, re-encrypt. Quantum: passthrough.
