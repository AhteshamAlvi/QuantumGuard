import React, { useState } from "react";
import BitPanel from "./BitPanel";

export default function ReceiverPanel() {
  const [receiverBits, setReceiverBits] = useState<number[]>([]);
  const [senderBits, setSenderBits] = useState<number[]>([]);
  const [complete, setComplete] = useState(false);

  React.useEffect(() => {
    const ws = new WebSocket("ws://localhost:8000/ws/receiver");

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);

      if (msg.type === "bit") {
        setReceiverBits(prev => [...prev, msg.value]);
      }

      if (msg.type === "complete") {
        setSenderBits(msg.sender_bits);
        setReceiverBits(msg.receiver_bits);
        setComplete(true);
      }
    };
  }, []);

  return (
    <div>
      <BitPanel
        senderBits={senderBits}
        receiverBits={receiverBits}
        showSender={complete}
      />
    </div>
  );
}