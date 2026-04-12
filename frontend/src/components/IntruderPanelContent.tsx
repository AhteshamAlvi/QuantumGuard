import { useSessionContext } from "../context/SessionContext";

interface Props {
  receiverBits: (number | null)[];
  totalBits: number;
}

export function IntruderPanelContent({ receiverBits, totalBits }: Props) {
  const { metrics } = useSessionContext();

  // Use metrics from the backend for interception data
  const interceptedCount = metrics.interceptedCount ?? 0;
  const qber = metrics.qber ?? 0;
  const intruderDetected = metrics.intruderDetected ?? false;
  const capturedKey = metrics.intruderCapturedKey ?? false;
  const capturedFile = metrics.intruderCapturedFile ?? false;

  // For the timeline, show bits that have arrived so far
  const arrivedCount = receiverBits.filter(b => b !== null).length;

  return (
    <div className="intruder-panel">

      {/* Stats */}
      <div className="intruder-panel__stats">
        <div>
          <span>Qubits Intercepted</span>
          <strong>{interceptedCount} / {totalBits || 256}</strong>
        </div>

        <div>
          <span>QBER Induced</span>
          <strong>{(qber * 100).toFixed(1)}%</strong>
        </div>

        <div>
          <span>Detected</span>
          <strong className={intruderDetected ? "detected" : "undetected"}>
            {intruderDetected ? "YES" : "NO"}
          </strong>
        </div>
      </div>

      {/* Capture status */}
      <div className="intruder-panel__capture">
        <div className={`capture-badge ${capturedKey ? "capture-badge--success" : "capture-badge--fail"}`}>
          <span>Key</span>
          <strong>{capturedKey ? "CAPTURED" : "SECURE"}</strong>
        </div>
        <div className={`capture-badge ${capturedFile ? "capture-badge--success" : "capture-badge--fail"}`}>
          <span>File</span>
          <strong>{capturedFile ? "CAPTURED" : "SECURE"}</strong>
        </div>
      </div>

      {/* Timeline — shows transfer progress */}
      <div className="intruder-panel__timeline-section">
        <span className="timeline-label">Transfer Progress</span>
        <div className="intruder-panel__timeline">
          {Array.from({ length: Math.min(totalBits, 128) }, (_, i) => {
            const bitArrived = i < arrivedCount;
            // Mark some as intercepted based on ratio
            const isIntercepted = bitArrived && interceptedCount > 0 &&
              (i % Math.max(1, Math.floor(totalBits / interceptedCount))) === 0;
            return (
              <span
                key={i}
                className={`timeline-dot ${
                  isIntercepted ? "timeline-dot--hit" :
                  bitArrived ? "timeline-dot--ok" : ""
                }`}
              />
            );
          })}
        </div>
      </div>

      {/* Collapse visual */}
      <div className="intruder-panel__collapse">
        <span className="collapse-title">Quantum State Collapse</span>
        <div className="collapse-row">
          <div className="collapse-state superposed" />
          <span className="collapse-arrow">→</span>
          <div className="collapse-state measured">M</div>
          <span className="collapse-arrow">→</span>
          <div className="collapse-state collapsed">0/1</div>
        </div>
        <span className="collapse-desc">
          Measurement collapses superposition — disturbs qubit state
        </span>
      </div>

    </div>
  );
}
