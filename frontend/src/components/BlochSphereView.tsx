import { useMemo, useState, useRef, useCallback, useEffect } from "react";

interface Props {
  bit: number;
  gateStep: number;
}

/**
 * Interactive Bloch sphere — drag to rotate the viewing angle.
 * The state vector updates based on the current gate step.
 */
export function BlochSphereView({ bit, gateStep }: Props) {
  /* ── Camera angles (user-draggable) ── */
  const [theta, setTheta] = useState(-0.35);   // vertical tilt
  const [phi, setPhi]     = useState(0.45);     // horizontal rotation
  const dragging = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  /* ── Drag handlers ── */
  const onPointerDown = useCallback((e: React.PointerEvent) => {
    dragging.current = true;
    lastMouse.current = { x: e.clientX, y: e.clientY };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current) return;
    const dx = e.clientX - lastMouse.current.x;
    const dy = e.clientY - lastMouse.current.y;
    lastMouse.current = { x: e.clientX, y: e.clientY };
    setPhi(prev => prev + dx * 0.008);
    setTheta(prev => Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, prev - dy * 0.008)));
  }, []);

  const onPointerUp = useCallback(() => {
    dragging.current = false;
  }, []);

  /* ── Smooth auto-rotation when not dragging ── */
  const autoRotRef = useRef<number | null>(null);
  useEffect(() => {
    const spin = () => {
      if (!dragging.current) {
        setPhi(p => p + 0.003);
      }
      autoRotRef.current = requestAnimationFrame(spin);
    };
    autoRotRef.current = requestAnimationFrame(spin);
    return () => { if (autoRotRef.current) cancelAnimationFrame(autoRotRef.current); };
  }, []);

  /* ── Compute Bloch vector from bit + gateStep ── */
  const vector = useMemo((): [number, number, number] => {
    // |0⟩ = north pole [0,0,1], |1⟩ = south pole [0,0,-1]
    if (gateStep === 0) return bit === 0 ? [0, 0, 1] : [0, 0, -1];
    // H gate: |0⟩→|+⟩=[1,0,0], |1⟩→|−⟩=[-1,0,0]
    if (gateStep === 1) return bit === 0 ? [1, 0, 0] : [-1, 0, 0];
    // X gate: flip
    if (gateStep === 2) return bit === 0 ? [-1, 0, 0] : [1, 0, 0];
    // Eve measure: collapse to Z
    if (gateStep === 3) return bit === 0 ? [0, 0, 1] : [0, 0, -1];
    // Final measurement
    return bit === 0 ? [0, 0, 1] : [0, 0, -1];
  }, [bit, gateStep]);

  /* ── 3D → 2D projection ── */
  const project = useCallback((x3: number, y3: number, z3: number): [number, number, number] => {
    // Rotate around Y axis (phi)
    const x1 = x3 * Math.cos(phi) + z3 * Math.sin(phi);
    const z1 = -x3 * Math.sin(phi) + z3 * Math.cos(phi);
    const y1 = y3;
    // Rotate around X axis (theta)
    const y2 = y1 * Math.cos(theta) - z1 * Math.sin(theta);
    const z2 = y1 * Math.sin(theta) + z1 * Math.cos(theta);
    const x2 = x1;
    return [x2, y2, z2];
  }, [theta, phi]);

  const CX = 140;
  const CY = 130;
  const R  = 100;

  const proj2d = useCallback((x3: number, y3: number, z3: number): { x: number; y: number; z: number } => {
    const [px, py, pz] = project(x3, y3, z3);
    return { x: CX + px * R, y: CY - py * R, z: pz };
  }, [project]);

  /* ── Precompute sphere wireframe ── */
  const wireframe = useMemo(() => {
    const lines: { x1: number; y1: number; x2: number; y2: number; opacity: number }[] = [];
    const steps = 48;

    // Longitude lines (vertical great circles)
    for (let j = 0; j < 6; j++) {
      const angle = (j / 6) * Math.PI;
      for (let i = 0; i < steps; i++) {
        const a1 = (i / steps) * Math.PI * 2;
        const a2 = ((i + 1) / steps) * Math.PI * 2;

        const p1 = proj2d(Math.cos(a1) * Math.cos(angle), Math.sin(a1), Math.cos(a1) * Math.sin(angle));
        const p2 = proj2d(Math.cos(a2) * Math.cos(angle), Math.sin(a2), Math.cos(a2) * Math.sin(angle));

        const avgZ = (p1.z + p2.z) / 2;
        const opacity = 0.08 + Math.max(0, avgZ) * 0.15;

        lines.push({ x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y, opacity });
      }
    }

    // Latitude lines (horizontal circles)
    for (let j = -2; j <= 2; j++) {
      const lat = (j / 3) * (Math.PI / 2);
      const cr = Math.cos(lat);
      const sr = Math.sin(lat);
      for (let i = 0; i < steps; i++) {
        const a1 = (i / steps) * Math.PI * 2;
        const a2 = ((i + 1) / steps) * Math.PI * 2;
        const p1 = proj2d(cr * Math.cos(a1), sr, cr * Math.sin(a1));
        const p2 = proj2d(cr * Math.cos(a2), sr, cr * Math.sin(a2));
        const avgZ = (p1.z + p2.z) / 2;
        const opacity = 0.06 + Math.max(0, avgZ) * 0.12;
        lines.push({ x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y, opacity });
      }
    }

    return lines;
  }, [proj2d]);

  /* ── Axis endpoints ── */
  const axisEnds = useMemo(() => {
    const pZ  = proj2d(0, 1, 0);  // |0⟩ top
    const nZ  = proj2d(0, -1, 0); // |1⟩ bottom
    const pX  = proj2d(1, 0, 0);  // |+⟩
    const nX  = proj2d(-1, 0, 0); // |−⟩
    const pY  = proj2d(0, 0, 1);  // |+i⟩
    const nY  = proj2d(0, 0, -1); // |−i⟩
    return { pZ, nZ, pX, nX, pY, nY };
  }, [proj2d]);

  /* ── State vector projection ── */
  const vecEnd = useMemo(() => {
    // Bloch vector: x→X axis, z→Y(up) axis, y→Z(into screen)
    const [vx, vy, vz] = vector;
    return proj2d(vx, vz, vy);
  }, [vector, proj2d]);

  const origin2d = proj2d(0, 0, 0);

  const gateLabels = ["Initial", "H Gate", "X Gate", "Eve Measure", "Measure"];
  const stateLabels = ["|0⟩ / |1⟩", "|+⟩ / |−⟩", "|−⟩ / |+⟩", "Collapsed", "Result"];

  return (
    <div
      ref={containerRef}
      className="bloch-sphere"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
      style={{ cursor: dragging.current ? "grabbing" : "grab", touchAction: "none" }}
    >
      <svg width="100%" height="100%" viewBox="0 0 280 290" preserveAspectRatio="xMidYMid meet">

        {/* Wireframe sphere */}
        {wireframe.map((l, i) => (
          <line
            key={i}
            x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
            stroke={`rgba(139,92,246,${l.opacity.toFixed(3)})`}
            strokeWidth={0.8}
          />
        ))}

        {/* Axes */}
        <line x1={axisEnds.nZ.x} y1={axisEnds.nZ.y} x2={axisEnds.pZ.x} y2={axisEnds.pZ.y}
          stroke="rgba(255,255,255,0.15)" strokeWidth={1} />
        <line x1={axisEnds.nX.x} y1={axisEnds.nX.y} x2={axisEnds.pX.x} y2={axisEnds.pX.y}
          stroke="rgba(255,255,255,0.15)" strokeWidth={1} />
        <line x1={axisEnds.nY.x} y1={axisEnds.nY.y} x2={axisEnds.pY.x} y2={axisEnds.pY.y}
          stroke="rgba(255,255,255,0.1)" strokeWidth={0.7} />

        {/* Axis labels */}
        <text x={axisEnds.pZ.x + 6} y={axisEnds.pZ.y - 4} className="bloch-sphere__label">|0⟩</text>
        <text x={axisEnds.nZ.x + 6} y={axisEnds.nZ.y + 14} className="bloch-sphere__label">|1⟩</text>
        <text x={axisEnds.pX.x + 8} y={axisEnds.pX.y + 4} className="bloch-sphere__label">|+⟩</text>
        <text x={axisEnds.nX.x - 22} y={axisEnds.nX.y + 4} className="bloch-sphere__label">|−⟩</text>

        {/* State vector arrow */}
        <line
          x1={origin2d.x} y1={origin2d.y}
          x2={vecEnd.x} y2={vecEnd.y}
          className="bloch-sphere__vector"
        />

        {/* Arrow tip */}
        <circle cx={vecEnd.x} cy={vecEnd.y} r={6} className="bloch-sphere__tip" />

        {/* Centre dot */}
        <circle cx={origin2d.x} cy={origin2d.y} r={2} fill="rgba(255,255,255,0.3)" />

        {/* Gate label */}
        <text x={CX} y={268} textAnchor="middle" className="bloch-sphere__gate-label">
          {gateLabels[gateStep] ?? ""}
        </text>

        {/* State label */}
        <text x={CX} y={283} textAnchor="middle" className="bloch-sphere__state-label">
          {stateLabels[gateStep] ?? ""}
        </text>
      </svg>
    </div>
  );
}
