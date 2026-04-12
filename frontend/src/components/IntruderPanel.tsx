interface Props {
  receiverBits: (number | null)[];
  totalBits: number;
  onClose: () => void;
}

export function IntruderPanel({ receiverBits, totalBits, onClose }: Props) {
  const intercepted = receiverBits.map((b, i) => ({
    index: i,
    intercepted: b === null,
  }));

  const errorCount = intercepted.filter(x => x.intercepted).length;
  const errorRate = totalBits > 0 ? errorCount / totalBits : 0;

  return (
    <div className="modal-overlay">
      <div className="modal intruder-panel">

        {/* Header */}
        <div className="modal__header">
          <span>INTERCEPTION ANALYSIS</span>
          <button onClick={onClose}>✕</button>
        </div>

        {/* Body */}
        <div className="intruder-panel__body">

          {/* Summary */}
          <div className="intruder-panel__stats">
            <div>
              <span>Intercepted</span>
              <strong>{errorCount}</strong>
            </div>
            <div>
              <span>Error Rate</span>
              <strong>{(errorRate * 100).toFixed(1)}%</strong>
            </div>
          </div>

          {/* Timeline */}
          <div className="intruder-panel__timeline">
            {intercepted.map((x, i) => (
              <span
                key={i}
                className={`timeline-dot ${
                  x.intercepted ? "timeline-dot--hit" : ""
                }`}
              />
            ))}
          </div>

          {/* Collapse Visualization */}
          <div className="intruder-panel__collapse">
            <span className="collapse-title">State Collapse</span>
            <div className="collapse-row">
              <div className="collapse-state superposed" />
              <span>→</span>
              <div className="collapse-state collapsed">0/1</div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}