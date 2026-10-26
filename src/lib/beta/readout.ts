import { EXPERIMENTS, type AssignmentRow, type Experiment } from "./experiment-registry";
import { RETENTION_DAYS, utcDay, type RetentionDay } from "./metrics";
import type { BetaTester, StoredBetaEvent } from "./store";

export const Z95 = 1.959963984540054;
export const BOOTSTRAP = { replicates: 2000, seed: 20261026, method: "learner-bootstrap-percentile" } as const;

export interface Interval {
  lo: number;
  hi: number;
}

export type IntervalMethod = "wilson" | typeof BOOTSTRAP.method;

export interface Estimate {
  numerator: number;
  denominator: number;
  learners: number;
  rate: number | null;
  ci: Interval | null;
  method: IntervalMethod;
}

export interface Difference {
  vsArm: string;
  diff: number | null;
  ci: Interval | null;
  method: typeof BOOTSTRAP.method;
  replicates: number;
  seed: number;
}

export interface RetentionDefinition {
  metric: "retention";
  day: RetentionDay;
  exposure: "assignment.assignedAt";
  unit: "learner";
  success: "any event on UTC day exposureDay + day";
  eligible: "exposureDay + day < today";
}

export interface RecallDefinition {
  metric: "recall";
  day: RetentionDay;
  exposure: "assignment.assignedAt";
  unit: "card_answered event, clustered by learner";
  success: "props.correct === true";
  window: "UTC day exposureDay + day";
  eligible: "exposureDay + day < today";
}

export interface WindowReadout {
  day: RetentionDay;
  eligibleUsers: number;
  censoredUsers: number;
  retention: Estimate & { definition: RetentionDefinition; vsControl: Difference | null };
  recall: Estimate & { definition: RecallDefinition; vsControl: Difference | null };
}

export interface ArmReadout {
  arm: string;
  isControl: boolean;
  users: number;
  windows: WindowReadout[];
}

export interface ExperimentReadout {
  key: string;
  control: string;
  confidence: 0.95;
  randomized: ArmReadout[];
  pinned: ArmReadout[];
}

export interface Learner {
  retained: 0 | 1;
  answered: number;
  correct: number;
}

export function wilson(successes: number, trials: number, z: number = Z95): Interval | null {
  if (trials === 0) return null;
  const p = successes / trials;
  const z2 = z * z;
  const den = 1 + z2 / trials;
  const centre = (p + z2 / (2 * trials)) / den;
  const half = (z * Math.sqrt((p * (1 - p)) / trials + z2 / (4 * trials * trials))) / den;
  return { lo: Math.max(0, centre - half), hi: Math.min(1, centre + half) };
}

export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Stat = (ls: Learner[]) => number | null;

export const retentionStat: Stat = (ls) => (ls.length ? ls.reduce((s, l) => s + l.retained, 0) / ls.length : null);

export const recallStat: Stat = (ls) => {
  let n = 0;
  let c = 0;
  for (const l of ls) {
    n += l.answered;
    c += l.correct;
  }
  return n ? c / n : null;
};

function resample(ls: Learner[], rand: () => number): Learner[] {
  return ls.map(() => ls[Math.floor(rand() * ls.length)]);
}

function percentile(values: number[]): Interval | null {
  if (values.length < 2) return null;
  const s = [...values].sort((a, b) => a - b);
  const at = (q: number) => {
    const i = q * (s.length - 1);
    const lo = Math.floor(i);
    return s[lo] + (s[Math.min(lo + 1, s.length - 1)] - s[lo]) * (i - lo);
  };
  return { lo: at(0.025), hi: at(0.975) };
}

export function bootstrapRate(ls: Learner[], stat: Stat, replicates: number = BOOTSTRAP.replicates, seed: number = BOOTSTRAP.seed): Interval | null {
  if (stat(ls) === null) return null;
  const rand = rng(seed);
  const out: number[] = [];
  for (let i = 0; i < replicates; i++) {
    const v = stat(resample(ls, rand));
    if (v !== null) out.push(v);
  }
  return percentile(out);
}

export function bootstrapDiff(arm: Learner[], control: Learner[], stat: Stat, vsArm: string, replicates: number = BOOTSTRAP.replicates, seed: number = BOOTSTRAP.seed): Difference {
  const base = { vsArm, method: BOOTSTRAP.method, replicates, seed };
  const a = stat(arm);
  const c = stat(control);
  if (a === null || c === null) return { ...base, diff: null, ci: null };
  const rand = rng(seed);
  const out: number[] = [];
  for (let i = 0; i < replicates; i++) {
    const x = stat(resample(arm, rand));
    const y = stat(resample(control, rand));
    if (x !== null && y !== null) out.push(x - y);
  }
  return { ...base, diff: a - c, ci: percentile(out) };
}

function learnersFor(rows: AssignmentRow[], byUser: Map<string, StoredBetaEvent[]>, day: RetentionDay, today: number): { eligible: Learner[]; censored: number } {
  const eligible: Learner[] = [];
  let censored = 0;
  for (const a of rows) {
    const target = utcDay(a.assignedAt) + day;
    if (target >= today) {
      censored++;
      continue;
    }
    const onDay = (byUser.get(a.userId) ?? []).filter((e) => utcDay(e.ts) === target);
    const answers = onDay.filter((e) => e.name === "card_answered");
    eligible.push({ retained: onDay.length ? 1 : 0, answered: answers.length, correct: answers.filter((e) => e.props.correct === true).length });
  }
  return { eligible, censored };
}

function retentionEstimate(ls: Learner[]): Estimate {
  const k = ls.reduce((s, l) => s + l.retained, 0);
  return { numerator: k, denominator: ls.length, learners: ls.length, rate: retentionStat(ls), ci: wilson(k, ls.length), method: "wilson" };
}

function recallEstimate(ls: Learner[]): Estimate {
  const contributing = ls.filter((l) => l.answered > 0);
  return {
    numerator: ls.reduce((s, l) => s + l.correct, 0),
    denominator: ls.reduce((s, l) => s + l.answered, 0),
    learners: contributing.length,
    rate: recallStat(ls),
    ci: bootstrapRate(contributing, recallStat),
    method: BOOTSTRAP.method,
  };
}

function armReadouts(exp: Experiment, rows: AssignmentRow[], byUser: Map<string, StoredBetaEvent[]>, today: number, compare: boolean): ArmReadout[] {
  const control = exp.fallback;
  const groups = new Map(exp.arms.map((arm) => [arm, RETENTION_DAYS.map((d) => learnersFor(rows.filter((a) => a.arm === arm), byUser, d, today))]));
  const ctl = groups.get(control)!;
  return exp.arms.map((arm) => ({
    arm,
    isControl: arm === control,
    users: rows.filter((a) => a.arm === arm).length,
    windows: RETENTION_DAYS.map((day, i) => {
      const { eligible, censored } = groups.get(arm)![i];
      const versus = compare && arm !== control;
      const c = ctl[i].eligible;
      return {
        day,
        eligibleUsers: eligible.length,
        censoredUsers: censored,
        retention: {
          ...retentionEstimate(eligible),
          definition: { metric: "retention", day, exposure: "assignment.assignedAt", unit: "learner", success: "any event on UTC day exposureDay + day", eligible: "exposureDay + day < today" },
          vsControl: versus ? bootstrapDiff(eligible, c, retentionStat, control) : null,
        },
        recall: {
          ...recallEstimate(eligible),
          definition: { metric: "recall", day, exposure: "assignment.assignedAt", unit: "card_answered event, clustered by learner", success: "props.correct === true", window: "UTC day exposureDay + day", eligible: "exposureDay + day < today" },
          vsControl: versus ? bootstrapDiff(eligible.filter((l) => l.answered > 0), c.filter((l) => l.answered > 0), recallStat, control) : null,
        },
      };
    }),
  }));
}

export function readoutExperiment(exp: Experiment, testers: BetaTester[], events: StoredBetaEvent[], assignments: AssignmentRow[], now: Date = new Date()): ExperimentReadout {
  const today = utcDay(now.toISOString());
  const active = new Set(testers.filter((t) => !t.optedOut).map((t) => t.userId));
  const byUser = new Map<string, StoredBetaEvent[]>();
  for (const e of events) {
    if (!active.has(e.userId)) continue;
    const list = byUser.get(e.userId) ?? [];
    list.push(e);
    byUser.set(e.userId, list);
  }
  const held = assignments.filter((a) => a.experiment === exp.key && active.has(a.userId) && exp.arms.includes(a.arm));
  return {
    key: exp.key,
    control: exp.fallback,
    confidence: 0.95,
    randomized: armReadouts(exp, held.filter((a) => a.source === "hash"), byUser, today, true),
    pinned: armReadouts(exp, held.filter((a) => a.source === "cohort"), byUser, today, false),
  };
}

export function readoutAll(testers: BetaTester[], events: StoredBetaEvent[], assignments: AssignmentRow[], now: Date = new Date()): ExperimentReadout[] {
  return EXPERIMENTS.map((exp) => readoutExperiment(exp, testers, events, assignments, now));
}
