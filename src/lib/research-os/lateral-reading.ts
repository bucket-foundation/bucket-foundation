import type { Stage } from "./types";
import { stageAtLeast } from "./types";

export function envSecondSourceRequiredDefault(): boolean {
  const raw = (process.env.RESEARCH_OS_SECOND_SOURCE_REQUIRED || "").trim().toLowerCase();
  return raw !== "false" && raw !== "0";
}

export function resolveSecondSourceRequired(classOverride: boolean | null | undefined): boolean {
  return typeof classOverride === "boolean" ? classOverride : envSecondSourceRequiredDefault();
}

export function secondSourceRequiredAtStage(stage: Stage, enabled: boolean): boolean {
  return enabled && stageAtLeast(stage, "understanding");
}

export const SECOND_SOURCE_QUESTION_COPY = "Find a second place that says this.";
export const SECOND_SOURCE_AGREE_QUESTION_COPY = "Do the two sources agree?";

export const SECOND_SOURCE_MISSING_MESSAGE =
  "Find a second, independent source and quote it before you can see your results.";

export interface SecondSourceGateInput {
  required: boolean;
  stage: Stage;
  secondSourceNodeId?: string;
  secondSourceWasQuoted: boolean;
  secondSourceIndependent: boolean;
}

export type SecondSourceGateResult =
  | { ok: true; secondSourceRequired: boolean }
  | { ok: false; reason: "second_source_required"; message: typeof SECOND_SOURCE_MISSING_MESSAGE };

export function checkSecondSourceGate(input: SecondSourceGateInput): SecondSourceGateResult {
  const need = secondSourceRequiredAtStage(input.stage, input.required);
  if (!need) return { ok: true, secondSourceRequired: false };
  const satisfied = Boolean(input.secondSourceNodeId) && input.secondSourceWasQuoted && input.secondSourceIndependent;
  if (satisfied) return { ok: true, secondSourceRequired: true };
  return { ok: false, reason: "second_source_required", message: SECOND_SOURCE_MISSING_MESSAGE };
}
