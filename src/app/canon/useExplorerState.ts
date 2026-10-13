"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { SetStateAction } from "react";
import {
  defaultExplorerState,
  parseExplorerParams,
  writeExplorerParams,
  type ExplorerBounds,
  type ExplorerSort,
  type ExplorerState,
  type ExplorerView,
} from "@/lib/canon-explorer/url";

function resolve<T>(next: SetStateAction<T>, prev: T): T {
  return typeof next === "function" ? (next as (p: T) => T)(prev) : next;
}

export function useExplorerState(bounds: ExplorerBounds) {
  const boundsRef = useRef(bounds);
  const [state, setState] = useState<ExplorerState>(() => defaultExplorerState(bounds));
  const [hydrated, setHydrated] = useState(false);
  const [initial, setInitial] = useState<ExplorerState | null>(null);

  useEffect(() => {
    const parsed = parseExplorerParams(window.location.search, boundsRef.current);
    setState(parsed);
    setInitial(parsed);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const url = new URL(window.location.href);
    const next = writeExplorerParams(url.searchParams, state, boundsRef.current).toString();
    if (next === url.searchParams.toString()) return;
    url.search = next ? `?${next}` : "";
    window.history.replaceState(window.history.state, "", url.toString());
  }, [state, hydrated]);

  const field = useCallback(
    <K extends keyof ExplorerState>(key: K) =>
      (next: SetStateAction<ExplorerState[K]>) =>
        setState((s) => {
          const v = resolve(next, s[key]);
          return Object.is(v, s[key]) ? s : { ...s, [key]: v };
        }),
    []
  );

  const setMarker = useCallback((v: SetStateAction<string | null>) => field("marker")(v), [field]);
  const setView = useCallback((v: SetStateAction<ExplorerView>) => field("view")(v), [field]);
  const setSort = useCallback((v: SetStateAction<ExplorerSort>) => field("sort")(v), [field]);
  const setYear = useCallback((v: SetStateAction<number>) => field("y")(v), [field]);
  const setQ = useCallback((v: SetStateAction<string>) => field("q")(v), [field]);
  const setBranch = useCallback((v: SetStateAction<string | null>) => field("branch")(v), [field]);

  return { state, initial, hydrated, setMarker, setView, setSort, setYear, setQ, setBranch };
}
