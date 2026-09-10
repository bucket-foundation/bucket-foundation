/**
 * Research OS <-> hypothesis engine bridge (bkt-ros, engine bridge task item
 * 2): surfaces an engine hypothesis node (`provenance.type ===
 * "engine_hypothesis"`, written by `engine-bridge.ts`'s adapter into the
 * same `graph.nodes`/`graph.edges` tables a K-12 path node lives in) as a
 * candidate "frontier" target for a learner, given their `learner_node_
 * state`. Dependency-free like `frontier.ts`, a pure function over plain
 * arrays, unit-testable with synthetic learner states and no database
 * (scripts/test-research-os-engine-frontier.ts).
 *
 * "Nearest" here reads `PLAN.md` §5's own "frontier targets for routing"
 * against an engine node's own prerequisite set: since task item 1 writes
 * only `cites` and `derives_from` edges for an engine hypothesis, never
 * `prerequisite`, its `derives_from` targets, the canon nodes it builds on,
 * stand in for the prerequisite set frontier-backward routing already walks
 * for a K-12 path node. "Mostly held" is a caller-tunable fraction of those
 * targets at or above a minimum stage (default `understanding`, the same
 * threshold `frontier.ts`'s own `computeFrontier` uses for "mastered"); a
 * node with no `derives_from` edges reads as vacuously eligible, there is
 * nothing it requires the learner to already hold.
 */
import type { GraphNode, GraphEdge, LearnerNodeState, Stage } from "./types";
import { stageAtLeast } from "./types";

export interface EngineFrontierCandidate {
  node: GraphNode;
  prerequisiteNodeIds: string[];
  heldCount: number;
  totalCount: number;
  /** `heldCount / totalCount`, or `1` (vacuously held) when `totalCount` is `0`. */
  heldFraction: number;
}

export interface EngineFrontierOptions {
  /** The fraction of an engine node's `derives_from` targets that must be held
   * for it to count as a candidate. Default `0.5`, "mostly held". */
  minHeldFraction?: number;
  /** Maximum candidates returned. Default `5`. */
  limit?: number;
  /** The stage a prerequisite must be at or above to count as held. Default `"understanding"`. */
  minStage?: Stage;
}

function isEngineHypothesisNode(node: GraphNode): boolean {
  return node.provenance?.type === "engine_hypothesis";
}

/**
 * Every engine hypothesis node in `nodes` whose `derives_from` targets are
 * mostly held by this learner (per `states`), nearest, highest held
 * fraction, first; ties break by slug for a stable, deterministic order.
 */
export function findFrontierEngineTargets(
  nodes: GraphNode[],
  edges: GraphEdge[],
  states: LearnerNodeState[],
  opts: EngineFrontierOptions = {},
): EngineFrontierCandidate[] {
  const minHeldFraction = opts.minHeldFraction ?? 0.5;
  const limit = opts.limit ?? 5;
  const minStage = opts.minStage ?? "understanding";

  const stateByNode = new Map(states.map((s) => [s.nodeId, s.stage]));
  const stageOf = (nodeId: string): Stage => stateByNode.get(nodeId) ?? "access";

  const engineNodes = nodes.filter(isEngineHypothesisNode);
  const candidates: EngineFrontierCandidate[] = [];

  for (const node of engineNodes) {
    const prerequisiteNodeIds = edges.filter((e) => e.kind === "derives_from" && e.fromId === node.id).map((e) => e.toId);
    const totalCount = prerequisiteNodeIds.length;
    const heldCount = prerequisiteNodeIds.filter((id) => stageAtLeast(stageOf(id), minStage)).length;
    const heldFraction = totalCount === 0 ? 1 : heldCount / totalCount;
    if (heldFraction >= minHeldFraction) {
      candidates.push({ node, prerequisiteNodeIds, heldCount, totalCount, heldFraction });
    }
  }

  candidates.sort((a, b) => b.heldFraction - a.heldFraction || a.node.slug.localeCompare(b.node.slug));
  return candidates.slice(0, limit);
}
