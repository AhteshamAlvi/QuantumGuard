import type { Metrics, Mode } from "../types";

interface Props {
  metrics: Metrics;
  mode: Mode | null;
}

export function MetricsPanel({ metrics, mode }: Props) {
  return (
    <div className="metrics-panel">
      <h3 className="metrics-panel__heading">Metrics</h3>
      <div className="metrics-panel__grid">
        {mode === "quantum" && (
          <div className={`metrics-panel__card${metrics.intruderDetected ? " metrics-panel__card--danger" : ""}`}>
            <span className="metrics-panel__label">QBER</span>
            <span className="metrics-panel__value">
              {metrics.qber !== null ? `${(metrics.qber * 100).toFixed(1)}%` : "--"}
            </span>
            {metrics.qber !== null && (
              <div className="metrics-panel__bar">
                <div
                  className={`metrics-panel__bar-fill${metrics.qber > 0.11 ? " metrics-panel__bar-fill--danger" : ""}`}
                  style={{ width: `${Math.min(metrics.qber * 100 * 2, 100)}%` }}
                />
              </div>
            )}
          </div>
        )}

        <div className="metrics-panel__card">
          <span className="metrics-panel__label">Key Attempts</span>
          <span className="metrics-panel__value">{metrics.keyExchangeAttempts}</span>
        </div>

        <div className={`metrics-panel__card${metrics.keyEstablished ? " metrics-panel__card--success" : ""}`}>
          <span className="metrics-panel__label">Key Established</span>
          <span className="metrics-panel__value">{metrics.keyEstablished ? "Yes" : "No"}</span>
        </div>

        {mode === "quantum" && (
          <div className={`metrics-panel__card${metrics.intruderDetected ? " metrics-panel__card--danger" : " metrics-panel__card--success"}`}>
            <span className="metrics-panel__label">Intruder Detected</span>
            <span className="metrics-panel__value">{metrics.intruderDetected ? "Yes" : "No"}</span>
          </div>
        )}

        {metrics.fileHashMatch !== null && (
          <div className={`metrics-panel__card${metrics.fileHashMatch ? " metrics-panel__card--success" : " metrics-panel__card--danger"}`}>
            <span className="metrics-panel__label">File Integrity</span>
            <span className="metrics-panel__value">
              {metrics.fileHashMatch ? "SHA-256 Match" : "Mismatch"}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
