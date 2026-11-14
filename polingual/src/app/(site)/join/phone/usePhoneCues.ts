"use client";

import { useEffect, useRef } from "react";
import { secondsLeft, type Snapshot } from "@/lib/stoa/client";
import { sfxBuzz } from "@/lib/stoa/phone";
import { countdownSfx, phoneCue } from "@/lib/stoa/script";
import { buzz } from "@/lib/stoa/stage";
import type { useStage } from "../../live/show";

type Stage = ReturnType<typeof useStage>["stage"];

export function usePhoneCues(snap: Snapshot | null, now: number, clock: { offset: number }, stage: Stage) {
  const prevSnap = useRef<Snapshot | null>(null);
  const lastLeft = useRef<number | null>(null);

  useEffect(() => {
    if (!snap) {
      prevSnap.current = null;
      return;
    }
    const cue = phoneCue(prevSnap.current, snap);
    for (const f of cue.sfx ?? []) {
      stage.sfx(f);
      const pattern = sfxBuzz(f);
      if (pattern !== null) buzz(pattern);
    }
    prevSnap.current = snap;
  }, [snap, stage]);

  useEffect(() => {
    if (!snap || snap.room.phase !== "question" || snap.room.paused || snap.player?.choice != null) {
      lastLeft.current = null;
      return;
    }
    const left = secondsLeft(snap.room.closes_at, now, clock.offset, snap.room.opens_at);
    const f = countdownSfx(left, lastLeft.current);
    if (f) stage.sfx(f);
    lastLeft.current = left;
  }, [snap, now, stage, clock]);
}
