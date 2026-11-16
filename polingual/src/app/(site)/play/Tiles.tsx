"use client";

import { useEffect, useRef, useState } from "react";
import { parseTile, TILE_LANES, TILE_SUBMIT_AT, tileSchedule } from "@academy/lobby-tiles";
import { TileFace } from "@/app/tile";
import { LANGS } from "@academy/lang-systems";
import { LANE_KEYS, laneTarget } from "@/lib/lobby/lanes";
import { play } from "@/lib/lobby/sound";
import styles from "./play.module.css";

type Slot = ReturnType<typeof tileSchedule>[number];

interface TilesProps {
  gloss: string;
  choices: string[];
  round: number;
  rounds: number;
  roundSeconds: number;
  elapsedMs: number;
  muted: boolean;
  locked: boolean;
  onSubmit: (tapped: number[]) => void;
}


export default function Tiles({ gloss, choices, round, rounds, roundSeconds, elapsedMs, muted, locked, onSubmit }: TilesProps) {
  const [tapped, setTapped] = useState<Set<number>>(() => new Set());
  const sent = useRef(false);
  const schedule = tileSchedule(choices.length, round, rounds, roundSeconds);
  const submitAt = roundSeconds * 1000 * TILE_SUBMIT_AT;

  const tap = (index: number | null) => {
    if (index === null || locked || sent.current || tapped.has(index)) return;
    play("tap", muted);
    setTapped((prev) => new Set(prev).add(index));
  };

  useTileKeys(tap, choices, schedule, elapsedMs, tapped);

  useEffect(() => {
    if (sent.current || locked) return;
    if (elapsedMs >= submitAt) {
      sent.current = true;
      onSubmit(Array.from(tapped));
    }
  }, [elapsedMs, locked, onSubmit, submitAt, tapped]);

  return (
    <div className={styles.tilesWrap} data-testid="tiles">
      <div className={styles.tilesPrompt}>
        <span className={styles.tilesHint}>Tap every word that means</span>
        <b className={styles.promptWord} data-testid="prompt">{gloss}</b>
      </div>
      <div className={styles.lanes} style={{ gridTemplateColumns: `repeat(${TILE_LANES}, minmax(0, 1fr))` }}>
        {Array.from({ length: TILE_LANES }, (_, lane) => (
          <div key={lane} className={styles.lane} onPointerDown={() => tap(laneTarget(choices, schedule, lane, elapsedMs, tapped))} data-testid="lane">
            {schedule
              .filter((s) => s.lane === lane && s.index < choices.length)
              .map((s) => <FallingTile key={s.index} slot={s} choice={choices[s.index]} elapsedMs={elapsedMs} tapped={tapped.has(s.index)} onTap={() => tap(s.index)} />)}
          </div>
        ))}
      </div>
      <p className={styles.keysHint}>Tap tiles, or press D F J K</p>
    </div>
  );
}

function useTileKeys(tap: (index: number | null) => void, choices: string[], schedule: Slot[], elapsedMs: number, tapped: Set<number>) {
  const tapRef = useRef(tap);
  tapRef.current = tap;
  const stateRef = useRef({ elapsedMs, tapped });
  stateRef.current = { elapsedMs, tapped };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const lane = LANE_KEYS[e.key.toLowerCase()];
      if (lane === undefined) return;
      e.preventDefault();
      tapRef.current(laneTarget(choices, schedule, lane, stateRef.current.elapsedMs, stateRef.current.tapped));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [choices, schedule]);
}

function FallingTile({ slot, choice, elapsedMs, tapped, onTap }: { slot: Slot; choice: string; elapsedMs: number; tapped: boolean; onTap: () => void }) {
  const progress = (elapsedMs - slot.spawnMs) / slot.fallMs;
  if (progress < -0.05 || progress > 1.1) return null;
  const t = parseTile(choice);
  const top = Math.max(-12, Math.min(100, progress * 100)) - 12;
  return (
    <TileFace
      as="button"
      lang={t.lang}
      word={t.form}
      rtl={LANGS[t.lang]?.rtl}
      className={styles.fallTile}
      style={{ top: `${top}%`, transform: "none", animation: "none", padding: 0 }}
      attrs={{
        "data-tapped": tapped,
        "data-testid": "tile",
        "data-index": slot.index,
        "aria-label": t.form,
        onPointerDown: (e: React.PointerEvent<HTMLElement>) => {
          e.stopPropagation();
          onTap();
        },
      }}
    />
  );
}
