export const BEST_KEY = "polingual-web/flag-tiles-best/v1";

export type RunPhase = "ready" | "running" | "missed" | "over";

export interface RunState {
  phase: RunPhase;
  index: number;
  score: number;
  continued: boolean;
  missed: number | null;
  picked: number | null;
}

export const START: RunState = { phase: "ready", index: 0, score: 0, continued: false, missed: null, picked: null };

export type RunEvent = { kind: "start" } | { kind: "tap"; lane: number; answer: number } | { kind: "timeout" } | { kind: "continue" } | { kind: "end" };

export function step(s: RunState, e: RunEvent): RunState {
  if (e.kind === "start") return { ...START, phase: "running" };
  if (e.kind === "tap" && s.phase === "running") {
    if (e.lane === e.answer) return { ...s, index: s.index + 1, score: s.score + 1 };
    return { ...s, phase: "missed", missed: s.index, picked: e.lane };
  }
  if (e.kind === "timeout" && s.phase === "running") return { ...s, phase: "missed", missed: s.index, picked: null };
  if (e.kind === "continue" && s.phase === "missed" && !s.continued) return { ...s, phase: "running", continued: true, index: s.index + 1, picked: null };
  if (e.kind === "end" && s.phase === "missed") return { ...s, phase: "over" };
  return s;
}

export function readBest(store: () => Storage | null, date: string): number {
  try {
    const v = JSON.parse(store()?.getItem(BEST_KEY) ?? "{}");
    return Number.isInteger(v?.[date]) ? v[date] : 0;
  } catch {
    return 0;
  }
}

export function writeBest(store: () => Storage | null, date: string, score: number): number {
  try {
    const s = store();
    const v = JSON.parse(s?.getItem(BEST_KEY) ?? "{}") ?? {};
    const best = Math.max(Number.isInteger(v[date]) ? v[date] : 0, score);
    s?.setItem(BEST_KEY, JSON.stringify({ [date]: best }));
    return best;
  } catch {
    return score;
  }
}
