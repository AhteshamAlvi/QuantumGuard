// Quantum measurement simulation — mathematically equivalent to
// a single-shot Qiskit circuit with the same gates.

/** Simulate measuring a qubit prepared in prepBasis, measured in measureBasis. */
export function measureQubit(bit: number, prepBasis: string, measureBasis: string): number {
  if (prepBasis === measureBasis) return bit;
  return Math.random() < 0.5 ? 0 : 1;
}

/** Pick a random basis ("Z" or "X"). */
export function randomBasis(): string {
  return Math.random() < 0.5 ? "Z" : "X";
}
