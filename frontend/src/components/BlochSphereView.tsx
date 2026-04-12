import { useMemo } from "react";

interface Props {
  bit: number;
  gateStep: number;
}

/**
 * SVG-based Bloch sphere visualization.
 * Shows a circle (the sphere) with an arrow (the state vector)
 * that changes based on which quantum gate has been applied.
 */
export function BlochSphereView({ bit, gateStep }: Props) {
  // Compute the Bloch vector [x, y, z] based on initial bit and gate progress.
  // We use a stable computation — no randomness in render.
  const vector = useMemo((): [number, number, number] => {
    // |0⟩ = north pole [0,0,1], |1⟩ = south pole [0,0,-1]
    if (gateStep === 0) {
      return bit === 0 ? [0, 0, 1] : [0, 0, -1];
    }

    // After H gate: |0⟩ → |+⟩ = [1,0,0], |1⟩ → |−⟩ = [-1,0,0]
    if (gateStep === 1) {
      return bit === 0 ? [1, 0, 0] : [-1, 0, 0];
    }

    // After X gate: flips around X axis
    if (gateStep === 2) {
      return bit === 0 ? [-1, 0, 0] : [1, 0, 0];
    }

    // Intruder measurement: collapse to Z axis (deterministic for display)
    if (gateStep === 3) {
      return bit === 0 ? [0, 0, 1] : [0, 0, -1];
    }

    // Final measurement: collapsed state
    return bit === 0 ? [0, 0, 1] : [0, 0, -1];
  }, [bit, gateStep]);

  // Project 3D → 2D (simple isometric projection)
  const cx = 100;
  const cy = 100;
  const r = 75;

  // Project: x goes right, y goes into screen (ignored for arrow), z goes up
  const arrowX = cx + vector[0] * r;
  const arrowY = cy - vector[2] * r; // z maps to vertical (inverted for SVG)

  const gateLabels = ["Initial", "H Gate", "X Gate", "Eve Measure", "Measure"];
  const stateLabels = ["|0⟩ / |1⟩", "|+⟩ / |−⟩", "|−⟩ / |+⟩", "Collapsed", "Result"];

  return (
    <div className="bloch-sphere">
      <svg width="100%" height="100%" viewBox="0 0 200 220">
        {/* Sphere outline */}
        <circle cx={cx} cy={cy} r={r} className="bloch-sphere__circle" />

        {/* Equator (horizontal ellipse) */}
        <ellipse cx={cx} cy={cy} rx={r} ry={r * 0.3} className="bloch-sphere__equator" />

        {/* Axis lines */}
        <line x1={cx} y1={cy - r - 5} x2={cx} y2={cy + r + 5} className="bloch-sphere__axis" />
        <line x1={cx - r - 5} y1={cy} x2={cx + r + 5} y2={cy} className="bloch-sphere__axis" />

        {/* Axis labels */}
        <text x={cx + 4} y={cy - r - 8} className="bloch-sphere__label">|0⟩</text>
        <text x={cx + 4} y={cy + r + 16} className="bloch-sphere__label">|1⟩</text>
        <text x={cx + r + 8} y={cy + 4} className="bloch-sphere__label">|+⟩</text>
        <text x={cx - r - 18} y={cy + 4} className="bloch-sphere__label">|−⟩</text>

        {/* State vector arrow */}
        <line
          x1={cx}
          y1={cy}
          x2={arrowX}
          y2={arrowY}
          className="bloch-sphere__vector"
        />

        {/* Arrow tip */}
        <circle cx={arrowX} cy={arrowY} r={5} className="bloch-sphere__tip" />

        {/* Gate label */}
        <text x={cx} y={205} textAnchor="middle" className="bloch-sphere__gate-label">
          {gateLabels[gateStep] ?? ""}
        </text>

        {/* State label */}
        <text x={cx} y={218} textAnchor="middle" className="bloch-sphere__state-label">
          {stateLabels[gateStep] ?? ""}
        </text>
      </svg>
    </div>
  );
}
