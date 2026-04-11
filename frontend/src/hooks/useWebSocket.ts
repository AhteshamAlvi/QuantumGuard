import { useEffect, useRef, useCallback, useState } from "react";
import { useSessionContext } from "../context/SessionContext";
import type { WsMessage } from "../types";

// TODO [WIRING]: Uncomment WebSocket connection below that uses this base URL.
export const WS_BASE = import.meta.env.VITE_WS_URL ?? "ws://localhost:8000";

/**
 * Connects to the backend WebSocket for real-time device communication.
 *
 * WIRING: The backend WebSocket endpoint (routes/ws.py) must accept
 * connections at /ws/{session_id} and handle the message types defined
 * in types.ts / models/messages.py.
 */
export function useWebSocket() {
  const { session, dispatch } = useSessionContext();
  const wsRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!session.sessionId) return;

    // TODO [WIRING]: Connect to real WebSocket once backend is ready
    // const ws = new WebSocket(`${WS_BASE}/ws/${session.sessionId}`);
    // wsRef.current = ws;
    //
    // ws.onopen = () => setConnected(true);
    // ws.onclose = () => setConnected(false);
    //
    // ws.onmessage = (event) => {
    //   const msg: WsMessage = JSON.parse(event.data);
    //   switch (msg.type) {
    //     case "phase_update":
    //       dispatch({ type: "SET_PHASE", phase: msg.payload.phase });
    //       break;
    //     case "metrics_update":
    //       dispatch({ type: "UPDATE_METRICS", metrics: msg.payload });
    //       break;
    //     case "device_update":
    //       dispatch({ type: "SET_DEVICES", devices: msg.payload.devices });
    //       break;
    //   }
    // };
    //
    // return () => ws.close();

    // Stub: simulate connection for UI development
    setConnected(true);
    return () => setConnected(false);
  }, [session.sessionId, dispatch]);

  const send = useCallback((msg: WsMessage) => {
    // TODO [WIRING]: Send via real WebSocket
    // if (wsRef.current?.readyState === WebSocket.OPEN) {
    //   wsRef.current.send(JSON.stringify(msg));
    // }
    console.log("[WS stub] would send:", msg);
  }, []);

  return { connected, send, ws: wsRef.current };
}
