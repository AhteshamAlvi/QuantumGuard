export type Role = "origin" | "target" | "intruder";
export type Mode = "classical" | "quantum";
export type SessionPhase =
  | "lobby"
  | "key_exchange"
  | "transferring"
  | "complete"
  | "aborted"
  | "failed";

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

// All WebSocket message types — must stay in sync with backend
export type WsMessageType =
  // Client → Server
  | "role_selected"
  | "mode_selected"
  | "start_simulation"
  | "file_upload"
  | "file_binary"
  | "intruder_settings"
  // Server → Client (session)
  | "session_state"
  | "phase_update"
  | "metrics_update"
  | "device_update"
  | "mode_update"
  | "error"
  // Server → Client (key exchange)
  | "key_generated"
  | "key_established"
  | "intercepted_key"
  | "bb84_progress"
  | "bb84_intercept"
  // Server → Client (file transfer)
  | "file_encrypted"
  | "intercepted_file"
  | "file_incoming"
  | "file_decrypted"
  | "bit_stream_init";

export interface WsMessage {
  type: WsMessageType;
  [key: string]: unknown;
}
