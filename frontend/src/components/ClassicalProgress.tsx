import { useMemo } from "react";

interface Props {
  receiverBits: (number | null)[];
  totalBits: number;
}

export function ClassicalProgress({ receiverBits, totalBits }: Props) {
  const receivedCount = useMemo(
    () => receiverBits.filter(b => b !== null).length,
    [receiverBits]
  );

  const progress = totalBits > 0 ? receivedCount / totalBits : 0;

  return (
    <div className="classical-progress">
      
      {/* Label */}
      <div className="classical-progress__header">
        <span>Transmission Progress</span>
        <span>{Math.floor(progress * 100)}%</span>
      </div>

      {/* Bar */}
      <div className="classical-progress__bar">
        <div
          className="classical-progress__fill"
          style={{ width: `${progress * 100}%` }}
        />
      </div>

      {/* Footer */}
      <div className="classical-progress__footer">
        {receivedCount} / {totalBits} bits transferred
      </div>

    </div>
  );
}