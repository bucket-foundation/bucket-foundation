import { finished } from "./lobbies";

export const COHORT_SIZE = 30;
export const PROMOTE = 7;
export const DEMOTE = 5;
export const TOP_TIER = 8;
export const DAILY_CAP = 1500;
export const TIER_NAMES = ["Parchment", "Ochre", "Maya", "Malachite", "Lapis", "Vermilion", "Tyrian", "Gold"];

export function weekOf(now: number): { id: string; startsAt: string; endsAt: string } {
  const d = new Date(now);
  const back = (d.getUTCDay() + 6) % 7;
  const start = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - back);
  return { id: new Date(start).toISOString().slice(0, 10), startsAt: new Date(start).toISOString(), endsAt: new Date(start + 7 * 86_400_000).toISOString() };
}

export function previousWeekId(weekId: string): string {
  return new Date(Date.parse(`${weekId}T00:00:00Z`) - 7 * 86_400_000).toISOString().slice(0, 10);
}

export interface Standing {
  user_id: string;
  points: number;
}

export function ranked<T extends Standing>(rows: readonly T[]): T[] {
  return rows.slice().sort((a, b) => b.points - a.points || a.user_id.localeCompare(b.user_id));
}

export function nextTier(last: { tier: number; rank: number; size: number } | null): number {
  if (!last) return 1;
  if (last.rank <= PROMOTE && last.size > PROMOTE) return Math.min(TOP_TIER, last.tier + 1);
  if (last.tier > 1 && last.rank > last.size - DEMOTE && last.size > DEMOTE) return last.tier - 1;
  return last.tier;
}

export function cohortFor(countsByCohort: ReadonlyMap<number, number>): number {
  let c = 0;
  while ((countsByCohort.get(c) ?? 0) >= COHORT_SIZE) c++;
  return c;
}

export function leagueAllowed(band: string | null): boolean {
  return band === "13to17" || band === "18plus";
}

export const LEAGUE_BASE = 100;

export function basePoints(answers: readonly { correct: boolean }[]): number {
  return answers.filter((a) => a.correct).length * LEAGUE_BASE;
}

export function claimOpen(lobby: Parameters<typeof finished>[0], humans: number, now: number): boolean {
  return !!lobby.started_at && humans >= 2 && finished(lobby, now);
}

export function familyJoinAllowed(kind: string, band: string | null): boolean {
  return kind !== "family" || band !== "under13";
}
