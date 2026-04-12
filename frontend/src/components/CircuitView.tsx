import { useEffect, useRef, useState } from "react";

interface CircuitViewProps {
  streaming: boolean;
  totalBits: number;
  receiverBits: (number | null)[];
  onActiveChange?: (bitIndex: number, gateStep: number) => void;
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

const MAX_VISIBLE = 40;

export function CircuitView({ streaming, totalBits, receiverBits, onActiveChange }: CircuitViewProps) {
  const [particles, setParticles] = useState<Particle[]>([]);
  const animRef = useRef<number | null>(null);
  const onActiveChangeRef = useRef(onActiveChange);

  // Keep the callback ref fresh without re-triggering the animation
  useEffect(() => {
    onActiveChangeRef.current = onActiveChange;
  }, [onActiveChange]);

  // Animate particles based on incoming bits
  useEffect(() => {
    if (totalBits === 0) return;

    const start = performance.now();

    const animate = () => {
      const now = performance.now();
      const elapsed = now - start;

      // Only consider recent particles
      const filled = receiverBits.filter(b => b !== null).length;
      const startIndex = Math.max(0, filled - MAX_VISIBLE);

      const visibleBits = receiverBits.slice(startIndex, startIndex + MAX_VISIBLE);

      const newParticles: Particle[] = visibleBits.map((bit, localIndex) => {
        const delay = localIndex * 60;
        const duration = 1500;

        const t = Math.max(0, elapsed - delay);
        const progress = Math.min(t / duration, 1);

        const alive = bit !== null;
        const intercepted = !alive && progress > 0.4;

        return {
          id: startIndex + localIndex,
          progress,
          alive,
          intercepted,
        };
      });

      setParticles(newParticles);

      // Notify parent about the leading particle (via ref, not during render)
      const leading = newParticles[newParticles.length - 1];
      if (leading && onActiveChangeRef.current) {
        const x = START_X + leading.progress * (END_X - START_X);
        const gateStep =
          x < 150 ? 0 :
          x < 230 ? 1 :
          x < 320 ? 2 :
          x < 420 ? 3 :
          4;
        onActiveChangeRef.current(leading.id, gateStep);
      }

      animRef.current = requestAnimationFrame(animate);
    };

    animRef.current = requestAnimationFrame(animate);

    // Cleanup: cancel animation frame on unmount or re-run
    return () => {
      if (animRef.current !== null) {
        cancelAnimationFrame(animRef.current);
        animRef.current = null;
      }
    };
  }, [receiverBits, totalBits]);

  return (
    <div className={`circuit ${streaming ? "circuit--active" : ""}`}>
      <svg width="100%" height="100%" viewBox={`0 0 ${WIDTH} 180`}>

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
          x2={INTERCEPT_X}
          y2={Y_TARGET}
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

        {/* ── Particles ───── */}
        {particles.map(p => {
          if (!p.alive && p.progress >= 1) return null;

          const x = START_X + p.progress * (END_X - START_X);

          // Choose which wire it's on
          let y = Y_ORIGIN;
          if (p.progress < 0.5) {
            y = Y_ORIGIN;
          } else if (p.intercepted) {
            y = Y_INTRUDER;
          } else {
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
