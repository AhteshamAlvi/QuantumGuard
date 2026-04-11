import { useCallback, useState } from "react";
import { useSessionContext } from "../context/SessionContext";
import { useWebSocket } from "./useWebSocket";
import type { Mode, IntruderSettings } from "../types";

/**
 * Controls the simulation lifecycle: mode selection, start, file upload,
 * intruder settings, and demo mode for local testing.
 *
 * WIRING: Each action sends a WebSocket message that the backend must
 * handle. The demo flow below simulates the backend responses for UI
 * testing — remove it once the real backend is connected.
 */
export function useSimulation() {
  const { session, dispatch } = useSessionContext();
  const { send } = useWebSocket();
  const [file, setFile] = useState<File | null>(null);
  const [intruderSettings, setIntruderSettings] = useState<IntruderSettings>({
    attackActive: true,
    interceptionIntensity: 0.5,
  });

  const selectMode = useCallback((mode: Mode) => {
    dispatch({ type: "SET_MODE", mode });
    send({ type: "mode_selected", payload: { mode } });
  }, [dispatch, send]);

  const startSimulation = useCallback(() => {
    if (!session.mode) return;
    dispatch({ type: "SET_PHASE", phase: "key_exchange" });
    send({ type: "start_simulation", payload: { mode: session.mode } });

    // --- DEMO STUB: simulate backend progression for UI testing ---
    // Remove this block once the backend drives phase transitions via WebSocket.
    setTimeout(() => {
      if (session.mode === "quantum" && intruderSettings.attackActive) {
        // Quantum + active attacker → detection → abort
        dispatch({ type: "UPDATE_METRICS", metrics: {
          qber: 0.32,
          keyExchangeAttempts: 3,
          keyEstablished: false,
          intruderDetected: true,
        }});
        setTimeout(() => {
          dispatch({ type: "SET_PHASE", phase: "aborted" });
          dispatch({ type: "UPDATE_METRICS", metrics: { transferSuccess: false } });
        }, 2000);
      } else if (session.mode === "classical") {
        // Classical → silent compromise
        dispatch({ type: "UPDATE_METRICS", metrics: {
          keyExchangeAttempts: 1,
          keyEstablished: true,
          intruderCapturedKey: true,
        }});
        setTimeout(() => {
          dispatch({ type: "SET_PHASE", phase: "transferring" });
          setTimeout(() => {
            dispatch({ type: "SET_PHASE", phase: "complete" });
            dispatch({ type: "UPDATE_METRICS", metrics: {
              transferSuccess: true,
              fileHashMatch: true,
              intruderCapturedFile: true,
            }});
          }, 2500);
        }, 1500);
      } else {
        // Quantum + passive → secure transfer
        dispatch({ type: "UPDATE_METRICS", metrics: {
          qber: 0.03,
          keyExchangeAttempts: 1,
          keyEstablished: true,
          intruderDetected: false,
        }});
        setTimeout(() => {
          dispatch({ type: "SET_PHASE", phase: "transferring" });
          setTimeout(() => {
            dispatch({ type: "SET_PHASE", phase: "complete" });
            dispatch({ type: "UPDATE_METRICS", metrics: {
              transferSuccess: true,
              fileHashMatch: true,
              intruderCapturedFile: false,
            }});
          }, 2500);
        }, 1500);
      }
    }, 1500);
    // --- END DEMO STUB ---
  }, [session.mode, intruderSettings, dispatch, send]);

  const uploadFile = useCallback((f: File) => {
    setFile(f);
    // TODO [WIRING]: Read file as ArrayBuffer, send via WebSocket as file_upload message
    // The backend (services/file_transfer.py) will chunk and relay it.
    send({ type: "file_upload", payload: { name: f.name, size: f.size } });
  }, [send]);

  const updateIntruderSettings = useCallback((settings: Partial<IntruderSettings>) => {
    setIntruderSettings(prev => {
      const next = { ...prev, ...settings };
      send({ type: "intruder_settings", payload: next });
      return next;
    });
  }, [send]);

  const reset = useCallback(() => {
    dispatch({ type: "RESET" });
    setFile(null);
  }, [dispatch]);

  return {
    mode: session.mode,
    phase: session.phase,
    file,
    intruderSettings,
    selectMode,
    startSimulation,
    uploadFile,
    updateIntruderSettings,
    reset,
  };
}
