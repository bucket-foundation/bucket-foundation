"use client";

import { useEffect, useRef, useState } from "react";
import { parseTile, TILE_LANES, TILE_SUBMIT_AT, tileSchedule } from "@academy/lobby-tiles";
import { flagEmoji, langFlag } from "@/lib/lobby/client";
import { play } from "@/lib/lobby/sound";
import { langName } from "./langs";
import styles from "./play.module.css";

const KEYS: Record<string, number> = { d: 0, f: 1, j: 2, k: 3, "1": 0, "2": 1, "3": 2, "4": 3, arrowleft: 0, arrowdown: 1, arrowup: 2, arrowright: 3 };

export interface TilesProps {
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

export function laneTarget(choices: readonly string[], schedule: ReturnType<typeof tileSchedule>, lane: number, elapsedMs: number, tapped: ReadonlySet<number>): number | null {
  let best: { index: number; progress: number } | null = null;
  for (const s of schedule) {
    if (s.lane !== lane || tapped.has(s.index) || s.index >= choices.length) continue;
    const progress = (elapsedMs - s.spawnMs) / s.fallMs;
    if (progress < 0 || progress > 1) continue;
    if (!best || progress > best.progress) best = { index: s.index, progress };
  }
  return best?.index ?? null;
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

  const tapRef = useRef(tap);
  tapRef.current = tap;
  const stateRef = useRef({ elapsedMs, tapped });
  stateRef.current = { elapsedMs, tapped };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const lane = KEYS[e.key.toLowerCase()];
      if (lane === undefined) return;
      e.preventDefault();
      tapRef.current(laneTarget(choices, schedule, lane, stateRef.current.elapsedMs, stateRef.current.tapped));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [choices, schedule]);

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
              .map((s) => {
                const progress = (elapsedMs - s.spawnMs) / s.fallMs;
                if (progress < -0.05 || progress > 1.1) return null;
                const t = parseTile(choices[s.index]);
                return (
                  <button
                    key={s.index}
                    type="button"
                    className={styles.tile}
                    data-tapped={tapped.has(s.index)}
                    data-testid="tile"
                    data-index={s.index}
                    style={{ top: `${Math.max(-12, Math.min(100, progress * 100)) - 12}%` }}
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      tap(s.index);
                    }}
                    aria-label={`${t.form}, ${langName(t.lang)}`}
                  >
                    <span className={styles.tileFlag} aria-hidden="true">{flagEmoji(langFlag(t.lang))}</span>
                    <span className={styles.tileWord}>{t.form}</span>
                  </button>
                );
              })}
          </div>
        ))}
      </div>
      <p className={styles.keysHint}>Tap tiles, or press D F J K</p>
    </div>
  );
}
