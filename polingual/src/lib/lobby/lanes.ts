import type { tileSchedule } from "@academy/lobby-tiles";

export const LANE_KEYS: Record<string, number> = { d: 0, f: 1, j: 2, k: 3, "1": 0, "2": 1, "3": 2, "4": 3, arrowleft: 0, arrowdown: 1, arrowup: 2, arrowright: 3 };

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
