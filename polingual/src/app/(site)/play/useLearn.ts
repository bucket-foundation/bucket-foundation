"use client";

import { useEffect, useState } from "react";
import type { LearnIndex } from "@/lib/lobby/learn-index";

let cached: Promise<LearnIndex | null> | null = null;

function load(): Promise<LearnIndex | null> {
  cached ??= fetch("/play/roots").then((r) => (r.ok ? (r.json() as Promise<LearnIndex>) : null)).catch(() => null);
  return cached;
}

export function useLearnIndex(): LearnIndex | null {
  const [index, setIndex] = useState<LearnIndex | null>(null);
  useEffect(() => {
    let live = true;
    load().then((i) => live && setIndex(i));
    return () => {
      live = false;
    };
  }, []);
  return index;
}
