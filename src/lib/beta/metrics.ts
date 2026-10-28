import { EXPERIMENTS, type AssignmentRow } from "./experiment-registry";
import type { BetaTester, StoredBetaEvent } from "./store";

export const RETENTION_DAYS = [1, 7, 30] as const;
export type RetentionDay = (typeof RETENTION_DAYS)[number];

const DAY_MS = 86_400_000;

export function utcDay(iso: string): number {
  return Math.floor(Date.parse(iso) / DAY_MS);
}

export interface UserSummary {
  userId: string;
  cohort: string;
  apps: string[];
  firstSeen: string | null;
  lastSeen: string | null;
  activeDays: number;
  sessions: number;
  cardsShown: number;
  cardsAnswered: number;
  cardsCorrect: number;
  lessonsCompleted: number;
  secondsInSession: number;
  cardMsTotal: number;
  cardMsCount: number;
  retained: Record<RetentionDay, boolean | null>;
  recall: Record<RetentionDay, number | null>;
}

export interface CohortSummary {
  cohort: string;
  users: number;
  activeUsers: number;
  sessions: number;
  cardsAnswered: number;
  accuracy: number | null;
  lessonsCompleted: number;
  avgCardMs: number | null;
  retention: Record<RetentionDay, number | null>;
  recall: Record<RetentionDay, number | null>;
}

function ratio(num: number, den: number): number | null {
  return den === 0 ? null : num / den;
}

export function summarizeUser(tester: BetaTester, events: StoredBetaEvent[], today: number): UserSummary {
  const sorted = [...events].sort((a, b) => Date.parse(a.ts) - Date.parse(b.ts));
  const days = new Set(sorted.map((e) => utcDay(e.ts)));
  const first = sorted.length ? utcDay(sorted[0].ts) : null;
  const sessions = new Set<string>();
  let cardsShown = 0;
  let cardsAnswered = 0;
  let cardsCorrect = 0;
  let lessons = 0;
  let seconds = 0;
  let cardMsTotal = 0;
  let cardMsCount = 0;
  const dayAnswers = new Map<number, { n: number; c: number }>();
  for (const e of sorted) {
    if (e.sessionId) sessions.add(e.sessionId);
    if (e.name === "card_shown") cardsShown++;
    if (e.name === "lesson_complete") lessons++;
    if (e.name === "session_end" && typeof e.props.seconds === "number" && e.props.seconds >= 0) seconds += Math.min(e.props.seconds, 86_400);
    if (e.name === "card_answered") {
      cardsAnswered++;
      if (typeof e.props.ms === "number" && e.props.ms >= 0 && e.props.ms <= 600_000) {
        cardMsTotal += e.props.ms;
        cardMsCount++;
      }
      const ok = e.props.correct === true;
      if (ok) cardsCorrect++;
      const d = utcDay(e.ts);
      const cur = dayAnswers.get(d) ?? { n: 0, c: 0 };
      cur.n++;
      if (ok) cur.c++;
      dayAnswers.set(d, cur);
    }
  }
  const retained = {} as Record<RetentionDay, boolean | null>;
  const recall = {} as Record<RetentionDay, number | null>;
  for (const n of RETENTION_DAYS) {
    if (first === null || first + n > today) {
      retained[n] = null;
      recall[n] = null;
      continue;
    }
    retained[n] = days.has(first + n);
    const a = dayAnswers.get(first + n);
    recall[n] = a ? ratio(a.c, a.n) : null;
  }
  return {
    userId: tester.userId,
    cohort: tester.cohort,
    apps: Array.from(new Set(sorted.map((e) => e.app))).sort(),
    firstSeen: sorted.length ? sorted[0].ts : null,
    lastSeen: sorted.length ? sorted[sorted.length - 1].ts : null,
    activeDays: days.size,
    sessions: sessions.size,
    cardsShown,
    cardsAnswered,
    cardsCorrect,
    lessonsCompleted: lessons,
    secondsInSession: seconds,
    cardMsTotal,
    cardMsCount,
    retained,
    recall,
  };
}

export function summarizeGroup(label: string, users: UserSummary[]): CohortSummary {
  const retention = {} as Record<RetentionDay, number | null>;
  const recall = {} as Record<RetentionDay, number | null>;
  for (const n of RETENTION_DAYS) {
    const eligible = users.filter((u) => u.retained[n] !== null);
    retention[n] = ratio(eligible.filter((u) => u.retained[n]).length, eligible.length);
    const scores = users.map((u) => u.recall[n]).filter((v): v is number => v !== null);
    recall[n] = scores.length ? scores.reduce((s, v) => s + v, 0) / scores.length : null;
  }
  const answered = users.reduce((s, u) => s + u.cardsAnswered, 0);
  return {
    cohort: label,
    users: users.length,
    activeUsers: users.filter((u) => u.activeDays > 0).length,
    sessions: users.reduce((s, u) => s + u.sessions, 0),
    cardsAnswered: answered,
    accuracy: ratio(users.reduce((s, u) => s + u.cardsCorrect, 0), answered),
    lessonsCompleted: users.reduce((s, u) => s + u.lessonsCompleted, 0),
    avgCardMs: ratio(users.reduce((s, u) => s + u.cardMsTotal, 0), users.reduce((s, u) => s + u.cardMsCount, 0)),
    retention,
    recall,
  };
}

export interface BetaReport {
  generatedAt: string;
  users: UserSummary[];
  cohorts: CohortSummary[];
  experiments: ExperimentSummary[];
}

export interface ArmSummary extends CohortSummary {
  pinned: number;
}

export interface ExperimentSummary {
  key: string;
  arms: ArmSummary[];
  excluded: number;
}

export function buildReport(testers: BetaTester[], events: StoredBetaEvent[], now: Date = new Date(), assignments: AssignmentRow[] = []): BetaReport {
  const today = Math.floor(now.getTime() / DAY_MS);
  const byUser = new Map<string, StoredBetaEvent[]>();
  for (const e of events) {
    const list = byUser.get(e.userId) ?? [];
    list.push(e);
    byUser.set(e.userId, list);
  }
  const users = testers.filter((t) => !t.optedOut).map((t) => summarizeUser(t, byUser.get(t.userId) ?? [], today));
  const cohortNames = Array.from(new Set(users.map((u) => u.cohort))).sort();
  return {
    generatedAt: now.toISOString(),
    users,
    cohorts: cohortNames.map((c) => summarizeGroup(c, users.filter((u) => u.cohort === c))),
    experiments: EXPERIMENTS.map((exp) => {
      const held = new Map(assignments.filter((a) => a.experiment === exp.key).map((a) => [a.userId, a]));
      return {
        key: exp.key,
        arms: exp.arms.map((arm) => {
          const inArm = users.filter((u) => held.get(u.userId)?.arm === arm);
          return { ...summarizeGroup(arm, inArm), pinned: inArm.filter((u) => held.get(u.userId)?.source === "cohort").length };
        }),
        excluded: users.filter((u) => !held.has(u.userId)).length,
      };
    }),
  };
}
