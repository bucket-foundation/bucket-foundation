export interface Experiment {
  key: string;
  arms: readonly string[];
  fallback: string;
}

export const EXPERIMENTS: readonly Experiment[] = [
  { key: "option_language", arms: ["cross", "same"], fallback: "same" },
  { key: "new_words", arms: ["4", "8"], fallback: "4" },
  { key: "practice_order", arms: ["mixed", "blocked"], fallback: "blocked" },
  { key: "cognate_hints", arms: ["on", "off"], fallback: "off" },
];

export interface AssignmentRow {
  userId: string;
  experiment: string;
  arm: string;
  source: "hash" | "cohort";
  cohort: string;
  assignedAt: string;
}

export type CohortSetting = "on" | "off" | string;

export interface CohortSettingRow {
  experiment: string;
  cohort: string;
  setting: CohortSetting;
}
