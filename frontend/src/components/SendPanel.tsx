import React, { useState } from "react";
import BitPanel from "./BitPanel";

export default function SenderPanel() {
  const [senderBits, setSenderBits] = useState<number[]>([]);
  const [receiverBits, setReceiverBits] = useState<number[]>([]);

  const start = async (file: File) => {
    const ws = new WebSocket("ws://localhost:8000/ws/sender");

    ws.onopen = () => {
      file.arrayBuffer().then(buf => ws.send(buf));
    };

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);

      if (msg.type === "init") {
        setSenderBits(msg.sender_bits);
        setReceiverBits(new Array(msg.length).fill(null));
      }

      if (msg.type === "bit") {
        setReceiverBits(prev => {
          const copy = [...prev];
          copy[msg.index] = msg.value;
          return copy;
        });
      }
    };
  };

  return (
    <div>
      <input type="file" onChange={e => start(e.target.files![0])} />
      <BitPanel
        senderBits={senderBits}
        receiverBits={receiverBits}
        showSender={true}
      />
    </div>
  );
}