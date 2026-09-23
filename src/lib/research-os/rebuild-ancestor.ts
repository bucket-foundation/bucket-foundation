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
