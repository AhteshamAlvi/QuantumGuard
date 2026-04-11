export type Role = "origin" | "target" | "intruder";
export type Mode = "classical" | "quantum";
export type SessionPhase =
  | "lobby"
  | "key_exchange"
  | "transferring"
  | "complete"
  | "aborted";

export interface DeviceInfo {
  role: Role;
  connected: boolean;
}

export interface SessionState {
  sessionId: string | null;
  role: Role | null;
  mode: Mode | null;
  phase: SessionPhase;
  devices: DeviceInfo[];
}

export interface Metrics {
  qber: number | null;
  keyExchangeAttempts: number;
  keyEstablished: boolean;
  intruderDetected: boolean;
  intruderCapturedKey: boolean;
  intruderCapturedFile: boolean;
  fileHashMatch: boolean | null;
  transferSuccess: boolean | null;
}

export interface IntruderSettings {
  attackActive: boolean;
  interceptionIntensity: number;
}

// Message types the frontend sends/receives over WebSocket.
// Must stay in sync with backend/models/messages.py once implemented.
export type WsMessageType =
  | "join_session"
  | "role_selected"
  | "mode_selected"
  | "start_simulation"
  | "file_upload"
  | "intruder_settings"
  | "phase_update"
  | "metrics_update"
  | "device_update"
  | "transfer_chunk"
  | "transfer_complete"
  | "error";

export interface WsMessage {
  type: WsMessageType;
  payload: Record<string, unknown>;
}
