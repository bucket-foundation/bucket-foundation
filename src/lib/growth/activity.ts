import type { BetaTester, StoredBetaEvent } from "@/lib/beta/store";
import { utcDay } from "@/lib/beta/metrics";

const DAY_MS = 86_400_000;
export const ACTIVITY_DAYS = 28;
export const COHORT_WEEKS = 8;
export const COHORT_OFFSETS = [0, 1, 2, 3, 4] as const;

export interface ActivityDay {
  day: string;
  dau: number;
  wau: number;
  reviews: number;
}

export interface RetentionCohort {
  week: string;
  users: number;
  retained: (number | null)[];
}

export interface ActivityReport {
  days: ActivityDay[];
  cohorts: RetentionCohort[];
}

function isoDay(day: number): string {
  return new Date(day * DAY_MS).toISOString().slice(0, 10);
}

function weekOf(day: number): number {
  const dow = (new Date(day * DAY_MS).getUTCDay() + 6) % 7;
  return day - dow;
}

export function buildActivity(testers: BetaTester[], events: StoredBetaEvent[], now: Date = new Date()): ActivityReport {
  const today = utcDay(now.toISOString());
  const activeByDay = new Map<number, Set<string>>();
  const reviewsByDay = new Map<number, number>();
  const userDays = new Map<string, Set<number>>();
  for (const e of events) {
    const d = utcDay(e.ts);
    if (!Number.isFinite(d)) continue;
    const s = activeByDay.get(d) ?? new Set<string>();
    s.add(e.userId);
    activeByDay.set(d, s);
    if (e.name === "card_answered") reviewsByDay.set(d, (reviewsByDay.get(d) ?? 0) + 1);
    const ud = userDays.get(e.userId) ?? new Set<number>();
    ud.add(d);
    userDays.set(e.userId, ud);
  }
  const days: ActivityDay[] = [];
  for (let d = today - ACTIVITY_DAYS + 1; d <= today; d++) {
    const week = new Set<string>();
    for (let k = d - 6; k <= d; k++) activeByDay.get(k)?.forEach((u) => week.add(u));
    days.push({ day: isoDay(d), dau: activeByDay.get(d)?.size ?? 0, wau: week.size, reviews: reviewsByDay.get(d) ?? 0 });
  }
  const thisWeek = weekOf(today);
  const cohortUsers = new Map<number, string[]>();
  for (const t of testers) {
    const w = weekOf(utcDay(t.enrolledAt));
    if (w < thisWeek - (COHORT_WEEKS - 1) * 7) continue;
    const list = cohortUsers.get(w) ?? [];
    list.push(t.userId);
    cohortUsers.set(w, list);
  }
  const cohorts: RetentionCohort[] = Array.from(cohortUsers.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([w, users]) => ({
      week: isoDay(w),
      users: users.length,
      retained: COHORT_OFFSETS.map((off) => {
        const start = w + off * 7;
        if (start > today) return null;
        const hit = users.filter((u) => {
          const ds = userDays.get(u);
          if (!ds) return false;
          for (let k = start; k < start + 7; k++) if (ds.has(k)) return true;
          return false;
        }).length;
        return users.length ? hit / users.length : null;
      }),
    }));
  return { days, cohorts };
}
