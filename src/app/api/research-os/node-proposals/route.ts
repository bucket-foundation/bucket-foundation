/**
 * /api/research-os/node-proposals, the missing-prime review (ros-prime 2,
 * learning/research-os/PRIMES.md "Slice 2"). Backs graph.node_proposals,
 * queued by scripts/research-os/decompose-further.ts when the model names a
 * base idea the graph lacks while decomposing a node.
 *
 * GET  -> { proposals: [...] }: every pending row, the most-named first, with
 *   the titles of the nodes that named it.
 *
 * POST { id, decision: "approved" | "rejected", reason? }
 *   src/lib/research-os/inference/decide-node.ts decides. "approved" creates
 *   the tier-0 concept node (reusing a node that already has the slug), then
 *   queues a pending prerequisite proposal from it to every naming node for
 *   /research-os/edges. A decided proposal returns alreadyDecided and writes
 *   nothing.
 *
 * Auth and status codes match /api/research-os/edges: the reviewer gate in
 * src/lib/research-os/reviewer.ts, 403 not a reviewer, 400 bad input, 404 not
 * found, 500 a write failed (the proposal stays pending), 503 not configured.
 */
import { NextRequest, NextResponse } from "next/server";
import { chooseBranch, decideNodeProposal, type NodeProposalRecord } from "@/lib/research-os/inference/decide-node";
import { configured, graphService } from "@/lib/research-os/db";
import { verifyReviewer } from "@/lib/research-os/reviewer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function bad(status: number, error: string) {
  return NextResponse.json({ error }, { status });
}

interface Row {
  id: string;
  key: string;
  title: string;
  branch: string;
  justification: string;
  named_by: string[];
  base_match: string | null;
  model: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
}

const COLUMNS = "id,key,title,branch,justification,named_by,base_match,model,status,created_at";

export async function GET(req: NextRequest) {
  if (!configured()) return bad(503, "research_os_unavailable");
  const reviewer = await verifyReviewer(req);
  if (!reviewer) return bad(403, "forbidden");

  const svc = graphService();
  const { data, error } = await svc.from("node_proposals").select(COLUMNS).eq("status", "pending");
  if (error) return bad(500, "read_failed");
  const rows = ((data as Row[]) || []).sort((a, b) => b.named_by.length - a.named_by.length || a.key.localeCompare(b.key));

  const slugs = Array.from(new Set(rows.flatMap((r) => r.named_by)));
  const titleBySlug = new Map<string, string>();
  for (let i = 0; i < slugs.length; i += 200) {
    const { data: nodes } = await svc.from("nodes").select("slug,title").in("slug", slugs.slice(i, i + 200));
    for (const n of (nodes as Array<{ slug: string; title: string }>) || []) titleBySlug.set(n.slug, n.title);
  }

  return NextResponse.json(
    {
      proposals: rows.map((r) => ({
        id: r.id,
        key: r.key,
        title: r.title,
        branch: r.branch,
        justification: r.justification,
        baseMatch: r.base_match,
        model: r.model,
        namedBy: r.named_by.map((slug) => ({ slug, title: titleBySlug.get(slug) ?? slug })),
        createdAt: r.created_at,
      })),
    },
    { headers: { "cache-control": "no-store" } },
  );
}

interface Body {
  id?: string;
  decision?: "approved" | "rejected";
  reason?: string;
}

export async function POST(req: NextRequest) {
  if (!configured()) return bad(503, "research_os_unavailable");
  const reviewer = await verifyReviewer(req);
  if (!reviewer) return bad(403, "forbidden");

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return bad(400, "bad_request");
  }
  const id = (body.id || "").trim();
  if (!id) return bad(400, "id is required");
  if (body.decision !== "approved" && body.decision !== "rejected") return bad(400, "decision must be approved or rejected");
  const reason = (body.reason || "").trim() || null;

  const svc = graphService();
  const { data: row, error: readErr } = await svc.from("node_proposals").select(COLUMNS).eq("id", id).maybeSingle();
  if (readErr) return bad(500, "read_failed");
  if (!row) return bad(404, "proposal_not_found");
  const r = row as Row;

  const { data: targetRows, error: targetErr } = await svc.from("nodes").select("slug,branch").in("slug", r.named_by);
  if (targetErr) return bad(500, "read_failed");
  const branchOf = new Map<string, string | null>(((targetRows as Array<{ slug: string; branch: string }>) || []).map((t) => [t.slug, t.branch]));
  const { data: branchRows, error: branchErr } = await svc.from("nodes").select("branch").eq("branch", r.branch).limit(1);
  if (branchErr) return bad(500, "read_failed");
  const known = new Set<string>(((branchRows as Array<{ branch: string }>) || []).map((b) => b.branch));
  const branch = chooseBranch(r.branch, known, r.named_by.map((s) => branchOf.get(s) ?? null));

  const record: NodeProposalRecord = {
    status: r.status,
    key: r.key,
    title: r.title,
    branch: r.branch,
    justification: r.justification,
    // Only nodes that still exist get a proposal from the new base idea.
    namedBy: r.named_by.filter((s) => branchOf.has(s)),
    baseMatch: r.base_match,
    model: r.model,
  };
  const outcome = decideNodeProposal(record, body.decision, { proposalId: r.id, branch, branchOf });
  if (outcome.alreadyDecided) {
    return NextResponse.json({ decision: outcome.status, alreadyDecided: true }, { headers: { "cache-control": "no-store" } });
  }

  let createdNodeId: string | null = null;
  if (outcome.nodeToCreate) {
    const n = outcome.nodeToCreate;
    const { data: existing, error: existErr } = await svc.from("nodes").select("id").eq("slug", n.slug).maybeSingle();
    if (existErr) return bad(500, "read_failed");
    if (existing) {
      createdNodeId = (existing as { id: string }).id;
    } else {
      const { data: inserted, error: insErr } = await svc
        .from("nodes")
        .insert([{ slug: n.slug, title: n.title, kind: n.kind, tier: n.tier, branch: n.branch, summary: n.summary, labels: n.labels, provenance: n.provenance }])
        .select("id")
        .single();
      if (insErr) return bad(500, "node_write_failed");
      createdNodeId = (inserted as { id: string }).id;
    }
    if (outcome.edgeProposals?.length) {
      const { error: epErr } = await svc.from("edge_proposals").upsert(outcome.edgeProposals, { onConflict: "from_slug,to_slug", ignoreDuplicates: true });
      if (epErr) return bad(500, "edge_proposal_write_failed");
    }
  }

  const { error: updErr } = await svc
    .from("node_proposals")
    .update({ status: outcome.status, created_node_id: createdNodeId, reviewer_id: reviewer.id, decision_reason: reason, decided_at: new Date().toISOString() })
    .eq("id", id);
  if (updErr) return bad(500, "decision_write_failed");

  return NextResponse.json(
    { decision: outcome.status, alreadyDecided: false, nodeSlug: outcome.nodeToCreate?.slug ?? null, queuedEdges: outcome.edgeProposals?.length ?? 0 },
    { headers: { "cache-control": "no-store" } },
  );
}
