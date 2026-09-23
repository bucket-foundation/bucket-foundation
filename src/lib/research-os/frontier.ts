import type { GraphNode, GraphEdge, LearnerNodeState, Stage } from "./types";
import { stageAtLeast, edgeConfidence, LOW_CONFIDENCE_THRESHOLD } from "./types";
import type { PrereqAncestorRow } from "./closure";

export { LOW_CONFIDENCE_THRESHOLD };

export interface FrontierStep {
  node: GraphNode;
  stage: Stage;
  hops: number;
  isFrontier: boolean;
  edgeConfidence?: number;
  pathConfidence: number;
}

export interface LowConfidenceFlag {
  edgeId?: string;
  fromNodeId: string;
  toNodeId: string;
  confidence: number;
  confidenceSource?: string | null;
}

export interface FrontierResult {
  target: GraphNode;
  frontier: GraphNode[];
  chain: FrontierStep[];
  gap: GraphNode[];
  lowConfidenceFlags: LowConfidenceFlag[];
}

function pruneToClosure(
  nodes: GraphNode[],
  edges: GraphEdge[],
  targetNodeId: string,
  ancestorRows?: PrereqAncestorRow[],
): { nodes: GraphNode[]; edges: GraphEdge[] } {
  if (!ancestorRows || ancestorRows.length === 0) return { nodes, edges };

  const closureIds = new Set<string>([targetNodeId]);
  for (const row of ancestorRows) {
    if (row.nodeId === targetNodeId) closureIds.add(row.ancestorId);
  }
  if (closureIds.size === 1) return { nodes, edges };

  return {
    nodes: nodes.filter((n) => closureIds.has(n.id)),
    edges: edges.filter((e) => closureIds.has(e.fromId) && closureIds.has(e.toId)),
  };
}

export function computeFrontier(
  nodes: GraphNode[],
  edges: GraphEdge[],
  states: LearnerNodeState[],
  targetNodeId: string,
  ancestorRows?: PrereqAncestorRow[],
): FrontierResult {
  const target = nodes.find((n) => n.id === targetNodeId);
  if (!target) throw new Error(`computeFrontier: target node ${targetNodeId} not found`);

  const { nodes: scopedNodes, edges: scopedEdges } = pruneToClosure(nodes, edges, targetNodeId, ancestorRows);
  const byId = new Map(scopedNodes.map((n) => [n.id, n]));

  const stateByNode = new Map(states.map((s) => [s.nodeId, s.stage]));
  const stageOf = (nodeId: string): Stage => stateByNode.get(nodeId) ?? "access";

  const backward = new Map<string, GraphEdge[]>();
  for (const n of scopedNodes) backward.set(n.id, []);
  for (const e of scopedEdges) {
    if (e.kind !== "prerequisite") continue;
    if (!backward.has(e.toId)) continue;
    backward.get(e.toId)!.push(e);
  }

  const cost = new Map<string, number>([[targetNodeId, 0]]);
  const hops = new Map<string, number>([[targetNodeId, 0]]);
  const parentEdge = new Map<string, GraphEdge>();
  const finalized = new Set<string>();
  const open = new Set<string>([targetNodeId]);
  const frontierIds: string[] = [];

  const preferred = (aCost: number, aHops: number, bCost: number, bHops: number): boolean =>
    aCost < bCost - 1e-9 || (Math.abs(aCost - bCost) <= 1e-9 && aHops < bHops);

  while (open.size > 0) {
    let cur: string | null = null;
    open.forEach((id) => {
      if (cur === null || preferred(cost.get(id)!, hops.get(id)!, cost.get(cur)!, hops.get(cur)!)) cur = id;
    });
    open.delete(cur!);
    finalized.add(cur!);

    const mastered = stageAtLeast(stageOf(cur!), "understanding");
    const prereqEdges = backward.get(cur!) ?? [];
    const isRoot = prereqEdges.length === 0;

    if (mastered || isRoot) {
      frontierIds.push(cur!);
      continue;
    }

    for (const e of prereqEdges) {
      const prev = e.fromId;
      if (finalized.has(prev)) continue;
      const candidateCost = cost.get(cur!)! + -Math.log(edgeConfidence(e));
      const candidateHops = hops.get(cur!)! + 1;
      const knownCost = cost.get(prev);
      if (knownCost === undefined || preferred(candidateCost, candidateHops, knownCost, hops.get(prev)!)) {
        cost.set(prev, candidateCost);
        hops.set(prev, candidateHops);
        parentEdge.set(prev, e);
        open.add(prev);
      }
    }
  }

  const frontierSet = new Set(frontierIds);
  const lowConfidenceFlags: LowConfidenceFlag[] = [];
  const chain: FrontierStep[] = Array.from(finalized)
    .map((id) => {
      const node = byId.get(id)!;
      const edge = parentEdge.get(id);
      const conf = edge ? edgeConfidence(edge) : undefined;
      if (edge && conf! < LOW_CONFIDENCE_THRESHOLD) {
        lowConfidenceFlags.push({
          edgeId: edge.id,
          fromNodeId: edge.fromId,
          toNodeId: edge.toId,
          confidence: conf!,
          confidenceSource: edge.confidenceSource ?? null,
        });
      }
      return {
        node,
        stage: stageOf(id),
        hops: hops.get(id) ?? 0,
        isFrontier: frontierSet.has(id),
        edgeConfidence: conf,
        pathConfidence: Math.exp(-(cost.get(id) ?? 0)),
      };
    })
    .sort((a, b) => b.hops - a.hops || a.node.slug.localeCompare(b.node.slug));

  return {
    target,
    frontier: frontierIds.map((id) => byId.get(id)!),
    chain,
    gap: chain.filter((s) => !s.isFrontier).map((s) => s.node),
    lowConfidenceFlags: lowConfidenceFlags.sort(
      (a, b) => a.fromNodeId.localeCompare(b.fromNodeId) || a.toNodeId.localeCompare(b.toNodeId),
    ),
  };
}
