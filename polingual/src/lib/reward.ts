export type RewardKind = "hit" | "miss" | "save" | "round-end";

export interface RewardState {
  xp: number;
  combo: number;
  best: number;
  streak: number;
  lastDay: string | null;
}

export interface RewardStep {
  state: RewardState;
  gained: number;
}

export const REWARD_KEY = "polingual-web/rewards/v1";
export const REWARD_EVENT = "polingual-reward";
export const EMPTY_REWARD: RewardState = { xp: 0, combo: 0, best: 0, streak: 0, lastDay: null };

export function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function dayBefore(day: string): string {
  const [y, m, d] = day.split("-").map(Number);
  return dayKey(new Date(y, m - 1, d - 1));
}

export function touchStreak(s: RewardState, today: string): RewardState {
  if (s.lastDay === today) return s;
  const streak = s.lastDay && dayBefore(today) === s.lastDay ? s.streak + 1 : 1;
  return { ...s, streak, lastDay: today };
}

export function comboMultiplier(combo: number): number {
  return Math.min(Math.max(combo, 1), 5);
}

export function applyReward(s: RewardState, kind: RewardKind, today: string): RewardStep {
  if (kind === "miss") return { state: { ...s, combo: 0 }, gained: 0 };
  if (kind === "round-end") {
    const state = touchStreak(s, today);
    return { state: { ...state, xp: state.xp + 25 }, gained: 25 };
  }
  const combo = s.combo + 1;
  const gained = (kind === "save" ? 5 : 10) * comboMultiplier(combo);
  const state = touchStreak({ ...s, combo, best: Math.max(s.best, combo), xp: s.xp + gained }, today);
  return { state, gained };
}

export function readReward(store: Storage | null): RewardState {
  try {
    const raw = store?.getItem(REWARD_KEY);
    return raw ? { ...EMPTY_REWARD, ...(JSON.parse(raw) as Partial<RewardState>) } : EMPTY_REWARD;
  } catch {
    return EMPTY_REWARD;
  }
}

export function writeReward(store: Storage | null, s: RewardState): void {
  try {
    store?.setItem(REWARD_KEY, JSON.stringify(s));
  } catch {
    return;
  }
}

export function emitReward(kind: RewardKind): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<RewardKind>(REWARD_EVENT, { detail: kind }));
}
