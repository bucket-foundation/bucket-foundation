import type { Game, Stats } from "./progress";

export type DayState = "won" | "lost" | "started" | "open" | "locked";

export function dayState(g: Game | undefined, open: boolean): DayState {
  if (g?.done) return g.won ? "won" : "lost";
  if (g) return "started";
  return open ? "open" : "locked";
}

export const DAY_ICON: Record<DayState, string> = { won: "✓", lost: "✕", locked: "🔒", started: "▶", open: "▶" };

export function guessError(reason: "short" | "letters" | "repeat", length: number): string {
  if (reason === "short") return `Use ${length} letters`;
  return reason === "repeat" ? "You tried that word" : "Letters only";
}

export function rollDay(d: number | null, today: number, prev: number | null, gameAt: (day: number) => Game | undefined): number {
  if (d === null || d > today) return today;
  if (prev !== null && d === prev && prev !== today) {
    const g = gameAt(d);
    if (!g || g.done) return today;
  }
  return d;
}

export function winRate(s: Pick<Stats, "played" | "won">): number {
  return s.played ? Math.round((100 * s.won) / s.played) : 0;
}

export function distWidth(n: number, dist: readonly number[]): number {
  return Math.max(8, (100 * n) / Math.max(1, ...dist));
}

export function typeKey(e: { key: string }): "enter" | "back" | string | null {
  if (e.key === "Enter") return "enter";
  if (e.key === "Backspace") return "back";
  const ch = e.key.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
  return /^[a-z]$/.test(ch) ? ch : null;
}
