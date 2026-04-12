import { useEffect, useRef } from "react";

interface CircuitViewProps {
  streaming: boolean;
  totalBits: number;
  receiverBits: (number | null)[];
  onActiveChange?: (bitIndex: number, gateStep: number) => void;
}

/* ── Layout constants ─────────────────────────── */
const WIDTH  = 960;
const HEIGHT = 220;

// Leave generous left margin for labels
const LABEL_X   = 10;
const START_X   = 120;
const END_X     = 920;
const WIRE_LEN  = END_X - START_X;

// Wire Y positions (evenly spaced)
const Y_ORIGIN   = 55;
const Y_INTRUDER = 115;
const Y_TARGET   = 175;

// Gate X centres (fractions of WIRE_LEN from START_X)
const gateX = (frac: number) => START_X + frac * WIRE_LEN;
const GATE_H1  = gateX(0.10);   // H on Origin
const GATE_X   = gateX(0.22);   // X on Origin
const GATE_EVE = gateX(0.48);   // E on Intruder
const GATE_H2  = gateX(0.72);   // H on Target
const GATE_M   = gateX(0.88);   // M on Target

const GATE_W = 44;
const GATE_H = 38;

/* ── Particle settings ─────────────────────────── */
const TRAVEL_MS      = 4000;   // ms for one qubit to cross the circuit
const SPAWN_INTERVAL = 600;    // ms between spawning successive particles
const MAX_PARTICLES  = 12;

type Particle = { id: number; born: number };

export function CircuitView({
  streaming,
  totalBits,
  receiverBits,
  onActiveChange,
}: CircuitViewProps) {
  const canvasRef   = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const spawnClock   = useRef(0);           // index of next particle to spawn
  const lastSpawn    = useRef(0);           // timestamp of last spawn
  const rafRef       = useRef<number | null>(null);
  const cbRef        = useRef(onActiveChange);
  cbRef.current = onActiveChange;

  /* ── Reset when stream resets ── */
  useEffect(() => {
    if (totalBits === 0) {
      particlesRef.current = [];
      spawnClock.current = 0;
      lastSpawn.current = 0;
    }
  }, [totalBits]);

  /* ── Main render loop ─────────────────────── */
  useEffect(() => {
    const cvs = canvasRef.current;
    if (!cvs) return;
    const ctx = cvs.getContext("2d")!;

    // Device-pixel-ratio scaling for crisp rendering
    const dpr = window.devicePixelRatio || 1;
    cvs.width  = WIDTH  * dpr;
    cvs.height = HEIGHT * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const arrivedCount = () => receiverBits.filter(b => b !== null).length;

    function draw(now: number) {
      ctx.clearRect(0, 0, WIDTH, HEIGHT);

      /* ─── Draw wires ─── */
      drawWire(ctx, START_X, END_X, Y_ORIGIN,   "rgba(34,211,238,0.3)",  false);
      drawWire(ctx, START_X, END_X, Y_INTRUDER,  "rgba(248,113,113,0.3)", true);
      drawWire(ctx, START_X, END_X, Y_TARGET,    "rgba(34,211,238,0.3)",  false);

      /* ─── Intercept vertical dashed line ─── */
      ctx.save();
      ctx.strokeStyle = "rgba(248,113,113,0.35)";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(GATE_EVE, Y_ORIGIN);
      ctx.lineTo(GATE_EVE, Y_TARGET);
      ctx.stroke();
      ctx.restore();

      /* ─── Labels ─── */
      ctx.font = "bold 11px 'JetBrains Mono', 'Fira Code', monospace";
      ctx.textBaseline = "middle";
      ctx.textAlign = "left";

      ctx.fillStyle = "rgba(34,211,238,0.7)";
      ctx.fillText("ORIGIN",   LABEL_X, Y_ORIGIN);

      ctx.fillStyle = "rgba(248,113,113,0.7)";
      ctx.fillText("INTRUDER", LABEL_X, Y_INTRUDER);

      ctx.fillStyle = "rgba(34,211,238,0.7)";
      ctx.fillText("TARGET",   LABEL_X, Y_TARGET);

      /* ─── Gate boxes ─── */
      drawGate(ctx, GATE_H1, Y_ORIGIN,   "H",  "cyan");
      drawGate(ctx, GATE_X,  Y_ORIGIN,   "X",  "cyan");
      drawGate(ctx, GATE_EVE,Y_INTRUDER,  "E",  "red");
      drawGate(ctx, GATE_H2, Y_TARGET,    "H",  "cyan");
      drawGate(ctx, GATE_M,  Y_TARGET,    "M",  "purple");

      /* ─── Spawn new particles ─── */
      const arrived = arrivedCount();
      if (arrived > spawnClock.current && (now - lastSpawn.current > SPAWN_INTERVAL || spawnClock.current === 0)) {
        particlesRef.current.push({ id: spawnClock.current, born: now });
        spawnClock.current++;
        lastSpawn.current = now;
        // cap
        if (particlesRef.current.length > MAX_PARTICLES) {
          particlesRef.current = particlesRef.current.slice(-MAX_PARTICLES);
        }
      }

      /* ─── Draw & update particles ─── */
      const alive: Particle[] = [];
      let leadingGateStep = 0;
      let leadingId = 0;

      for (const p of particlesRef.current) {
        const age  = now - p.born;
        const t    = Math.min(age / TRAVEL_MS, 1);   // 0→1 progress
        if (t >= 1) continue;                         // done — discard

        alive.push(p);

        const x = START_X + t * WIRE_LEN;

        // Path: Origin wire → dip to Intruder → rise to Target
        let y: number;
        if (t < 0.38) {
          y = Y_ORIGIN;
        } else if (t < 0.48) {
          // smooth descent to intruder wire
          const s = (t - 0.38) / 0.10;
          y = Y_ORIGIN + s * (Y_INTRUDER - Y_ORIGIN);
        } else if (t < 0.56) {
          y = Y_INTRUDER;
        } else if (t < 0.64) {
          // smooth descent to target wire
          const s = (t - 0.56) / 0.08;
          y = Y_INTRUDER + s * (Y_TARGET - Y_INTRUDER);
        } else {
          y = Y_TARGET;
        }

        const inIntruderZone = t >= 0.38 && t < 0.64;

        // Draw glow
        const glowColor = inIntruderZone
          ? "rgba(248,113,113,0.5)"
          : p.id % 2 === 0
            ? "rgba(34,211,238,0.45)"
            : "rgba(139,92,246,0.45)";

        ctx.save();
        ctx.shadowColor = glowColor;
        ctx.shadowBlur  = 18;
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fillStyle = inIntruderZone
          ? "#f87171"
          : p.id % 2 === 0
            ? "#22d3ee"
            : "#a78bfa";
        ctx.fill();
        ctx.restore();

        // Determine gate step for this particle
        const gateStep =
          x < GATE_H1 + GATE_W / 2 ? 0 :
          x < GATE_X  + GATE_W / 2 ? 1 :
          x < GATE_EVE + GATE_W / 2 ? 2 :
          x < GATE_H2 + GATE_W / 2 ? 3 : 4;

        leadingGateStep = gateStep;
        leadingId = p.id;
      }

      particlesRef.current = alive;

      // Notify parent
      if (cbRef.current && alive.length > 0) {
        cbRef.current(leadingId, leadingGateStep);
      }

      rafRef.current = requestAnimationFrame(draw);
    }

    rafRef.current = requestAnimationFrame(draw);

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [receiverBits, totalBits, streaming]);

  return (
    <div className={`circuit ${streaming ? "circuit--active" : ""}`}>
      <canvas
        ref={canvasRef}
        style={{ width: "100%", height: "100%", display: "block" }}
      />
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   Canvas drawing helpers
   ══════════════════════════════════════════════════════ */

function drawWire(
  ctx: CanvasRenderingContext2D,
  x1: number, x2: number, y: number,
  color: string, dashed: boolean,
) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  if (dashed) ctx.setLineDash([7, 5]);
  ctx.shadowColor = color;
  ctx.shadowBlur = 6;
  ctx.beginPath();
  ctx.moveTo(x1, y);
  ctx.lineTo(x2, y);
  ctx.stroke();
  ctx.restore();
}

function drawGate(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,
  label: string, theme: "cyan" | "red" | "purple",
) {
  const colors = {
    cyan:   { stroke: "rgba(34,211,238,0.85)",  fill: "rgba(34,211,238,0.07)",  text: "#22d3ee",  glow: "rgba(34,211,238,0.3)"  },
    red:    { stroke: "rgba(248,113,113,0.85)", fill: "rgba(248,113,113,0.10)", text: "#f87171",  glow: "rgba(248,113,113,0.35)" },
    purple: { stroke: "rgba(139,92,246,0.85)",  fill: "rgba(139,92,246,0.10)",  text: "#a78bfa",  glow: "rgba(139,92,246,0.35)" },
  };
  const c = colors[theme];
  const x = cx - GATE_W / 2;
  const y = cy - GATE_H / 2;
  const r = 7;

  ctx.save();
  ctx.shadowColor = c.glow;
  ctx.shadowBlur = 12;

  // Rounded rect
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + GATE_W - r, y);
  ctx.arcTo(x + GATE_W, y, x + GATE_W, y + r, r);
  ctx.lineTo(x + GATE_W, y + GATE_H - r);
  ctx.arcTo(x + GATE_W, y + GATE_H, x + GATE_W - r, y + GATE_H, r);
  ctx.lineTo(x + r, y + GATE_H);
  ctx.arcTo(x, y + GATE_H, x, y + GATE_H - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();

  ctx.fillStyle = c.fill;
  ctx.fill();
  ctx.strokeStyle = c.stroke;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();

  // Label
  ctx.save();
  ctx.font = "bold 15px 'JetBrains Mono', 'Fira Code', monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = c.text;
  ctx.shadowColor = c.glow;
  ctx.shadowBlur = 8;
  ctx.fillText(label, cx, cy + 1);
  ctx.restore();
}
