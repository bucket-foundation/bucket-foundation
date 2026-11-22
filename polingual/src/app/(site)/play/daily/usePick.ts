"use client";

import { useState } from "react";
import { mark } from "@/lib/daily/pattern";
import { emitReward } from "@/lib/reward";

export function usePick(total: number, onDone: (pattern: string) => void) {
  const [i, setI] = useState(0);
  const [pattern, setPattern] = useState("");
  const [picked, setPicked] = useState<string | null>(null);

  function choose(c: string, answer: string) {
    if (picked) return;
    setPicked(c);
    const next = mark(pattern, c === answer);
    emitReward(c === answer ? "hit" : "miss");
    setPattern(next);
    window.setTimeout(() => {
      setPicked(null);
      if (i + 1 < total) return setI(i + 1);
      emitReward("round-end");
      onDone(next);
    }, 700);
  }

  return { i, pattern, picked, choose };
}
