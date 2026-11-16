"use client";

import { useEffect, useRef, useState } from "react";
import { secondsLeft, type Snapshot } from "@/lib/stoa/client";
import { countdownSfx, hostCue, intensity, rankMoves } from "@/lib/stoa/script";
import type { useStage } from "../show";

type Stage = ReturnType<typeof useStage>["stage"];

export function useHostCues(snap: Snapshot | null, now: number, offset: { current: number }, stage: Stage) {
  const prevSnap = useRef<Snapshot | null>(null);
  const lastBoard = useRef<Snapshot["standings"] | null>(null);
  const [moves, setMoves] = useState<Record<string, number>>({});
  const lastLeft = useRef<number | null>(null);

  useEffect(() => {
    if (!snap) {
      prevSnap.current = null;
      stage.play("silent");
      return;
    }
    const prev = prevSnap.current;
    const cue = hostCue(prev, snap);
    if (cue.track) stage.play(cue.track);
    stage.setLayers(intensity(snap.room.players));
    for (const f of cue.sfx ?? []) stage.sfx(f);
    if (cue.say?.length) stage.say(cue.say);
    if (snap.room.phase === "board" && prev?.room.phase !== "board") {
      setMoves(rankMoves(lastBoard.current, snap.standings));
      lastBoard.current = snap.standings;
    }
    prevSnap.current = snap;
  }, [snap, stage]);

  useEffect(() => {
    if (!snap || snap.room.phase !== "question" || snap.room.paused) {
      stage.setUrgent(false);
      lastLeft.current = null;
      return;
    }
    const left = secondsLeft(snap.room.closes_at, now, offset.current, snap.room.opens_at);
    const f = countdownSfx(left, lastLeft.current);
    if (f) stage.sfx(f);
    stage.setUrgent(left > 0 && left <= 5);
    lastLeft.current = left;
  }, [snap, now, stage, offset]);

  return moves;
}
