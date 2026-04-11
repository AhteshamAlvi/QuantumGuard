import { useCallback, useState } from "react";
import { useSessionContext } from "../context/SessionContext";
import type { Role } from "../types";

// TODO [WIRING]: Uncomment fetch calls below that use this base URL.
export const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

/**
 * Manages session lifecycle: create, join, role selection.
 *
 * WIRING: Once the backend REST endpoints exist (routes/session.py),
 * replace the stubbed fetch calls below with real requests.
 */
export function useSession() {
  const { session, dispatch } = useSessionContext();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createSession = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // TODO [WIRING]: POST /api/sessions → returns { session_id }
      // const res = await fetch(`${API_BASE}/api/sessions`, { method: "POST" });
      // const data = await res.json();
      // dispatch({ type: "SET_SESSION_ID", sessionId: data.session_id });

      // Stub: generate a local session ID for UI development
      const stubId = Math.random().toString(36).substring(2, 8).toUpperCase();
      dispatch({ type: "SET_SESSION_ID", sessionId: stubId });
    } catch {
      setError("Failed to create session");
    } finally {
      setLoading(false);
    }
  }, [dispatch]);

  const joinSession = useCallback(async (sessionId: string) => {
    setLoading(true);
    setError(null);
    try {
      // TODO [WIRING]: POST /api/sessions/{sessionId}/join → returns { success }
      // const res = await fetch(`${API_BASE}/api/sessions/${sessionId}/join`, { method: "POST" });
      // if (!res.ok) throw new Error("Session not found");

      dispatch({ type: "SET_SESSION_ID", sessionId });
    } catch {
      setError("Failed to join session");
    } finally {
      setLoading(false);
    }
  }, [dispatch]);

  const selectRole = useCallback((role: Role) => {
    // TODO [WIRING]: Send role selection over WebSocket so other devices see it
    dispatch({ type: "SET_ROLE", role });
  }, [dispatch]);

  return { session, loading, error, createSession, joinSession, selectRole };
}
