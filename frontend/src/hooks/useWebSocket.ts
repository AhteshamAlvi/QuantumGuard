import { useEffect, useRef, useCallback, useState } from "react";
import { useSessionContext } from "../context/SessionContext";
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

        case "error":
          console.error("[WS] Server error:", msg.message);
          break;

        default:
          // Other message types (key_generated, intercepted_file, etc.)
          // are dispatched as raw events for hooks to listen to
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
