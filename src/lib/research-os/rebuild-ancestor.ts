/**
 * Research OS for K-12, the prereq_ancestor closure rebuild, factored out
 * of scripts/rebuild-prereq-ancestor.ts (bkt-ros, Phase 1 item 1) so it is
 * an importable function rather than a script that runs on import. Two
 * callers: that script's own `main()` (the manual/cron CLI path), and the
 * /research-os/edges review route's approve action (bkt-ros ros-13, task
 * item 4, "after an approve, mark prereq_ancestor stale and call the
 * existing rebuild function") -- a newly-approved `prerequisite` edge
 * changes the branch's backward closure immediately, and at Phase 0/1
 * graph sizes a full in-process recompute (src/lib/research-os/
 * closure.ts's own header: "O(V*(V+E)) recompute on every rebuild is fine"
 * at tens-to-low-thousands of nodes) is cheap enough to run inline rather
 * than queuing a background job.
 *
 * REBUILD MODEL unchanged from the original script: delete every
 * graph.prereq_ancestor row for the branch's own nodes, then reinsert the
 * freshly computed closure. graph.edges stays authoritative; this table is
 * a derived cache, safe to drop and rebuild at any time.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { computeAncestorClosure } from "./closure";
import type { GraphNode, GraphEdge } from "./types";

interface NodeRow {
  id: string;
  slug: string;
}
interface EdgeRow {
  from_id: string;
  to_id: string;
  kind: string;
  confidence: number | null;
}

export interface RebuildResult {
  branch: string;
  nodeCount: number;
  edgeCount: number;
  closureRowCount: number;
}

/**
 * Marks the branch's own prereq_ancestor rows stale by deleting them, then
 * immediately recomputes and reinserts the full closure from the branch's
 * live `prerequisite` edges. "Stale" is not a stored flag here (Phase 0/1's
 * graph size makes a synchronous rebuild cheap enough that a row is never
 * observably stale for longer than this one function call); the delete-
 * then-reinsert IS the stale-and-rebuild step task item 4 names, matching
 * the original script's own idempotent delete-and-reinsert model.
 *
 * `svc` is a service-role client already bound to the `graph` schema
 * (src/lib/research-os/db.ts's `graphService()`), passed in rather than
 * constructed here so this module stays free of any env-var read of its
 * own -- both callers already have a `graphService()` instance.
 */
const EDGE_PAGE = 1000;

export async function rebuildPrereqAncestorForBranch(svc: SupabaseClient, branch: string): Promise<RebuildResult> {
  const nodeRows: NodeRow[] = [];
  for (let from = 0; ; from += EDGE_PAGE) {
    const { data, error: nodeErr } = await svc.from("nodes").select("id,slug").eq("branch", branch).order("id").range(from, from + EDGE_PAGE - 1);
    if (nodeErr) throw new Error(`node query failed: ${nodeErr.message}`);
    const page = (data as NodeRow[]) || [];
    nodeRows.push(...page);
    if (page.length < EDGE_PAGE) break;
  }
  const nodes: GraphNode[] = nodeRows.map((r) => ({
    id: r.id,
    slug: r.slug,
    title: "",
    kind: "fact",
    tier: 0,
    branch,
    summary: null,
  }));
  if (nodes.length === 0) {
    return { branch, nodeCount: 0, edgeCount: 0, closureRowCount: 0 };
  }
  const nodeIds = nodes.map((n) => n.id);

  // Every prerequisite edge in the graph, paged past PostgREST's 1,000-row
  // cap: a node's ancestors can sit in another branch once a cross-branch
  // factor is approved (learning/research-os/PRIMES.md), so a closure built
  // from the branch's own edges would miss them.
  const edgeRows: EdgeRow[] = [];
  for (let from = 0; ; from += EDGE_PAGE) {
    const { data, error: edgeErr } = await svc
      .from("edges")
      .select("id,from_id,to_id,kind,confidence")
      .eq("kind", "prerequisite")
      .order("id")
      .range(from, from + EDGE_PAGE - 1);
    if (edgeErr) throw new Error(`edge query failed: ${edgeErr.message}`);
    const page = (data as EdgeRow[]) || [];
    edgeRows.push(...page);
    if (page.length < EDGE_PAGE) break;
  }
  const edges: GraphEdge[] = edgeRows.map((r) => ({
    fromId: r.from_id,
    toId: r.to_id,
    kind: r.kind as GraphEdge["kind"],
    confidence: r.confidence,
  }));

  const closure = computeAncestorClosure(nodes, edges);

  // One locked transaction (graph.replace_prereq_ancestor): the branch's rows
  // are never half rebuilt, and two rebuilds of one branch never collide.
  const rows = closure.map((r) => ({
    node_id: r.nodeId,
    ancestor_id: r.ancestorId,
    min_hops: r.minHops,
    min_confidence: r.minConfidence,
  }));
  const { error: rpcErr } = await svc.rpc("replace_prereq_ancestor", { p_branch: branch, p_node_ids: nodeIds, p_rows: rows });
  if (rpcErr) throw new Error(`replace failed: ${rpcErr.message}`);

  return { branch, nodeCount: nodes.length, edgeCount: edges.length, closureRowCount: rows.length };
}
