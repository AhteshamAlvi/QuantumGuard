import { useEffect, useRef, useState, useCallback } from "react";

interface CircuitViewProps {
  streaming: boolean;
  totalBits: number;
  receiverBits: (number | null)[];
  onActiveChange?: (bitIndex: number, gateStep: number) => void;
}

type Particle = {
  id: number;
  startTime: number;
  alive: boolean;
};

const WIDTH = 900;
const HEIGHT = 200;
const START_X = 60;
const END_X = 840;
const TRAVEL_TIME = 3000; // ms for a particle to cross the circuit

// Wire Y positions
const Y_ORIGIN = 60;
const Y_INTRUDER = 110;
const Y_TARGET = 160;

// Gate X positions (scaled to new width)
const GATE_H1_X = 180;
const GATE_X_X = 300;
const INTERCEPT_X = 450;
const GATE_H2_X = 600;
const GATE_M_X = 740;

const MAX_PARTICLES = 20;

export function CircuitView({ streaming, totalBits, receiverBits, onActiveChange }: CircuitViewProps) {
  const [particles, setParticles] = useState<Particle[]>([]);
  const animRef = useRef<number | null>(null);
  const onActiveChangeRef = useRef(onActiveChange);
  const lastAddedRef = useRef(-1);

  useEffect(() => {
    onActiveChangeRef.current = onActiveChange;
  }, [onActiveChange]);

  // Track new bits arriving and spawn particles
  useEffect(() => {
    const arrivedCount = receiverBits.filter(b => b !== null).length;

    if (arrivedCount > lastAddedRef.current) {
      const now = performance.now();
      const newParticles: Particle[] = [];

      for (let i = lastAddedRef.current + 1; i < arrivedCount; i++) {
        newParticles.push({
          id: i,
          startTime: now + (i - lastAddedRef.current - 1) * 100,
          alive: true,
        });
      }

      lastAddedRef.current = arrivedCount - 1;

      setParticles(prev => {
        const combined = [...prev, ...newParticles];
        // Keep only the most recent particles to avoid overload
        if (combined.length > MAX_PARTICLES) {
          return combined.slice(combined.length - MAX_PARTICLES);
        }
        return combined;
      });
    }
  }, [receiverBits]);

  // Reset when stream resets
  useEffect(() => {
    if (totalBits === 0) {
      setParticles([]);
      lastAddedRef.current = -1;
    }
  }, [totalBits]);

  // Animation loop
  const animate = useCallback(() => {
    const now = performance.now();

    setParticles(prev => {
      const updated = prev
        .map(p => {
          const elapsed = now - p.startTime;
          if (elapsed > TRAVEL_TIME + 500) {
            return null; // remove old particles
          }
          return p;
        })
        .filter(Boolean) as Particle[];
      return updated;
    });

    // Update Bloch sphere based on leading particle
    if (onActiveChangeRef.current && particles.length > 0) {
      const leading = particles[particles.length - 1];
      if (leading) {
        const elapsed = now - leading.startTime;
        const progress = Math.min(Math.max(elapsed / TRAVEL_TIME, 0), 1);
        const x = START_X + progress * (END_X - START_X);

        const gateStep =
          x < GATE_H1_X + 20 ? 0 :
          x < GATE_X_X + 20 ? 1 :
          x < INTERCEPT_X + 20 ? 2 :
          x < GATE_H2_X + 20 ? 3 :
          4;

        onActiveChangeRef.current(leading.id, gateStep);
      }
    }

    animRef.current = requestAnimationFrame(animate);
  }, [particles]);

  // Start/stop animation loop
  useEffect(() => {
    if (particles.length > 0 || streaming) {
      animRef.current = requestAnimationFrame(animate);
    }

    return () => {
      if (animRef.current !== null) {
        cancelAnimationFrame(animRef.current);
        animRef.current = null;
      }
    };
  }, [animate, streaming]);

  const now = performance.now();

  return (
    <div className={`circuit ${streaming ? "circuit--active" : ""}`}>
      <svg width="100%" height="100%" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} preserveAspectRatio="xMidYMid meet">

        {/* ── Labels ───────────────────────── */}
        <text x={START_X - 10} y={Y_ORIGIN - 18} className="circuit-label" textAnchor="end">Origin</text>
        <text x={START_X - 10} y={Y_INTRUDER - 18} className="circuit-label circuit-label--intruder" textAnchor="end">Intruder</text>
        <text x={START_X - 10} y={Y_TARGET - 18} className="circuit-label" textAnchor="end">Target</text>

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

        {/* ── Gates: Origin wire ───────────── */}
        <rect x={GATE_H1_X - 20} y={Y_ORIGIN - 18} width="40" height="36" className="gate" />
        <text x={GATE_H1_X} y={Y_ORIGIN + 6} textAnchor="middle" className="gate-text">H</text>

        <rect x={GATE_X_X - 20} y={Y_ORIGIN - 18} width="40" height="36" className="gate" />
        <text x={GATE_X_X} y={Y_ORIGIN + 6} textAnchor="middle" className="gate-text">X</text>

        {/* ── Intruder gate ───────────────── */}
        <rect x={INTERCEPT_X - 20} y={Y_INTRUDER - 18} width="40" height="36" className="gate gate--intruder" />
        <text x={INTERCEPT_X} y={Y_INTRUDER + 6} textAnchor="middle" className="intruder-text">E</text>

        {/* ── Target gates ───────────────── */}
        <rect x={GATE_H2_X - 20} y={Y_TARGET - 18} width="40" height="36" className="gate" />
        <text x={GATE_H2_X} y={Y_TARGET + 6} textAnchor="middle" className="gate-text">H</text>

        <rect x={GATE_M_X - 20} y={Y_TARGET - 18} width="40" height="36" className="gate measure" />
        <text x={GATE_M_X} y={Y_TARGET + 6} textAnchor="middle" className="gate-text">M</text>

        {/* ── Particles ───── */}
        {particles.map(p => {
          const elapsed = now - p.startTime;
          if (elapsed < 0) return null; // not yet started
          const progress = Math.min(elapsed / TRAVEL_TIME, 1);
          if (progress >= 1) return null;

          const x = START_X + progress * (END_X - START_X);

          // Determine which wire the particle is on based on progress
          let y: number;
          if (progress < 0.45) {
            // On Origin wire, heading toward intercept point
            y = Y_ORIGIN;
          } else if (progress < 0.55) {
            // Transition zone around intruder — drop down to intruder wire
            const t = (progress - 0.45) / 0.1; // 0→1 during transition
            y = Y_ORIGIN + t * (Y_INTRUDER - Y_ORIGIN);
          } else if (progress < 0.6) {
            // On intruder wire briefly
            y = Y_INTRUDER;
          } else if (progress < 0.65) {
            // Transition from intruder to target wire
            const t = (progress - 0.6) / 0.05;
            y = Y_INTRUDER + t * (Y_TARGET - Y_INTRUDER);
          } else {
            // On Target wire
            y = Y_TARGET;
          }

          // Determine if in intruder zone
          const inIntruderZone = progress >= 0.45 && progress < 0.65;

          return (
            <circle
              key={p.id}
              cx={x}
              cy={y}
              r={5}
              className={
                "qubit " +
                (inIntruderZone ? "qubit--intercepted " : "")
              }
            />
          );
        })}

      </svg>
    </div>
  );
}
