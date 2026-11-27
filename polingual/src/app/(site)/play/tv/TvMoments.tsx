"use client";

import { useEffect, useRef, useState } from "react";
import type { WebLobbyState } from "@/lib/lobby/client";
import { learnedLangs, momentsFor, type Moment } from "@/lib/lobby/moments";
import type { Sfx } from "@/lib/stoa/script";
import { langName } from "../langs";
import tv from "./tv.module.css";

const SHOW_MS = 5000;
const SOUND: Record<Moment["kind"], Sfx> = { streak: "streak", "new-language": "climb", perfect: "fanfare", steal: "whoosh" };

export function useTvMoments(lobby: WebLobbyState | null, play: (s: Sfx) => void): Moment[] {
  const seen = useRef(new Set<string>());
  const known = useRef(new Map<string, Set<string>>());
  const timer = useRef<number | undefined>(undefined);
  const [shown, setShown] = useState<Moment[]>([]);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  useEffect(() => {
    if (!lobby?.startedAt || !lobby.results.length) return;
    const round = Math.max(...lobby.results.map((r) => r.round));
    const key = `${lobby.startedAt}:${round}`;
    if (seen.current.has(key)) return;
    seen.current.add(key);
    const found = momentsFor(lobby, round, known.current, langName);
    for (const [user, langs] of learnedLangs(lobby, round)) known.current.set(user, new Set([...(known.current.get(user) ?? []), ...langs]));
    if (!found.length) return;
    setShown(found.slice(0, 3));
    play(SOUND[found[0].kind]);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setShown([]), SHOW_MS);
  }, [lobby, play]);
  return shown;
}

export function TvMoments({ moments }: { moments: Moment[] }) {
  if (!moments.length) return null;
  return (
    <ul className={tv.moments} aria-live="polite" data-testid="tv-moments">
      {moments.map((m) => (
        <li key={`${m.kind}:${m.text}`} data-kind={m.kind}>{m.text}</li>
      ))}
    </ul>
  );
}
