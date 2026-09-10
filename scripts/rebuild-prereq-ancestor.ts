/**
 * Research OS for K-12, prereq_ancestor closure table rebuild (bkt-ros,
 * Phase 1 item 1: "migration plus a maintenance function or script that
 * rebuilds it from edges"). Loads every node and prerequisite edge for one
 * branch, computes the full backward closure with
 * src/lib/research-os/closure.ts's computeAncestorClosure, and replaces
 * every graph.prereq_ancestor row for that branch's nodes with the freshly
 * computed set.
 *
 * REBUILD MODEL: delete-and-reinsert per branch, matching
 * scripts/seed-research-os.mjs's idempotent edge-write pattern and
 * supabase/migrations/20260910010000_research_os_prereq_ancestor.sql's own
 * documented model. graph.edges stays authoritative; this table is a
 * derived cache, safe to drop and rebuild at any time. An incrementally
 * refreshed worker is Phase 2+ work per the review's gap analysis row
 * "Prerequisite ancestor closure table."
 *
 * Requires the same server-only env vars as scripts/seed-research-os.mjs:
 *   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
 *
 * Run:
 *   npx ts-node --compiler-options '{"module":"commonjs"}' scripts/rebuild-prereq-ancestor.ts [branch]
 *   (branch defaults to "02-physics", the only seeded branch in Phase 0)
 */
import { createClient } from "@supabase/supabase-js";
import { computeAncestorClosure } from "../src/lib/research-os/closure";
import type { GraphNode, GraphEdge } from "../src/lib/research-os/types";

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

async function main(): Promise<void> {
  const branch = process.argv[2] || "02-physics";

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.error("[rebuild-prereq-ancestor] SUPABASE env not set (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY). Nothing written.");
    process.exit(1);
  }
  const svc = createClient(url, serviceKey, { db: { schema: "graph" }, auth: { persistSession: false } });

  const { data: nodeRows, error: nodeErr } = await svc.from("nodes").select("id,slug").eq("branch", branch);
  if (nodeErr) throw new Error(`node query failed: ${nodeErr.message}`);
  const nodes: GraphNode[] = ((nodeRows as NodeRow[]) || []).map((r) => ({
    id: r.id,
    slug: r.slug,
    title: "",
    kind: "fact",
    tier: 0,
    branch,
    summary: null,
  }));
  if (nodes.length === 0) {
    console.log(`[rebuild-prereq-ancestor] no nodes for branch "${branch}", nothing to do.`);
    return;
  }
  const nodeIds = nodes.map((n) => n.id);

  const { data: edgeRows, error: edgeErr } = await svc
    .from("edges")
    .select("from_id,to_id,kind,confidence")
    .in("from_id", nodeIds)
    .eq("kind", "prerequisite");
  if (edgeErr) throw new Error(`edge query failed: ${edgeErr.message}`);
  const edges: GraphEdge[] = ((edgeRows as EdgeRow[]) || []).map((r) => ({
    fromId: r.from_id,
    toId: r.to_id,
    kind: r.kind as GraphEdge["kind"],
    confidence: r.confidence,
  }));

  const closure = computeAncestorClosure(nodes, edges);
  console.log(`[rebuild-prereq-ancestor] branch "${branch}": ${nodes.length} nodes, ${edges.length} prerequisite edges, ${closure.length} closure rows.`);

  // Idempotent: delete every existing row for this branch's nodes, then
  // reinsert the freshly computed set. Cheap at Phase 0/1 graph sizes.
  const { error: delErr } = await svc.from("prereq_ancestor").delete().in("node_id", nodeIds);
  if (delErr) throw new Error(`delete failed: ${delErr.message}`);

  if (closure.length === 0) {
    console.log("[rebuild-prereq-ancestor] closure is empty (every node is a root); table left empty for this branch.");
    return;
  }

  const rows = closure.map((r) => ({
    node_id: r.nodeId,
    ancestor_id: r.ancestorId,
    min_hops: r.minHops,
    min_confidence: r.minConfidence,
  }));
  const { error: insErr } = await svc.from("prereq_ancestor").insert(rows);
  if (insErr) throw new Error(`insert failed: ${insErr.message}`);

  console.log(`[rebuild-prereq-ancestor] wrote ${rows.length} rows to graph.prereq_ancestor.`);
}

main().catch((err) => {
  console.error("[rebuild-prereq-ancestor] FAILED:", err.message);
  process.exit(1);
});
