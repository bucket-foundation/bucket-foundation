/**
 * Research OS for K-12, teacher class view (bkt-ros, ros-06 item 2). Pure
 * functions over plain graph arrays, no I/O, matching frontier.ts's own
 * "dependency-free, unit-testable with synthetic states" convention
 * (scripts/test-research-os-teacher-class.ts). src/app/api/research-os/
 * class/route.ts is the only caller; it loads nodes/edges/states from
 * Postgres and passes them here.
 *
 * Three computations, all against the seed path (the branch's full
 * prerequisite subgraph reachable backward from the class's target node):
 *   - seedPathOrder: the fixed, learner-independent column order for the
 *     class grid.
 *   - buildClassGrid: state per (learner, node) on that path.
 *   - findBlockedLearners: a learner whose next unmastered node on their
 *     own frontier-backward route has sat below Understanding for more
 *     than a set number of days.
 *   - findReadyForHarderTarget: a learner who has not started a node but
 *     already holds every one of its direct prerequisites at
 *     Internalization or above -- a candidate for a harder routing target.
 */
import { computeFrontier } from "./frontier";
import { stageAtLeast } from "./types";
import type { GraphNode, GraphEdge, LearnerNodeState, Stage } from "./types";

/**
 * The seed path in forward order (farthest prerequisite first, target
 * last), independent of any one learner. Reuses computeFrontier with an
 * empty state list: a "fresh" learner (no state) makes the backward walk
 * run all the way to every root, which is exactly the full path, per
 * frontier.ts's own stop rule ("mastered or root" -- with no state, every
 * node reads as 'access', so only roots stop the walk).
 */
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

/** State per (learner, node) over `path`, in `path`'s own column order. A
 * learner with no recorded state on a node reads as stage 'access', no
 * `updatedAt' -- matching every other Phase 0/1 reading of "no record". */
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

/**
 * A learner is "blocked" when the next node on their own frontier-backward
 * route (the farthest-from-target unmastered chain step -- the first entry
 * of `computeFrontier`'s own `gap`, per frontier.ts's documented sort
 * order, "the order a learner walks the path forward") already has a state
 * record whose stage is below Understanding and whose `updatedAt` is more
 * than `staleDaysThreshold` days before `now`. A node the learner has never
 * opened (no record at all) is excluded: there is no timestamp to measure
 * staleness against, so it reads as "not yet started," not "blocked."
 */
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
    if (!next) continue; // nothing left ungapped -- this learner has no next prerequisite
    const stateByNode = new Map(states.map((s) => [s.nodeId, s]));
    const record = stateByNode.get(next.id);
    if (!record?.updatedAt) continue; // never opened; not measurably stale
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

/**
 * A learner is "ready for a harder target" when some node in the branch
 * (not necessarily on the current seed path -- this is a look-ahead) has
 * at least one direct `prerequisite` edge, the learner holds no state
 * record on that node at all (unstarted), and every one of its direct
 * prerequisites reads at Internalization or above for that learner. Roots
 * (no prerequisite edges) never qualify: there is nothing to have "already
 * cleared" that would make them a harder target rather than just the next
 * one.
 */
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
      if (prereqIds.length === 0) continue; // a root is never a "harder target" candidate
      if (stateByNode.has(node.id)) continue; // already started
      const allInternalized = prereqIds.every((id) => stageAtLeast(stateByNode.get(id) ?? "access", "internalization"));
      if (allInternalized) out.push({ learnerId, nodeId: node.id, nodeTitle: node.title });
    }
  }
  return out;
}
