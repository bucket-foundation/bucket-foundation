"use client";

import { useEffect, useRef, useState } from "react";
import { fallMs } from "@academy/flag-tiles";
import type { RunEvent, RunState } from "@/lib/lobby/flag-run";

const KEYS: Record<string, number> = { d: 0, f: 1, j: 2, k: 3, "1": 0, "2": 1, "3": 2, "4": 3 };

export function useFall(run: RunState, send: (e: RunEvent) => void) {
  const [progress, setProgress] = useState(0);
  const tileStart = useRef(0);
  useEffect(() => {
    if (run.phase !== "running") return;
    tileStart.current = performance.now();
    setProgress(0);
    let raf = 0;
    const ms = fallMs(run.index);
    const tick = () => {
      const p = (performance.now() - tileStart.current) / ms;
      setProgress(Math.min(1, p));
      if (p >= 1) {
        send({ kind: "timeout" });
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    let hiddenAt = 0;
    const onVis = () => {
      if (document.hidden) hiddenAt = performance.now();
      else if (hiddenAt) tileStart.current += performance.now() - hiddenAt;
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [run.phase, run.index, send]);
  return progress;
}

export function useLaneKeys(tap: (lane: number) => void) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const lane = KEYS[e.key.toLowerCase()];
      if (lane === undefined || e.repeat) return;
      e.preventDefault();
      tap(lane);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [tap]);
}
