import { isGroundedCheck } from "./stages";
import type { GuidanceLevel, Stage } from "./types";
import { stageAtLeast } from "./types";

const LEVEL_ORDER: GuidanceLevel[] = ["low", "medium", "high"];

export function computeGuidanceLevel(firstTwoStages: Stage[]): GuidanceLevel {
  if (firstTwoStages.length === 0) return "medium";
  const belowCount = firstTwoStages.filter((s) => !stageAtLeast(s, "understanding")).length;
  if (firstTwoStages.length >= 2) {
    if (belowCount >= 2) return "high";
    if (belowCount === 1) return "medium";
    return "low";
  }
  return belowCount === 1 ? "medium" : "low";
}

export type CheckOutcome = "pass" | "fail";

export function classifyCheckOutcome(check: { result: "support" | "contradiction" | "unknown"; confidence: "high" | "medium" | "low"; abstained: boolean }): CheckOutcome {
  return isGroundedCheck(check) ? "pass" : "fail";
}

function stepLevel(level: GuidanceLevel, delta: -1 | 1): GuidanceLevel {
  const idx = LEVEL_ORDER.indexOf(level);
  const next = Math.min(LEVEL_ORDER.length - 1, Math.max(0, idx + delta));
  return LEVEL_ORDER[next];
}

export function nextGuidanceLevel(base: GuidanceLevel, recentOutcomes: CheckOutcome[]): GuidanceLevel {
  const lastTwo = recentOutcomes.slice(-2);
  if (lastTwo.length < 2) return base;
  if (lastTwo.every((o) => o === "pass")) return stepLevel(base, -1);
  if (lastTwo.every((o) => o === "fail")) return stepLevel(base, 1);
  return base;
}
