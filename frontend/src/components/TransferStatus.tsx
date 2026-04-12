import type { SessionPhase, Metrics, Mode, Role } from "../types";

interface Props {
  phase: SessionPhase;
  metrics: Metrics;
  mode: Mode | null;
  role: Role | null;
}

export function TransferStatus({ phase, metrics, mode, role }: Props) {
  if (phase === "lobby") return null;

  const isComplete = phase === "complete";
  const isAborted = phase === "aborted";
  const isFailed = phase === "failed";

  return (
    <div className={`transfer-status transfer-status--${phase}`}>
      <h3 className="transfer-status__heading">
        {isAborted && "Transfer Aborted"}
        {isFailed && "Transfer Failed"}
        {isComplete && "Transfer Complete"}
        {phase === "key_exchange" && "Establishing Key..."}
        {phase === "transferring" && "Transferring File..."}
      </h3>

      {isAborted && mode === "quantum" && (
        <div className="transfer-status__message transfer-status__message--danger">
          <p>Intrusion detected via quantum bit error rate (QBER: {metrics.qber !== null ? `${(metrics.qber * 100).toFixed(1)}%` : "N/A"}).</p>
          <p>Key exchange rejected. No data was transmitted.</p>
        </div>
      )}

      {isComplete && mode === "classical" && role === "intruder" && (
        <div className="transfer-status__message transfer-status__message--warning">
          <p>File delivered to Target successfully.</p>
          <p>Intruder intercepted the key and decrypted the file <strong>without detection</strong>.</p>
        </div>
      )}

      {isComplete && mode === "classical" && role !== "intruder" && (
        <div className="transfer-status__message transfer-status__message--warning">
          <p>File delivered successfully.</p>
          <p>However, the classical key exchange was silently compromised.</p>
        </div>
      )}

      {isComplete && mode === "quantum" && (
        <div className="transfer-status__message transfer-status__message--success">
          <p>Secure quantum key established. File transferred successfully.</p>
          <p>SHA-256 integrity: {metrics.fileHashMatch ? "Verified" : "Failed"}</p>
        </div>
      )}

      {isFailed && (
        <div className="transfer-status__message transfer-status__message--danger">
          <p>Decryption failed. File could not be verified.</p>
        </div>
      )}

      {phase === "key_exchange" && mode === "quantum" && metrics.intruderDetected && metrics.keyExchangeAttempts > 1 && (
        <div className="transfer-status__message transfer-status__message--warning">
          <p>Intrusion detected via QBER ({metrics.qber !== null ? `${(metrics.qber * 100).toFixed(1)}%` : "N/A"})! Key discarded.</p>
          <p>Re-exchanging key — attempt {metrics.keyExchangeAttempts}...</p>
        </div>
      )}

      {(phase === "key_exchange" || phase === "transferring") && (
        <div className="transfer-status__progress">
          <div className="transfer-status__spinner" />
        </div>
      )}
    </div>
  );
}
