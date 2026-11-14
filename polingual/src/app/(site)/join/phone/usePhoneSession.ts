"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { normalizeCode, type Snapshot } from "@/lib/stoa/client";
import { dropSeat, seatStore, type Seat } from "@/lib/stoa/seat";
import type { SocketStatus } from "@/lib/stoa/socket";
import { fetchSnapshot, handleEvent, newBag, type Setters } from "./session";

export function usePhoneSession(initialCode?: string) {
  const [seat, setSeat] = useState<Seat | null>(null);
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [status, setStatus] = useState<SocketStatus>("connecting");
  const [verified, setVerified] = useState(0);
  const [step, setStep] = useState<"code" | "name">(initialCode && normalizeCode(initialCode).length === 6 ? "name" : "code");
  const [error, setError] = useState<string | null>(null);
  const bag = useRef(newBag()).current;
  bag.snap = snap;

  const leave = useCallback((message?: string) => {
    bag.socket?.stop();
    bag.socket = null;
    if (bag.seat) dropSeat(seatStore(), bag.seat.room_id, Date.now());
    bag.seat = null;
    setSeat(null);
    setSnap(null);
    setStep("code");
    if (message) setError(message);
  }, [bag]);

  const set: Setters = { setSeat, setSnap, setStatus, setVerified, leave };
  const setRef = useRef(set);
  setRef.current = set;
  const fetchState = useCallback(() => fetchSnapshot(bag, setRef.current), [bag]);
  bag.onEvent = (payload) => handleEvent(bag, set, () => void fetchState(), payload);

  const roomId = seat?.room_id;
  useEffect(() => {
    if (roomId) void fetchState();
  }, [roomId, fetchState]);

  useEffect(() => {
    if (!seat) return;
    const t = setInterval(() => void fetchState(), status === "open" ? 10_000 : 1500);
    return () => clearInterval(t);
  }, [seat, status, fetchState]);

  useEffect(() => {
    bag.alive = true;
    return () => {
      bag.alive = false;
      bag.socket?.stop();
      bag.socket = null;
    };
  }, [bag]);

  const sit = (s: Seat) => {
    bag.seat = s;
    bag.seq = 0;
    bag.samples = [];
    setSeat(s);
  };

  return { bag, seat, snap, setSnap, status, verified, step, setStep, error, setError, leave, fetchState, sit };
}

export type PhoneSession = ReturnType<typeof usePhoneSession>;
