import { createContext, useContext, useEffect, useRef, useState, useCallback, type ReactNode } from "react";
import { useSessionContext } from "./SessionContext";
import { measureQubit, randomBasis } from "../lib/quantum";
import type { WsMessage, SessionPhase, DeviceInfo } from "../types";

const WS_BASE = import.meta.env.VITE_WS_URL ?? "ws://localhost:8000";

interface WebSocketContextValue {
  connected: boolean;
  send: (msg: WsMessage) => void;
}

const WebSocketContext = createContext<WebSocketContextValue>({
  connected: false,
  send: () => {},
});

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const { session, dispatch } = useSessionContext();
  const wsRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  // Track whether we've already set up a connection for this session+role
  const connectedKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!session.sessionId || !session.role) return;

    const key = `${session.sessionId}:${session.role}`;
    // Prevent duplicate connections from strict mode.
    // Check for CONNECTING (0) or OPEN (1) — in strict mode the
    // second effect fires before the first WS has finished opening.
    if (
      connectedKeyRef.current === key &&
      wsRef.current &&
      (wsRef.current.readyState === WebSocket.OPEN ||
       wsRef.current.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    // Close any existing connection
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    const ws = new WebSocket(`${WS_BASE}/ws/${session.sessionId}`);
    wsRef.current = ws;
    connectedKeyRef.current = key;

    ws.onopen = () => {
      setConnected(true);
      ws.send(JSON.stringify({ type: "role_selected", role: session.role }));
    };

    ws.onclose = () => {
      // Only update state if this is still the active connection.
      // Prevents a stale WS1.onclose from overriding WS2.onopen.
      if (wsRef.current === ws) {
        setConnected(false);
        wsRef.current = null;
      }
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

        // BB84: Target auto-measures when it receives qubits
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

          ws.send(JSON.stringify({
            type: "bb84_measurement",
            bits,
            bases,
          }));
          break;
        }

        // BB84 / key exchange messages — log for debugging, no state change needed
        case "bb84_prepare":
        case "bb84_intercept_result":
        case "key_generated":
        case "intercepted_key":
          console.debug(`[WS] ${msg.type}`, msg);
          break;

        // Key established — could be used for future UI indicators
        case "key_established":
          console.debug("[WS] Key established", msg);
          break;

        // BB84 result — QBER info
        case "bb84_result":
          console.debug("[WS] BB84 result", msg);
          break;

        // BB84 retry — intrusion detected, key exchange restarting
        case "bb84_retry":
          console.debug("[WS] BB84 retry", msg);
          break;

        // File transfer messages
        case "file_encrypted":
        case "file_incoming":
        case "bit_stream_init":
          console.debug(`[WS] ${msg.type}`, msg);
          break;

        // Intruder intercepts file — store if they captured it
        case "intercepted_file":
          console.debug(`[WS] ${msg.type}`, msg);
          if (msg.has_key && msg.file_data && msg.file_name) {
            dispatch({
              type: "SET_RECEIVED_FILE",
              file: { name: msg.file_name as string, data: msg.file_data as string },
            });
          }
          break;

        // File decrypted at target — store for preview
        case "file_decrypted":
          console.debug("[WS] File decrypted", msg);
          if (msg.success && msg.file_data && msg.file_name) {
            dispatch({
              type: "SET_RECEIVED_FILE",
              file: { name: msg.file_name as string, data: msg.file_data as string },
            });
          }
          break;

        case "error":
          console.error("[WS] Server error:", msg.message);
          break;

        default:
          console.debug(`[WS] Unhandled message type: ${msg.type}`, msg);
          break;
      }
    };

    return () => {
      // Don't close on strict mode cleanup — let the connection persist
      // It will be closed if session/role actually changes
    };
  }, [session.sessionId, session.role, dispatch]);

  const send = useCallback((msg: WsMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

  return (
    <WebSocketContext.Provider value={{ connected, send }}>
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocket() {
  return useContext(WebSocketContext);
}
