/**
 * Research OS for K-12, the diagnostic probe (bkt-ros, Phase 1 item 2, per
 * RESEARCH-OS-K12-SYSTEM-REVIEW.md section 3 step 5, "handle unknown prior
 * knowledge": "if the frontier is empty or thin, run a diagnostic probe
 * against ... candidate frontier boundary nodes ... two items each"). Phase
 * 0 shipped frontier-backward routing with NO diagnostic-probe
 * generalization (task item 3's PR body, "Diagnostic-probe generalization
 * for cold-start learners" listed under "What's stubbed"); this closes that
 * stub for the one case the review calls out as the common cold-start
 * shape: a learner with no state record on ANY ancestor of the target.
 *
 * Pure functions, no I/O, dependency-free (same discipline as frontier.ts
 * and closure.ts): a probe's DUE-ness and its QUESTION SET are graph-shape
 * decisions, computed here from plain arrays and unit-tested with no
 * database (scripts/test-research-os-probe.ts). Grading a probe ANSWER is
 * deliberately NOT this module's job -- that reuses the exact Check tool
 * call (src/lib/research-os/grounding.ts's gradeExplanation, task item 2's
 * "graded by the existing grounded tutor Check action") from
 * src/app/api/research-os/probe/route.ts, with
 * src/lib/research-os/stages.ts's onProbeCheckResult deciding what the
 * result is worth. The AI never writes the learner's answer here either:
 * a probe question is a plain string built from the node's own title, no
 * model call, matching Locate/Quote's retrieval-only design.
 */
import type { GraphNode, LearnerNodeState } from "./types";

export const MIN_PROBE_QUESTIONS = 3;
export const MAX_PROBE_QUESTIONS = 5;

/**
 * A probe is due when the learner has NO state record on any of the
 * target's ancestors (review step 5's cold-start case). `ancestorIds`
 * empty (the target is itself a prerequisite root) means there is nothing
 * to probe, so this returns false rather than probing zero nodes.
 */
export function probeDue(ancestorIds: Set<string> | string[], states: LearnerNodeState[]): boolean {
  const ids = ancestorIds instanceof Set ? ancestorIds : new Set(ancestorIds);
  if (ids.size === 0) return false;
  return !states.some((s) => ids.has(s.nodeId));
}

/**
 * Picks 3-5 of `nodes` (filtered to `ancestorIds`) at rising tiers: sorted
 * ascending by tier, then spread evenly across that sorted list from
 * lowest to highest tier rather than always taking the lowest few, so a
 * small ancestor set with a wide tier range gets sampled across the whole
 * range instead of clustering at the easy end. Fewer than
 * MIN_PROBE_QUESTIONS candidates returns every candidate (never pads with
 * a repeat or an out-of-scope node).
 */
export function selectProbeNodes(nodes: GraphNode[], ancestorIds: Set<string> | string[]): GraphNode[] {
  const ids = ancestorIds instanceof Set ? ancestorIds : new Set(ancestorIds);
  const candidates = nodes
    .filter((n) => ids.has(n.id))
    .sort((a, b) => a.tier - b.tier || a.slug.localeCompare(b.slug));

  if (candidates.length <= MAX_PROBE_QUESTIONS) return candidates;

  const picked: GraphNode[] = [];
  const seen = new Set<string>();
  const span = MAX_PROBE_QUESTIONS - 1;
  for (let i = 0; i < MAX_PROBE_QUESTIONS; i++) {
    const idx = Math.round((i * (candidates.length - 1)) / span);
    const node = candidates[idx];
    if (seen.has(node.id)) continue;
    seen.add(node.id);
    picked.push(node);
  }
  return picked;
}

export interface ProbeQuestion {
  nodeId: string;
  nodeSlug: string;
  nodeTitle: string;
  tier: number;
  /** Free-text prompt the learner answers; graded against the node's own summary via Check (grounding.ts), never shown here. */
  prompt: string;
}

/** A plain, retrieval-only prompt -- no model call, no hint from the node's summary (that would give away the answer being probed for). */
export function probeQuestion(node: Pick<GraphNode, "id" | "slug" | "title" | "tier">): ProbeQuestion {
  return {
    nodeId: node.id,
    nodeSlug: node.slug,
    nodeTitle: node.title,
    tier: node.tier,
    prompt: `In your own words, what do you already know about "${node.title}"?`,
  };
}

/** The full probe: probeDue's answer plus (when due) 3-5 questions at rising tiers over the target's ancestors. */
export function buildProbe(
  nodes: GraphNode[],
  ancestorIds: Set<string> | string[],
  states: LearnerNodeState[],
): { due: boolean; questions: ProbeQuestion[] } {
  const due = probeDue(ancestorIds, states);
  if (!due) return { due, questions: [] };
  return { due, questions: selectProbeNodes(nodes, ancestorIds).map(probeQuestion) };
}
