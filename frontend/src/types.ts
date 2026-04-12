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

/** File info received via WebSocket (Target after decryption, Intruder if captured) */
export interface ReceivedFile {
  name: string;
  data: string;  // base64-encoded raw bytes
}

export interface SessionState {
  sessionId: string | null;
  role: Role | null;
  mode: Mode | null;
  phase: SessionPhase;
  devices: DeviceInfo[];
  receivedFile: ReceivedFile | null;
}

export interface Metrics {
  qber: number | null;
  keyExchangeAttempts: number;
  keyEstablished: boolean;
  intruderDetected: boolean;
  intruderCapturedKey: boolean;
  intruderCapturedFile: boolean;
  interceptedCount: number;
  totalQubits: number;
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
  | "bb84_measurement"        // Target → Server (measurement results)
  // Server → Client (session)
  | "session_state"
  | "phase_update"
  | "metrics_update"
  | "device_update"
  | "mode_update"
  | "error"
  // Server → Client (key exchange — classical)
  | "key_generated"
  | "key_established"
  | "intercepted_key"
  // Server → Client (key exchange — quantum BB84)
  | "bb84_prepare"            // Server → Origin (your bits/bases)
  | "bb84_transmit"           // Server → Target (qubits to measure)
  | "bb84_intercept_result"   // Server → Intruder (interception summary)
  | "bb84_result"             // Server → All (QBER + outcome)
  | "bb84_retry"             // Server → All (intrusion detected, retrying)
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
