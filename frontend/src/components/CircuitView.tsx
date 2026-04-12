import { useEffect, useState } from "react";

interface CircuitViewProps {
  streaming: boolean;
  totalBits: number;
  receiverBits: (number | null)[];
}

type Particle = {
  id: number;
  progress: number;   // 0 → 1
  alive: boolean;
  intercepted: boolean;
};

const WIDTH = 600;
const START_X = 40;
const END_X = 560;

// Wire Y positions
const Y_ORIGIN = 50;
const Y_INTRUDER = 90;
const Y_TARGET = 130;

// Where interception happens (middle of circuit)
const INTERCEPT_X = 300;

export function CircuitView({ streaming, totalBits, receiverBits }: CircuitViewProps) {
  const [particles, setParticles] = useState<Particle[]>([]);

  // Build particles from incoming bits
  useEffect(() => {
    if (totalBits === 0) return;

    const newParticles: Particle[] = receiverBits.map((bit, i) => {
      const receivedCount = receiverBits
        .slice(0, i + 1)
        .filter(b => b !== null).length;

      const progress = receivedCount / totalBits;

      const alive = bit !== null;

      // Simple interception logic (visual)
      const intercepted = !alive && progress > 0.3;

      return {
        id: i,
        progress,
        alive,
        intercepted,
      };
    });

    setParticles(newParticles);
  }, [receiverBits, totalBits]);

  return (
    <div className={`circuit ${streaming ? "circuit--active" : ""}`}>
      <svg width="100%" height="100%" viewBox="0 0 600 180">

        {/* ── Labels ───────────────────────── */}
        <text x="20" y={Y_ORIGIN - 20} className="circuit-label">Origin</text>
        <text x="20" y={Y_INTRUDER - 20} className="circuit-label circuit-label--intruder">Intruder</text>
        <text x="20" y={Y_TARGET - 20} className="circuit-label">Target</text>

        {/* ── Wires ───────────────────────── */}
        <line x1={START_X} y1={Y_ORIGIN} x2={END_X} y2={Y_ORIGIN} className="wire" />
        <line x1={START_X} y1={Y_INTRUDER} x2={END_X} y2={Y_INTRUDER} className="wire wire--intruder" />
        <line x1={START_X} y1={Y_TARGET} x2={END_X} y2={Y_TARGET} className="wire" />

        {/* ── Intercept vertical line ─────── */}
        <line
          x1={INTERCEPT_X}
          y1={Y_ORIGIN}
          x2={Y_TARGET}
          className="circuit__intercept-line"
        />

        {/* ── Gates: Origin ───────────────── */}
        <rect x="120" y={Y_ORIGIN - 15} width="30" height="30" className="gate" />
        <text x="135" y={Y_ORIGIN + 5} textAnchor="middle">H</text>

        <rect x="200" y={Y_ORIGIN - 15} width="30" height="30" className="gate" />
        <text x="215" y={Y_ORIGIN + 5} textAnchor="middle">X</text>

        {/* ── Intruder gate ───────────────── */}
        <rect x={INTERCEPT_X - 15} y={Y_INTRUDER - 15} width="30" height="30" className="gate gate--intruder" />
        <text x={INTERCEPT_X} y={Y_INTRUDER + 5} textAnchor="middle" className="intruder-text">
          E
        </text>

        {/* ── Target gates ───────────────── */}
        <rect x="380" y={Y_TARGET - 15} width="30" height="30" className="gate" />
        <text x="395" y={Y_TARGET + 5} textAnchor="middle">H</text>

        <rect x="460" y={Y_TARGET - 15} width="30" height="30" className="gate measure" />
        <text x="475" y={Y_TARGET + 5} textAnchor="middle">M</text>

        {/* ── PARTICLES (render BEFORE gates for layering) ───── */}
        {particles.map(p => {
          const x = START_X + p.progress * (END_X - START_X);

          // Choose which wire it's on
          let y = Y_ORIGIN;

          if (p.intercepted && x > INTERCEPT_X - 10 && x < INTERCEPT_X + 10) {
            y = Y_INTRUDER;
          } else if (x >= INTERCEPT_X) {
            y = Y_TARGET;
          }

          // Dead particles fade out early
          if (!p.alive && p.progress > 0.7) return null;

          return (
            <circle
              key={p.id}
              cx={x}
              cy={y}
              r={4}
              className={
                "qubit " +
                (p.intercepted ? "qubit--intercepted " : "") +
                (!p.alive ? "qubit--dead" : "")
              }
            />
          );
        })}

      </svg>
    </div>
  );
}