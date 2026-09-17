/**
 * GET /api/research-os/connections -> { held, bridges }
 * The person's cross-branch connections (connections.ts): edges other than
 * prerequisites between understood nodes in different branches, and the
 * bridges one step away. Auth: the site session or a Bearer token.
 */
import { NextRequest, NextResponse } from "next/server";
import { configured, graphService, verifyLearner } from "@/lib/research-os/db";
import { crossBranchConnections, type ConnEdge, type ConnNode } from "@/lib/research-os/connections";
import type { Stage } from "@/lib/research-os/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const NO_STORE = { headers: { "cache-control": "no-store" } };
const bad = (status: number, error: string) => NextResponse.json({ error }, { status, ...NO_STORE });

export async function GET(req: NextRequest) {
  if (!configured()) return bad(503, "research_os_unavailable");
  const learnerId = await verifyLearner(req);
  if (!learnerId) return bad(401, "unauthorized");
  const svc = graphService();
  const { data: stateRows, error: stErr } = await svc
    .from("learner_node_state")
    .select("node_id,stage")
    .eq("learner_id", learnerId)
    .in("stage", ["understanding", "internalization", "production"]);
  if (stErr) return bad(500, "read_failed");
  const states = ((stateRows as { node_id: string; stage: Stage }[]) || []).map((r) => ({ nodeId: r.node_id, stage: r.stage }));
  if (states.length === 0) return NextResponse.json({ held: [], bridges: [] }, NO_STORE);
  const ids = states.map((s) => s.nodeId);
  const [{ data: out }, { data: inn }] = await Promise.all([
    svc.from("edges").select("from_id,to_id,kind").in("from_id", ids).neq("kind", "prerequisite"),
    svc.from("edges").select("from_id,to_id,kind").in("to_id", ids).neq("kind", "prerequisite"),
  ]);
  const edgeRows = [...((out as { from_id: string; to_id: string; kind: string }[]) || []), ...((inn as { from_id: string; to_id: string; kind: string }[]) || [])];
  const edges: ConnEdge[] = edgeRows.map((e) => ({ fromId: e.from_id, toId: e.to_id, kind: e.kind }));
  const nodeIds = Array.from(new Set(edges.flatMap((e) => [e.fromId, e.toId])));
  if (nodeIds.length === 0) return NextResponse.json({ held: [], bridges: [] }, NO_STORE);
  const { data: nodeRows } = await svc.from("nodes").select("id,slug,title,branch,kind").in("id", nodeIds);
  const nodes: ConnNode[] = ((nodeRows as ConnNode[]) || []).map((n) => ({ id: n.id, slug: n.slug, title: n.title, branch: n.branch, kind: n.kind }));
  return NextResponse.json(crossBranchConnections(states, nodes, edges), NO_STORE);
}
