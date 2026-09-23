import { STAGE_ORDER, type Stage } from "./types";

export const XP_AT_LEVEL: Record<Stage, number> = {
  access: 2,
  awareness: 10,
  understanding: 25,
  internalization: 50,
  production: 100,
};

export function xpForTransition(from: Stage | null | undefined, to: Stage): number {
  const fromIdx = from ? STAGE_ORDER.indexOf(from) : -1;
  const toIdx = STAGE_ORDER.indexOf(to);
  if (toIdx <= fromIdx) return 0;
  let xp = 0;
  for (let i = fromIdx + 1; i <= toIdx; i++) xp += XP_AT_LEVEL[STAGE_ORDER[i]];
  return xp;
}

export function levelFromXp(xp: number): number {
  let level = 1;
  while (xpAtLevelStart(level + 1) <= xp) level++;
  return level;
}

export function xpAtLevelStart(level: number): number {
  return 50 * level * (level - 1);
}

export function xpToNextLevel(xp: number): { level: number; into: number; span: number } {
  const level = levelFromXp(xp);
  const start = xpAtLevelStart(level);
  const next = xpAtLevelStart(level + 1);
  return { level, into: xp - start, span: next - start };
}

export function nextStreak(prev: { streakDays: number; lastActiveDay: string | null }, today: string): { streakDays: number; lastActiveDay: string } {
  if (prev.lastActiveDay === today) return { streakDays: Math.max(1, prev.streakDays), lastActiveDay: today };
  if (prev.lastActiveDay && isYesterday(prev.lastActiveDay, today)) return { streakDays: prev.streakDays + 1, lastActiveDay: today };
  return { streakDays: 1, lastActiveDay: today };
}

function isYesterday(day: string, today: string): boolean {
  const d = Date.parse(day + "T00:00:00Z");
  const t = Date.parse(today + "T00:00:00Z");
  return Number.isFinite(d) && Number.isFinite(t) && t - d === 86400000;
}

export function dayOf(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

export type BadgeKind = "internalized" | "produced";

export interface Badge {
  kind: BadgeKind;
  node_id: string;
  at: string;
}

export function badgesFor(existing: Badge[], nodeId: string, from: Stage | null | undefined, to: Stage, now: Date = new Date()): Badge[] {
  const toIdx = STAGE_ORDER.indexOf(to);
  const fromIdx = from ? STAGE_ORDER.indexOf(from) : -1;
  const earned: Badge[] = [];
  const has = (kind: BadgeKind) => existing.some((b) => b.kind === kind && b.node_id === nodeId);
  if (fromIdx < STAGE_ORDER.indexOf("internalization") && toIdx >= STAGE_ORDER.indexOf("internalization") && !has("internalized")) {
    earned.push({ kind: "internalized", node_id: nodeId, at: now.toISOString() });
  }
  if (fromIdx < STAGE_ORDER.indexOf("production") && toIdx >= STAGE_ORDER.indexOf("production") && !has("produced")) {
    earned.push({ kind: "produced", node_id: nodeId, at: now.toISOString() });
  }
  return earned;
}

export interface GameState {
  xp: number;
  streakDays: number;
  lastActiveDay: string | null;
  badges: Badge[];
}

export interface GameSummary extends GameState {
  level: number;
  into: number;
  span: number;
}

export function summarize(state: GameState): GameSummary {
  return { ...state, ...xpToNextLevel(state.xp) };
}

export function applyTransition(state: GameState, nodeId: string, from: Stage | null | undefined, to: Stage, now: Date = new Date()): GameState {
  const gained = xpForTransition(from, to);
  const streak = nextStreak({ streakDays: state.streakDays, lastActiveDay: state.lastActiveDay }, dayOf(now));
  const badges = [...state.badges, ...badgesFor(state.badges, nodeId, from, to, now)];
  return { xp: state.xp + gained, streakDays: streak.streakDays, lastActiveDay: streak.lastActiveDay, badges };
}
