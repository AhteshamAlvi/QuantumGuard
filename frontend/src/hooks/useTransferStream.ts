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

  /**
   * Start the bit stream visualization from a pre-computed bit array.
   * Works for both Origin and Target — no File object required.
   */
  const startStream = useCallback(
    (bits: number[], errorRate: number) => {
      if (!isOrigin && !isTarget) return;

      // Clear previous
      timerRef.current.forEach(clearTimeout);
      timerRef.current = [];
      setDone(false);
      setStreaming(true);

      const received = simulateReceiverBits(bits, errorRate);
      const len = bits.length;

      setTotalBits(len);
      setReceiverBits(new Array(len).fill(null));

      if (isOrigin) {
        // Origin sees sender bits immediately
        setSenderBits(bits);
        setShowSender(true);
      } else {
        // Target: sender column is hidden until stream completes
        setSenderBits(bits);
        setShowSender(false);
      }

      // Stream receiver bits in one-by-one
      received.forEach((bit, i) => {
        const id = window.setTimeout(() => {
          setReceiverBits((prev) => {
            const next = [...prev];
            next[i] = bit;
            return next;
          });

          // Last bit → mark done, reveal sender for Target
          if (i === len - 1) {
            setStreaming(false);
            setDone(true);
            if (isTarget) setShowSender(true);
          }
        }, i * 15);
        timerRef.current.push(id);
      });
    },
    [isOrigin, isTarget],
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
