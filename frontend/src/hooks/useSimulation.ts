import { useCallback, useState } from "react";
import { useSessionContext } from "../context/SessionContext";
import { useWebSocket } from "./useWebSocket";
import { fileToBits } from "./useTransferStream";
import type { Mode, IntruderSettings } from "../types";

export function useSimulation() {
  const { session, dispatch } = useSessionContext();
  const { send } = useWebSocket();
  const [file, setFile] = useState<File | null>(null);
  const [fileBits, setFileBits] = useState<number[] | null>(null);
  const [intruderSettings, setIntruderSettings] = useState<IntruderSettings>({
    attackActive: true,
    interceptionIntensity: 0.5,
  });

  const selectMode = useCallback((mode: Mode) => {
    dispatch({ type: "SET_MODE", mode });
    send({ type: "mode_selected", mode });
  }, [dispatch, send]);

  const startSimulation = useCallback(() => {
    if (!session.mode) return;
    send({ type: "start_simulation", mode: session.mode });
  }, [session.mode, send]);

  const uploadFile = useCallback((f: File) => {
    setFile(f);
    // Pre-compute bits for BitStream visualization
    f.arrayBuffer().then((buf) => {
      setFileBits(fileToBits(buf));

      // Send file data to server as base64
      const bytes = new Uint8Array(buf);
      let binary = "";
      for (const b of bytes) {
        binary += String.fromCharCode(b);
      }
      const b64 = btoa(binary);
      send({ type: "file_binary", data: b64, name: f.name, size: f.size });
    });
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
    setFileBits(null);
  }, [dispatch]);

  return {
    mode: session.mode,
    phase: session.phase,
    file,
    fileBits,
    intruderSettings,
    selectMode,
    startSimulation,
    uploadFile,
    updateIntruderSettings,
    reset,
  };
}
