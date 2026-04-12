import { useRef, useEffect } from "react";

interface Props {
  /** Bits the sender transmitted (known to Origin immediately, revealed to Target after done) */
  senderBits: number[];
  /** Bits as received (streams in live for both roles) */
  receiverBits: (number | null)[];
  /** Whether to show the sender column (Origin: always, Target: only after complete) */
  showSender: boolean;
  /** Total expected bit count — drives the placeholder slots */
  totalBits: number;
}

export function BitStream({ senderBits, receiverBits, showSender, totalBits }: Props) {
  const receiverRef = useRef<HTMLDivElement>(null);

  // Auto-scroll receiver column as bits arrive
  useEffect(() => {
    const el = receiverRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [receiverBits.filter((b) => b !== null).length]);

  const filledCount = receiverBits.filter((b) => b !== null).length;
  const progress = totalBits > 0 ? filledCount / totalBits : 0;

  return (
    <div className="bitstream">
      <div className="bitstream__header">
        <span className="bitstream__label">Bit Stream Visualization</span>
        <span className="bitstream__counter">
          {filledCount} / {totalBits} bits
        </span>
      </div>

      <div className="bitstream__progress-bar">
        <div className="bitstream__progress-fill" style={{ width: `${progress * 100}%` }} />
      </div>

      <div className="bitstream__columns">
        {/* Sender column */}
        <div className="bitstream__col">
          <div className="bitstream__col-header">Sent</div>
          <div className="bitstream__grid">
            {showSender
              ? senderBits.map((b, i) => (
                  <span key={i} className={`bitstream__bit bitstream__bit--${b}`}>{b}</span>
                ))
              : Array.from({ length: totalBits }, (_, i) => (
                  <span key={i} className="bitstream__bit bitstream__bit--hidden">-</span>
                ))
            }
          </div>
        </div>

        {/* Receiver column */}
        <div className="bitstream__col">
          <div className="bitstream__col-header">Received</div>
          <div className="bitstream__grid" ref={receiverRef}>
            {Array.from({ length: totalBits }, (_, i) => {
              const val = receiverBits[i];
              if (val === null || val === undefined) {
                return <span key={i} className="bitstream__bit bitstream__bit--empty" />;
              }
              const mismatch = showSender && senderBits[i] !== undefined && senderBits[i] !== val;
              return (
                <span
                  key={i}
                  className={`bitstream__bit bitstream__bit--${val}${mismatch ? " bitstream__bit--mismatch" : ""}`}
                >
                  {val}
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
