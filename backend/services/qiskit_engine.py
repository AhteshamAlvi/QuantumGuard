from qiskit import QuantumCircuit
from qiskit_aer import AerSimulator

backend = AerSimulator()


def build_qubit(bit: int, basis: str) -> QuantumCircuit:
    qc = QuantumCircuit(1)

    if bit == 1:
        qc.x(0)

    if basis == "X":
        qc.h(0)

    return qc


def measure_qubit(bit: int, prep_basis: str, measure_basis: str) -> int:
    qc = build_qubit(bit, prep_basis)

    if measure_basis == "X":
        qc.h(0)

    qc.measure_all()

    result = backend.run(qc, shots=1).result()
    counts = result.get_counts()

    return int(list(counts.keys())[0])