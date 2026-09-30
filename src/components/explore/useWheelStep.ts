"use client";

import { useEffect, useRef, type RefObject } from "react";
import { wheelShouldStep } from "@/lib/explore/scrub";

export function useWheelStep(ref: RefObject<HTMLElement>, onStep: (delta: number) => void, enabled = true): void {
  const last = useRef(0);
  const handler = useRef(onStep);
  handler.current = onStep;
  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return;
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      const now = performance.now();
      const step = wheelShouldStep(last.current, now);
      last.current = now;
      if (step) handler.current(e.deltaY > 0 ? 1 : -1);
    };
    el.addEventListener("wheel", wheel, { passive: false });
    return () => el.removeEventListener("wheel", wheel);
  }, [ref, enabled]);
}
