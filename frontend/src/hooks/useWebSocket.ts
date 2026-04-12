import { useEffect, useRef, useCallback, useState } from "react";
import { useSessionContext } from "../context/SessionContext";
import { measureQubit, randomBasis } from "../lib/quantum";
import type { WsMessage, SessionPhase, DeviceInfo } from "../types";

export const WS_BASE = import.meta.env.VITE_WS_URL ?? "ws://localhost:8000";

export function useWebSocket() {
  const { session, dispatch } = useSessionContext();
  const wsRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!session.sessionId || !session.role) return;

    const ws = new WebSocket(`${WS_BASE}/ws/${session.sessionId}`);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      // First message must be role_selected
      ws.send(JSON.stringify({ type: "role_selected", role: session.role }));
    };

    ws.onclose = () => {
      setConnected(false);
      wsRef.current = null;
    };

    ws.onmessage = (event) => {
      const msg: WsMessage = JSON.parse(event.data);

      switch (msg.type) {
        case "session_state":
          if (msg.phase) dispatch({ type: "SET_PHASE", phase: msg.phase as SessionPhase });
          if (msg.mode) dispatch({ type: "SET_MODE", mode: msg.mode as "classical" | "quantum" });
          if (msg.devices) dispatch({ type: "SET_DEVICES", devices: msg.devices as DeviceInfo[] });
          if (msg.metrics) dispatch({ type: "UPDATE_METRICS", metrics: msg.metrics as Record<string, unknown> });
          break;

        case "phase_update":
          dispatch({ type: "SET_PHASE", phase: msg.phase as SessionPhase });
          break;

        case "metrics_update":
          if (msg.metrics) dispatch({ type: "UPDATE_METRICS", metrics: msg.metrics as Record<string, unknown> });
          break;

        case "device_update":
          if (msg.devices) dispatch({ type: "SET_DEVICES", devices: msg.devices as DeviceInfo[] });
          break;

        case "mode_update":
          if (msg.mode) dispatch({ type: "SET_MODE", mode: msg.mode as "classical" | "quantum" });
          break;

        // ── BB84: Target auto-measurement ──
        // When Target receives qubits, it picks random bases,
        // measures each qubit, and sends results back immediately.
        case "bb84_transmit": {
          if (session.role !== "target") break;
          const qubits = msg.qubits as { bit: number; basis: string }[];
          const bits: number[] = [];
          const bases: string[] = [];

          for (const q of qubits) {
            const basis = randomBasis();
            const bit = measureQubit(q.bit, q.basis, basis);
            bits.push(bit);
            bases.push(basis);
          }

          // Send measurement results back to server
          ws.send(JSON.stringify({
            type: "bb84_measurement",
            bits,
            bases,
          }));
          break;
        }

        case "error":
          console.error("[WS] Server error:", msg.message);
          break;

        default:
          // Other message types (key_generated, bb84_prepare, etc.)
          // are informational — frontend can display them in the future
          break;
      }
    };

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [session.sessionId, session.role, dispatch]);

  const send = useCallback((msg: WsMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

  return { connected, send, ws: wsRef.current };
}
