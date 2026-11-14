"use client";

import { useEffect, useRef, useState } from "react";

export function useNow(ms = 250, active = true): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const t = window.setInterval(() => setNow(Date.now()), ms);
    return () => window.clearInterval(t);
  }, [ms, active]);
  return now;
}

export function secondsLeft(ends: number | null, now: number, full: number): number {
  return ends ? Math.max(0, Math.ceil((ends - now) / 1000)) : full;
}

export function useDeadline(ends: number | null, onEnd: () => void): number {
  const now = useNow(250, ends !== null);
  const fire = useRef(onEnd);
  fire.current = onEnd;
  useEffect(() => {
    if (ends !== null && now >= ends) fire.current();
  }, [ends, now]);
  return now;
}
