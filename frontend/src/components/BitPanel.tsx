import React from "react";

type Props = {
  senderBits: number[];
  receiverBits: number[];
  showSender: boolean;
};

const BitPanel: React.FC<Props> = ({ senderBits, receiverBits, showSender }) => {
  return (
    <div style={{ display: "flex", gap: "20px" }}>
      
      {/* Sender Side */}
      <div style={{ overflowY: "scroll", maxHeight: "200px" }}>
        {showSender &&
          senderBits.map((b, i) => (
            <span key={i} style={{ marginRight: 4 }}>
              {b}
            </span>
          ))}
      </div>

      {/* Receiver Side */}
      <div style={{ overflowY: "scroll", maxHeight: "200px" }}>
        {receiverBits.map((b, i) => {
          const isMismatch =
            showSender && senderBits[i] !== receiverBits[i];

          return (
            <span
              key={i}
              style={{
                marginRight: 4,
                color: isMismatch ? "red" : "white",
              }}
            >
              {b}
            </span>
          );
        })}
      </div>
    </div>
  );
};

export default BitPanel;