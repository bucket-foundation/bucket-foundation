import { createHash } from "node:crypto";
import { EXPERIMENTS, type AssignmentRow, type CohortSetting, type CohortSettingRow, type Experiment } from "./experiment-registry";

export { EXPERIMENTS, type AssignmentRow, type CohortSetting, type CohortSettingRow, type Experiment };

export type FlagSource = "hash" | "cohort" | "off";

export interface Flag {
  value: string;
  arm: string | null;
  source: FlagSource;
}

export function findExperiment(key: string): Experiment | undefined {
  return EXPERIMENTS.find((e) => e.key === key);
}

export function validSetting(exp: Experiment, setting: string): boolean {
  return setting === "on" || setting === "off" || exp.arms.includes(setting);
}

export function hashArm(exp: Experiment, userId: string): string {
  const digest = createHash("sha256").update(`${exp.key}:${userId.toLowerCase()}`).digest();
  return exp.arms[digest.readUInt32BE(0) % exp.arms.length];
}

export function settingFor(rows: CohortSettingRow[], experiment: string, cohort: string): CohortSetting {
  return rows.find((r) => r.experiment === experiment && r.cohort === cohort)?.setting ?? "on";
}

export function assign(exp: Experiment, userId: string, cohort: string, rows: CohortSettingRow[]): Flag {
  const setting = settingFor(rows, exp.key, cohort);
  if (setting === "off" || !validSetting(exp, setting)) return { value: exp.fallback, arm: null, source: "off" };
  if (setting !== "on") return { value: setting, arm: setting, source: "cohort" };
  const arm = hashArm(exp, userId);
  return { value: arm, arm, source: "hash" };
}

export function flagsFor(userId: string, cohort: string, rows: CohortSettingRow[]): Record<string, Flag> {
  const out: Record<string, Flag> = {};
  for (const exp of EXPERIMENTS) out[exp.key] = assign(exp, userId, cohort, rows);
  return out;
}

export function newAssignments(userId: string, cohort: string, flags: Record<string, Flag>, held: AssignmentRow[], now: Date): AssignmentRow[] {
  const have = new Set(held.map((a) => a.experiment));
  const out: AssignmentRow[] = [];
  for (const [experiment, f] of Object.entries(flags)) {
    if (f.arm === null || f.source === "off" || have.has(experiment)) continue;
    out.push({ userId, experiment, arm: f.arm, source: f.source, cohort, assignedAt: now.toISOString() });
  }
  return out;
}

export function applyHeld(flags: Record<string, Flag>, held: AssignmentRow[]): Record<string, Flag> {
  const out = { ...flags };
  for (const a of held) {
    const f = out[a.experiment];
    if (!f || f.source === "off") continue;
    out[a.experiment] = { value: a.arm, arm: a.arm, source: a.source };
  }
  return out;
}
