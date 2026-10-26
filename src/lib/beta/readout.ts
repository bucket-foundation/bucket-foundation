import { EXPERIMENTS, type AssignmentRow, type Experiment } from "./experiment-registry";
import { RETENTION_DAYS, utcDay, type RetentionDay } from "./metrics";
import type { BetaTester, StoredBetaEvent } from "./store";

export const Z95 = 1.959963984540054;

export interface Interval {
  lo: number;
  hi: number;
}

export interface Proportion {
  successes: number;
  trials: number;
  rate: number | null;
  ci: Interval | null;
  method: "wilson";
}

export interface Difference {
  vsArm: string;
  diff: number | null;
  ci: Interval | null;
  method: "newcombe-hybrid-wilson";
}

export interface RetentionDefinition {
  metric: "retention";
  day: RetentionDay;
  exposure: "assignment.assignedAt";
  unit: "user";
  success: "any event on UTC day exposureDay + day";
  eligible: "exposureDay + day < today";
}

export interface RecallDefinition {
  metric: "recall";
  day: RetentionDay;
  exposure: "assignment.assignedAt";
  unit: "card_answered event";
  success: "props.correct === true";
  window: "UTC day exposureDay + day";
  eligible: "exposureDay + day < today";
}

export interface WindowReadout {
  day: RetentionDay;
  eligibleUsers: number;
  censoredUsers: number;
  retention: Proportion & { definition: RetentionDefinition; vsControl: Difference | null };
  recall: Proportion & { definition: RecallDefinition; vsControl: Difference | null };
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
  arms: ArmReadout[];
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

export function proportion(successes: number, trials: number): Proportion {
  return { successes, trials, rate: trials === 0 ? null : successes / trials, ci: wilson(successes, trials), method: "wilson" };
}

export function newcombe(arm: Proportion, control: Proportion, vsArm: string): Difference {
  if (arm.rate === null || control.rate === null || !arm.ci || !control.ci) return { vsArm, diff: null, ci: null, method: "newcombe-hybrid-wilson" };
  const d = arm.rate - control.rate;
  const lo = d - Math.sqrt((arm.rate - arm.ci.lo) ** 2 + (control.ci.hi - control.rate) ** 2);
  const hi = d + Math.sqrt((arm.ci.hi - arm.rate) ** 2 + (control.rate - control.ci.lo) ** 2);
  return { vsArm, diff: d, ci: { lo, hi }, method: "newcombe-hybrid-wilson" };
}

interface Tally {
  eligible: number;
  censored: number;
  retained: number;
  answered: number;
  correct: number;
}

function tallyArm(rows: AssignmentRow[], byUser: Map<string, StoredBetaEvent[]>, day: RetentionDay, today: number): Tally {
  const t: Tally = { eligible: 0, censored: 0, retained: 0, answered: 0, correct: 0 };
  for (const a of rows) {
    const target = utcDay(a.assignedAt) + day;
    if (target >= today) {
      t.censored++;
      continue;
    }
    t.eligible++;
    const onDay = (byUser.get(a.userId) ?? []).filter((e) => utcDay(e.ts) === target);
    if (onDay.length) t.retained++;
    for (const e of onDay) {
      if (e.name !== "card_answered") continue;
      t.answered++;
      if (e.props.correct === true) t.correct++;
    }
  }
  return t;
}

export function readoutExperiment(
  exp: Experiment,
  testers: BetaTester[],
  events: StoredBetaEvent[],
  assignments: AssignmentRow[],
  now: Date = new Date(),
): ExperimentReadout {
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
  const control = exp.fallback;
  const tallies = new Map(exp.arms.map((arm) => [arm, RETENTION_DAYS.map((d) => tallyArm(held.filter((a) => a.arm === arm), byUser, d, today))]));
  const ctl = tallies.get(control);
  return {
    key: exp.key,
    control,
    confidence: 0.95,
    arms: exp.arms.map((arm) => ({
      arm,
      isControl: arm === control,
      users: held.filter((a) => a.arm === arm).length,
      windows: RETENTION_DAYS.map((day, i) => {
        const t = tallies.get(arm)![i];
        const c = ctl?.[i];
        const ret = proportion(t.retained, t.eligible);
        const rec = proportion(t.correct, t.answered);
        const versus = arm !== control && c;
        return {
          day,
          eligibleUsers: t.eligible,
          censoredUsers: t.censored,
          retention: {
            ...ret,
            definition: { metric: "retention", day, exposure: "assignment.assignedAt", unit: "user", success: "any event on UTC day exposureDay + day", eligible: "exposureDay + day < today" },
            vsControl: versus ? newcombe(ret, proportion(c.retained, c.eligible), control) : null,
          },
          recall: {
            ...rec,
            definition: { metric: "recall", day, exposure: "assignment.assignedAt", unit: "card_answered event", success: "props.correct === true", window: "UTC day exposureDay + day", eligible: "exposureDay + day < today" },
            vsControl: versus ? newcombe(rec, proportion(c.correct, c.answered), control) : null,
          },
        };
      }),
    })),
  };
}

export function readoutAll(testers: BetaTester[], events: StoredBetaEvent[], assignments: AssignmentRow[], now: Date = new Date()): ExperimentReadout[] {
  return EXPERIMENTS.map((exp) => readoutExperiment(exp, testers, events, assignments, now));
}
