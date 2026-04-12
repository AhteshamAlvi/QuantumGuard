import { useSessionContext } from "../context/SessionContext";
import { useWebSocket } from "../hooks/useWebSocket";

const PHASE_LABELS: Record<string, string> = {
  lobby: "Waiting for players",
  key_exchange: "Exchanging keys...",
  transferring: "Transferring file...",
  complete: "Simulation complete",
  aborted: "Transfer aborted",
  failed: "Transfer failed",
};

export function SessionHeader() {
  const { session, metrics } = useSessionContext();
  const { connected } = useWebSocket();

  // Show attempt count during quantum key exchange retries
  const showAttempts = session.phase === "key_exchange"
    && session.mode === "quantum"
    && metrics.keyExchangeAttempts > 1;

  return (
    <header className="session-header">
      <div className="session-header__left">
        <h1 className="session-header__title">QuantumGuard</h1>
        {session.sessionId && (
          <span className="session-header__id">
            Session: <code>{session.sessionId}</code>
          </span>
        )}
      </div>
      <div className="session-header__right">
        {session.role && (
          <span className={`session-header__role session-header__role--${session.role}`}>
            {session.role.charAt(0).toUpperCase() + session.role.slice(1)}
          </span>
        )}
        {session.mode && (
          <span className={`session-header__mode session-header__mode--${session.mode}`}>
            {session.mode === "quantum" ? "Quantum" : "Classical"}
          </span>
        )}
        <span className={`session-header__status ${connected ? "session-header__status--on" : ""}`}>
          {connected ? "Connected" : "Disconnected"}
        </span>
        {session.phase !== "lobby" && (
          <span className="session-header__phase">
            {PHASE_LABELS[session.phase]}
            {showAttempts && ` (attempt ${metrics.keyExchangeAttempts})`}
          </span>
        )}
      </div>
    </header>
  );
}
