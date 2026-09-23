import { isGroundedCheck } from "./stages";
import type { GuidanceLevel, Stage } from "./types";
import { stageAtLeast } from "./types";
import { loadLearnerStates, loadRecentCheckEvents, type RecentCheckEvent } from "./db";

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

export interface GuidanceChainStep {
  node: { id: string };
}

export async function guidanceLevel(learnerId: string, chain: GuidanceChainStep[]): Promise<GuidanceLevel> {
  const firstTwoIds = chain.slice(0, 2).map((step) => step.node.id);
  const states = firstTwoIds.length > 0 ? await loadLearnerStates(learnerId, firstTwoIds) : [];
  const stageById = new Map(states.map((s) => [s.nodeId, s.stage]));
  const base = computeGuidanceLevel(firstTwoIds.map((id) => stageById.get(id) ?? "access"));

  const recent: RecentCheckEvent[] = await loadRecentCheckEvents(learnerId, 2);
  const outcomes = recent
    .slice()
    .reverse()
    .map((e) => classifyCheckOutcome({ result: e.result, confidence: e.confidence, abstained: e.abstained }));

  return nextGuidanceLevel(base, outcomes);
}
