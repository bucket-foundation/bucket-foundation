const BEST_KEY = "polingual-web/flag-tiles-best/v1";

type RunPhase = "ready" | "running" | "missed" | "over";

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

export type LaneState = "right" | "wrong" | "dim" | undefined;

export function laneState(s: RunState, lane: number, answer: number): LaneState {
  if (s.phase !== "missed" && s.phase !== "over") return undefined;
  return lane === answer ? "right" : lane === s.picked ? "wrong" : "dim";
}

type GhostRow = { name: string; flag: string; skill: string; score: number };
export type BoardRow = { name: string; flag: string | null; score: number; bot: string | null; me: boolean };

export function boardRows(ghosts: readonly GhostRow[], score: number): BoardRow[] {
  const rows: BoardRow[] = [...ghosts.map((g) => ({ name: g.name, flag: g.flag, score: g.score, bot: g.skill, me: false })), { name: "You", flag: null, score, bot: null, me: true }];
  return rows.sort((a, b) => b.score - a.score);
}
