/**
 * Research OS for K-12, faded guidance for low-prior-knowledge learners
 * (bkt-ros ros-14). See learning/research-os/GUIDANCE.md for the full
 * design account: what each level shows, the fading schedule, what gets
 * logged, and the evidence it rests on (Kirschner, Sweller, and Clark
 * 2006; Renkl 2002; the founder brief's own item 1 and item 2).
 *
 * TWO PURE RULES, composed by the one server function at the bottom:
 *
 *   1. computeGuidanceLevel: the BASE level, from the learner's own Stage
 *      on the routed chain's first two nodes (frontier.ts's `chain`,
 *      farthest-from-target first) -- the two farthest-back prerequisites,
 *      always the nodes closest to the learner's actual working frontier
 *      regardless of which node is currently on screen. Both below Understanding: high.
 *      One: medium. Neither: low.
 *
 *   2. nextGuidanceLevel: the FADING SCHEDULE, a one-step adjustment on top
 *      of the base level from the learner's last two in-path Check
 *      outcomes (across nodes, diagnostic-probe checks excluded --
 *      probe.ts's own header already establishes a probe answer measures
 *      something different from an in-path Check). Two passes in a row
 *      drops the level one step (more independence earned); two abstains
 *      or fails in a row raises it one step (more support needed); a mixed
 *      pair, or fewer than two recent Checks, leaves the base level
 *      unchanged.
 *
 * Composing the two this way keeps `guidanceLevel(learnerId, chain)`'s own
 * signature exactly what item 1 of this bead specifies (a level computed
 * from the chain's first two nodes) while still implementing item 2's
 * fading schedule as a real, testable adjustment: the base is "how much
 * this learner generally knows of the nearest foundational material," the
 * schedule is "how this learner is doing right now," and the schedule can
 * only move the base one step in either direction, never skip a level.
 */
import { isGroundedCheck } from "./stages";
import type { GuidanceLevel, Stage } from "./types";
import { stageAtLeast } from "./types";
import { loadLearnerStates, loadRecentCheckEvents, type RecentCheckEvent } from "./db";

const LEVEL_ORDER: GuidanceLevel[] = ["low", "medium", "high"];

/**
 * The base-level rule (item 1), pure and dependency-free, matching this
 * repo's convention for every other gating rule (consent.ts's
 * decideConsent, stages.ts's transition functions): fully unit-tested with
 * plain Stage arrays, no database.
 *
 * `firstTwoStages` is the learner's own Stage on the chain's first two
 * nodes, in chain order; a node with no learner_node_state row reads as
 * Stage "access" (the same "no record as access" default frontier.ts and
 * every stage transition already use) -- the caller (guidanceLevel below)
 * is responsible for that default, this function only ever sees Stage
 * values, never "no record."
 *
 * Fewer than two entries is a real edge case (a target with 0 or 1
 * prerequisite in its own chain, e.g. a root node routed to itself): with
 * exactly one Stage, that Stage's own below/at-Understanding split still
 * decides medium versus low (there is only one data point, so "both below"
 * can never be reached, matching the rule's own "two nodes" premise); with
 * zero, there is nothing to grade, so this returns "medium," the neutral
 * default -- neither maximum scaffolding nor none.
 */
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

/** isGroundedCheck (stages.ts), renamed to the pass/fail vocabulary the
 * fading schedule reads in. Reusing the exact predicate onCheckResult
 * itself used when the event was recorded, so a later replay of the
 * evidence log classifies each past Check the same way the transition
 * rule did at the time -- no second, potentially drifting copy of
 * "support, unabstained, medium-or-higher confidence." */
export function classifyCheckOutcome(check: { result: "support" | "contradiction" | "unknown"; confidence: "high" | "medium" | "low"; abstained: boolean }): CheckOutcome {
  return isGroundedCheck(check) ? "pass" : "fail";
}

function stepLevel(level: GuidanceLevel, delta: -1 | 1): GuidanceLevel {
  const idx = LEVEL_ORDER.indexOf(level);
  const next = Math.min(LEVEL_ORDER.length - 1, Math.max(0, idx + delta));
  return LEVEL_ORDER[next];
}

/**
 * The fading schedule (item 2), pure and dependency-free. `recentOutcomes`
 * is the learner's last few in-path Check outcomes, OLDEST FIRST (so
 * `.slice(-2)` below reads as "the two most recent"), already classified
 * by classifyCheckOutcome above.
 *
 *   - the two most recent are both "pass": drop one level (high -> medium,
 *     medium -> low, low stays low -- there is no lower floor).
 *   - the two most recent are both "fail": rise one level (low -> medium,
 *     medium -> high, high stays high -- there is no higher ceiling).
 *   - anything else (a mixed pair, or fewer than two outcomes on record):
 *     `base` is returned unchanged. A single strong or weak Check is not
 *     yet a streak; the schedule only moves on two IN A ROW, matching the
 *     brief's own "two consecutive" wording exactly.
 */
export function nextGuidanceLevel(base: GuidanceLevel, recentOutcomes: CheckOutcome[]): GuidanceLevel {
  const lastTwo = recentOutcomes.slice(-2);
  if (lastTwo.length < 2) return base;
  if (lastTwo.every((o) => o === "pass")) return stepLevel(base, -1);
  if (lastTwo.every((o) => o === "fail")) return stepLevel(base, 1);
  return base;
}

/** The minimal chain-step shape guidanceLevel needs: a routed chain entry
 * carrying just its node id. frontier.ts's FrontierStep (and the route
 * API's own `chain` response) already satisfy this structurally, with no
 * import needed here -- this file stays dependency-free of frontier.ts the
 * same way stages.ts and probe.ts stay dependency-free of it. */
export interface GuidanceChainStep {
  node: { id: string };
}

/**
 * guidanceLevel(learnerId, chain): the server-side wrapper (item 1's own
 * signature), composing computeGuidanceLevel and nextGuidanceLevel above.
 * `chain` is the routed chain in frontier.ts's own "farthest prerequisite
 * first, target last" order (computeFrontier's `chain`, or class-view.ts's
 * seedPathOrder over the same walk); the first two entries are the two
 * prerequisites closest to the learner's current frontier.
 *
 * Two small reads, matching consent.ts's own "a thin DB-reading wrapper
 * around a pure decision function is not directly unit tested" convention
 * (every decision this function makes is factored into computeGuidanceLevel
 * and nextGuidanceLevel above, both fully covered by
 * scripts/test-research-os-guidance.ts): the first two chain nodes' own
 * Stage, and the learner's last two in-path Check outcomes across every
 * node. Both fail open to an empty read (an RLS-blocked call, a fresh
 * environment, a network blip) instead of throwing, so a guidance-level
 * read never fails the caller's own request -- the worst case is "medium"/
 * "unchanged," never a 500.
 */
export async function guidanceLevel(learnerId: string, chain: GuidanceChainStep[]): Promise<GuidanceLevel> {
  const firstTwoIds = chain.slice(0, 2).map((step) => step.node.id);
  const states = firstTwoIds.length > 0 ? await loadLearnerStates(learnerId, firstTwoIds) : [];
  const stageById = new Map(states.map((s) => [s.nodeId, s.stage]));
  const base = computeGuidanceLevel(firstTwoIds.map((id) => stageById.get(id) ?? "access"));

  const recent: RecentCheckEvent[] = await loadRecentCheckEvents(learnerId, 2);
  // loadRecentCheckEvents returns newest first; the fading schedule reads
  // oldest first (see nextGuidanceLevel's own header), so reverse here.
  const outcomes = recent
    .slice()
    .reverse()
    .map((e) => classifyCheckOutcome({ result: e.result, confidence: e.confidence, abstained: e.abstained }));

  return nextGuidanceLevel(base, outcomes);
}
