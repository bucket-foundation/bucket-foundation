import type { GuidanceLevel } from "./types";
import { loadLearnerStates, loadRecentCheckEvents, type RecentCheckEvent } from "./db";
import { classifyCheckOutcome, computeGuidanceLevel, nextGuidanceLevel } from "./guidance-level";

export { classifyCheckOutcome, computeGuidanceLevel, nextGuidanceLevel, type CheckOutcome } from "./guidance-level";

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
