import { useState, useCallback, useRef } from "react";
import type { Role } from "../types";

const MAX_BITS = 512;

/** Converts raw bytes to a truncated bit array. */
export function fileToBits(buffer: ArrayBuffer): number[] {
  const bytes = new Uint8Array(buffer);
  const bits: number[] = [];
  for (const byte of bytes) {
    for (let i = 7; i >= 0; i--) {
      bits.push((byte >> i) & 1);
      if (bits.length >= MAX_BITS) return bits;
    }
  }
  return bits;
}

/** Simulates receiver bits with optional error injection. */
function simulateReceiverBits(bits: number[], errorRate: number): number[] {
  return bits.map((b) => (Math.random() < errorRate ? 1 - b : b));
}

export function useTransferStream(role: Role | null) {
  const [senderBits, setSenderBits] = useState<number[]>([]);
  const [receiverBits, setReceiverBits] = useState<(number | null)[]>([]);
  const [totalBits, setTotalBits] = useState(0);
  const [showSender, setShowSender] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [done, setDone] = useState(false);
  const timerRef = useRef<number[]>([]);

  const isOrigin = role === "origin";
  const isTarget = role === "target";
  const isIntruder = role === "intruder";

  /**
   * Start the bit stream visualization from a pre-computed bit array.
   * Works for Origin, Target, and Intruder.
   */
  const startStream = useCallback(
    (bits: number[], errorRate: number) => {
      if (!isOrigin && !isTarget && !isIntruder) return;

      // Clear previous
      timerRef.current.forEach(clearTimeout);
      timerRef.current = [];
      setDone(false);
      setStreaming(true);

      const len = bits.length;

      // Always set structure
      setTotalBits(len);
      setReceiverBits(new Array(len).fill(null));

      if (isOrigin) {
        setSenderBits(bits);
        setShowSender(false);
      } else if (isIntruder) {
        setSenderBits([]);
        setShowSender(false);
      } else {
        setSenderBits([]);
        setShowSender(false);
      }

      const received = simulateReceiverBits(bits, errorRate);

      received.forEach((bit, i) => {
        const id = window.setTimeout(() => {
          setReceiverBits((prev) => {
            const next = [...prev];
            next[i] = bit;
            return next;
          });

          // Last bit reached
          if (i === len - 1) {
            setStreaming(false);
            setDone(true);

            // Delay reveal for polish
            const revealId = window.setTimeout(() => {
              if (isOrigin) {
                setShowSender(true);
              }

              if (isTarget) {
                setSenderBits(bits);
                setShowSender(true);
              }
            }, 300);

            timerRef.current.push(revealId);
          }
        }, i * 230);

        // ✅ Correct placement
        timerRef.current.push(id);
      });
    },
    [isOrigin, isTarget, isIntruder]
  );
  
  const resetStream = useCallback(() => {
    timerRef.current.forEach(clearTimeout);
    timerRef.current = [];
    setSenderBits([]);
    setReceiverBits([]);
    setTotalBits(0);
    setShowSender(false);
    setStreaming(false);
    setDone(false);
  }, []);

  return {
    senderBits,
    receiverBits,
    totalBits,
    showSender,
    streaming,
    done,
    startStream,
    resetStream,
  };
}
