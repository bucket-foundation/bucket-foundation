import { computeFrontier } from "./frontier";
import { stageAtLeast } from "./types";
import type { GraphNode, GraphEdge, LearnerNodeState, Stage } from "./types";

export function seedPathOrder(nodes: GraphNode[], edges: GraphEdge[], targetNodeId: string): GraphNode[] {
  const result = computeFrontier(nodes, edges, [], targetNodeId);
  return result.chain.map((step) => step.node);
}

export interface GridCell {
  nodeId: string;
  stage: Stage;
  updatedAt: string | null;
}
export interface GridRow {
  learnerId: string;
  cells: GridCell[];
}
export interface ClassGrid {
  path: GraphNode[];
  rows: GridRow[];
}

export function buildClassGrid(
  path: GraphNode[],
  learnerIds: string[],
  statesByLearner: Map<string, LearnerNodeState[]>,
): ClassGrid {
  const rows: GridRow[] = learnerIds.map((learnerId) => {
    const stateByNode = new Map((statesByLearner.get(learnerId) ?? []).map((s) => [s.nodeId, s]));
    const cells: GridCell[] = path.map((node) => {
      const s = stateByNode.get(node.id);
      return { nodeId: node.id, stage: s?.stage ?? "access", updatedAt: s?.updatedAt ?? null };
    });
    return { learnerId, cells };
  });
  return { path, rows };
}

export interface BlockedLearner {
  learnerId: string;
  nodeId: string;
  nodeTitle: string;
  stage: Stage;
  staleDays: number;
}

export function findBlockedLearners(
  nodes: GraphNode[],
  edges: GraphEdge[],
  targetNodeId: string,
  learnerIds: string[],
  statesByLearner: Map<string, LearnerNodeState[]>,
  now: Date,
  staleDaysThreshold: number,
): BlockedLearner[] {
  const nodeById = new Map(nodes.map((n) => [n.id, n]));
  const out: BlockedLearner[] = [];
  for (const learnerId of learnerIds) {
    const states = statesByLearner.get(learnerId) ?? [];
    const result = computeFrontier(nodes, edges, states, targetNodeId);
    const next = result.gap[0];
    if (!next) continue;
    const stateByNode = new Map(states.map((s) => [s.nodeId, s]));
    const record = stateByNode.get(next.id);
    if (!record?.updatedAt) continue;
    if (stageAtLeast(record.stage, "understanding")) continue;
    const staleMs = now.getTime() - new Date(record.updatedAt).getTime();
    const staleDays = staleMs / (24 * 60 * 60 * 1000);
    if (staleDays > staleDaysThreshold) {
      out.push({
        learnerId,
        nodeId: next.id,
        nodeTitle: nodeById.get(next.id)?.title ?? next.title,
        stage: record.stage,
        staleDays: Math.floor(staleDays),
      });
    }
  }
  return out;
}

export interface ReadyLearner {
  learnerId: string;
  nodeId: string;
  nodeTitle: string;
}

export function findReadyForHarderTarget(
  nodes: GraphNode[],
  edges: GraphEdge[],
  learnerIds: string[],
  statesByLearner: Map<string, LearnerNodeState[]>,
): ReadyLearner[] {
  const prereqsByTarget = new Map<string, string[]>();
  for (const e of edges) {
    if (e.kind !== "prerequisite") continue;
    if (!prereqsByTarget.has(e.toId)) prereqsByTarget.set(e.toId, []);
    prereqsByTarget.get(e.toId)!.push(e.fromId);
  }

  const out: ReadyLearner[] = [];
  for (const learnerId of learnerIds) {
    const stateByNode = new Map((statesByLearner.get(learnerId) ?? []).map((s) => [s.nodeId, s.stage]));
    for (const node of nodes) {
      const prereqIds = prereqsByTarget.get(node.id) ?? [];
      if (prereqIds.length === 0) continue;
      if (stateByNode.has(node.id)) continue;
      const allInternalized = prereqIds.every((id) => stageAtLeast(stateByNode.get(id) ?? "access", "internalization"));
      if (allInternalized) out.push({ learnerId, nodeId: node.id, nodeTitle: node.title });
    }
  }
  return out;
}
