"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export function usePoll<T>(load: () => Promise<{ ok: true; data: T } | { ok: false; error: string }>, ms = 1500): { data: T | null; error: string | null; refresh: () => void } {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const loadRef = useRef(load);
  loadRef.current = load;
  const refresh = useCallback(() => {
    void loadRef.current().then((r) => {
      if (r.ok) {
        setData(r.data);
        setError(null);
      } else setError(r.error);
    });
  }, []);
  useEffect(() => {
    refresh();
    const t = setInterval(refresh, ms);
    return () => clearInterval(t);
  }, [refresh, ms]);
  return { data, error, refresh };
}
