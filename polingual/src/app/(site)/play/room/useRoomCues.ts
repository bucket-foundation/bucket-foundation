"use client";

import { useEffect, useRef, useState } from "react";
import { interstitialDue } from "@/lib/lobby/ads";
import { readBreaks, writeBreaks, type Breaks } from "@/lib/lobby/breaks";
import { play } from "@/lib/lobby/sound";

export function useRoomCues(roundKey: string, startedAt: string | null | undefined, muted: boolean, adsVisible: boolean, setKick: (f: (k: number) => number) => void) {
  const [breaks, setBreaks] = useState<Breaks>({ games: 0, lastInterstitial: null });
  const [interstitial, setInterstitial] = useState(false);
  const lastRound = useRef<string>("");
  const cheered = useRef<string>("");
  useEffect(() => setBreaks(readBreaks(() => window.localStorage)), []);

  useEffect(() => {
    if (!roundKey || roundKey === lastRound.current) return;
    lastRound.current = roundKey;
    if (roundKey.includes(":round:")) play("round", muted);
    if (roundKey.includes(":reveal:") || roundKey === "finished") setKick((k) => k + 1);
    if (roundKey === "finished" && cheered.current !== startedAt) {
      cheered.current = startedAt ?? "";
      play("win", muted);
      const stored = readBreaks(() => window.localStorage);
      const games = stored.games + 1;
      const now = Date.now();
      const show = adsVisible && interstitialDue(games, stored.lastInterstitial, now);
      const next = { games, lastInterstitial: show ? now : stored.lastInterstitial };
      writeBreaks(() => window.localStorage, next);
      setBreaks(next);
      if (show) setInterstitial(true);
    }
  }, [roundKey, muted, startedAt, adsVisible, setKick]);

  return { breaks, interstitial, setInterstitial };
}
