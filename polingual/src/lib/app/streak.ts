import { dayKey, type EngineState } from "@academy/engine";
import { DAY_MS } from "@academy/fsrs";

export const STREAK_GOAL = 100;

export interface StreakCard {
  day: number;
  goal: number;
  studiedToday: boolean;
  complete: boolean;
  label: string;
}

export function liveStreak(stats: EngineState["stats"], now: number): { streak: number; studiedToday: boolean } {
  const today = dayKey(now);
  const yesterday = dayKey(now - DAY_MS);
  if (stats.lastStudyDay === today) return { streak: stats.streak || 0, studiedToday: true };
  if (stats.lastStudyDay === yesterday) return { streak: stats.streak || 0, studiedToday: false };
  return { streak: 0, studiedToday: false };
}

export function streakCard(states: EngineState[], now: number): StreakCard {
  let best = { streak: 0, studiedToday: false };
  for (const s of states) {
    const live = liveStreak(s.stats, now);
    if (live.streak > best.streak || (live.streak === best.streak && live.studiedToday)) best = live;
  }
  const day = Math.min(best.streak, STREAK_GOAL);
  return { day, goal: STREAK_GOAL, studiedToday: best.studiedToday, complete: best.streak >= STREAK_GOAL, label: `Day ${day} of ${STREAK_GOAL}` };
}
