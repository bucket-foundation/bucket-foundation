import type { GraphNode, GraphEdge, LearnerNodeState, Stage } from "./types";
import { stageAtLeast } from "./types";

export interface EngineFrontierCandidate {
  node: GraphNode;
  prerequisiteNodeIds: string[];
  heldCount: number;
  totalCount: number;
  heldFraction: number;
}

export interface EngineFrontierOptions {
  minHeldFraction?: number;
  limit?: number;
  minStage?: Stage;
}

function isEngineHypothesisNode(node: GraphNode): boolean {
  return node.provenance?.type === "engine_hypothesis";
}

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
