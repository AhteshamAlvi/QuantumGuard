import { useCallback, useState } from "react";
import { useSessionContext } from "../context/SessionContext";
import type { Role, DeviceInfo } from "../types";

export const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export function useSession() {
  const { session, dispatch } = useSessionContext();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Roles already taken in the session (populated on join)
  const [takenRoles, setTakenRoles] = useState<Role[]>([]);

  const createSession = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/sessions`, { method: "POST" });
      const data = await res.json();
      dispatch({ type: "SET_SESSION_ID", sessionId: data.session_id });
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
      const res = await fetch(`${API_BASE}/api/sessions/${sessionId}/join`, { method: "POST" });
      if (!res.ok) throw new Error("Session not found");
      const data = await res.json();
      dispatch({ type: "SET_SESSION_ID", sessionId });

      // Extract which roles are already connected
      const devices: DeviceInfo[] = data.devices ?? [];
      setTakenRoles(devices.filter((d) => d.connected).map((d) => d.role));
    } catch {
      setError("Session not found");
    } finally {
      setLoading(false);
    }
  }, [dispatch]);

  const selectRole = useCallback((role: Role) => {
    dispatch({ type: "SET_ROLE", role });
  }, [dispatch]);

  return { session, loading, error, takenRoles, createSession, joinSession, selectRole };
}
