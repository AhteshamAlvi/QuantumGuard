import { createContext, useContext, useReducer, type ReactNode } from "react";
import type { SessionState, Role, Mode, SessionPhase, DeviceInfo, Metrics, ReceivedFile } from "../types";

const initialSession: SessionState = {
  sessionId: null,
  role: null,
  mode: null,
  phase: "lobby",
  devices: [],
  receivedFile: null,
};

const initialMetrics: Metrics = {
  qber: null,
  keyExchangeAttempts: 0,
  keyEstablished: false,
  intruderDetected: false,
  intruderCapturedKey: false,
  intruderCapturedFile: false,
  interceptedCount: 0,
  totalQubits: 0,
  fileHashMatch: null,
  transferSuccess: null,
};

type Action =
  | { type: "SET_SESSION_ID"; sessionId: string }
  | { type: "SET_ROLE"; role: Role }
  | { type: "SET_MODE"; mode: Mode }
  | { type: "SET_PHASE"; phase: SessionPhase }
  | { type: "SET_DEVICES"; devices: DeviceInfo[] }
  | { type: "UPDATE_METRICS"; metrics: Partial<Metrics> }
  | { type: "SET_RECEIVED_FILE"; file: ReceivedFile }
  | { type: "RESET" };

interface State {
  session: SessionState;
  metrics: Metrics;
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "SET_SESSION_ID":
      return { ...state, session: { ...state.session, sessionId: action.sessionId } };
    case "SET_ROLE":
      return { ...state, session: { ...state.session, role: action.role } };
    case "SET_MODE":
      return { ...state, session: { ...state.session, mode: action.mode } };
    case "SET_PHASE":
      return { ...state, session: { ...state.session, phase: action.phase } };
    case "SET_DEVICES":
      return { ...state, session: { ...state.session, devices: action.devices } };
    case "UPDATE_METRICS":
      return { ...state, metrics: { ...state.metrics, ...action.metrics } };
    case "SET_RECEIVED_FILE":
      return { ...state, session: { ...state.session, receivedFile: action.file } };
    case "RESET":
      return { session: initialSession, metrics: initialMetrics };
  }
}

interface SessionContextValue {
  session: SessionState;
  metrics: Metrics;
  dispatch: React.Dispatch<Action>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, {
    session: initialSession,
    metrics: initialMetrics,
  });

  return (
    <SessionContext.Provider value={{ session: state.session, metrics: state.metrics, dispatch }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSessionContext() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSessionContext must be used within SessionProvider");
  return ctx;
}
