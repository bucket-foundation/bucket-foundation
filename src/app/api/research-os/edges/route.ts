/**
 * /api/research-os/edges, the LLM-proposed edge review queue (bkt-ros
 * ros-13, task item 3). Backs graph.edge_proposals
 * (supabase/migrations/20260910050001_research_os_edge_proposals.sql),
 * queued by scripts/research-os/ingest/infer-edges-llm.ts (task item 1)
 * and decided here by a signed-in reviewer.
 *
 * GET  -> { proposals: [...] }, every row still `status = 'pending'`,
 *   oldest first, with each node's own title looked up for display.
 *
 * POST { id, decision: "approved" | "rejected", reason? }
 *   -> src/lib/research-os/inference/decide.ts's `decideEdgeProposal` is
 *   the sole decision logic; this route only persists whatever it
 *   returns. "approved" upserts a `prerequisite` edge into graph.edges at
 *   confidence 0.95, confidence_source 'teacher' (onConflict
 *   "from_id,to_id,kind", ignoreDuplicates -- the same unique index
 *   src/lib/research-os/db.ts's writeEngineEdges already relies on), then
 *   best-effort rebuilds graph.prereq_ancestor for the proposal's own
 *   branch (task item 4, src/lib/research-os/rebuild-ancestor.ts's
 *   `rebuildPrereqAncestorForBranch`) -- a rebuild failure is logged and
 *   never fails this response, the same best-effort posture
 *   src/lib/research-os/db.ts's `writeEdgeFlags` already documents for
 *   graph.edge_flags. "rejected" writes no edge at all.
 *
 *   Idempotent (task item 3): a proposal whose `status` is already
 *   "approved" or "rejected" is returned as `alreadyDecided: true` with no
 *   further write, an edge is never inserted twice and a decision is
 *   never overwritten by a second call.
 *
 * Auth: Authorization: Bearer <supabase access token>, verified against
 * src/lib/research-os/reviewer.ts's RESEARCH_OS_REVIEWER_EMAILS allowlist,
 * the exact gate /api/research-os/review already uses. 403 not a reviewer
 * (also covers an unset/empty allowlist, fail closed) · 400 bad input ·
 * 404 proposal or node not found · 500 the edge write itself failed
 * (the proposal stays "pending" for a retry) · 503 not configured.
 */
import { NextRequest, NextResponse } from "next/server";
import { decideEdgeProposal, type EdgeProposalRecord } from "@/lib/research-os/inference/decide";
import { configured, graphService, findNodeBySlug } from "@/lib/research-os/db";
import { verifyReviewer } from "@/lib/research-os/reviewer";
import { rebuildPrereqAncestorForBranch } from "@/lib/research-os/rebuild-ancestor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function bad(status: number, error: string) {
  return NextResponse.json({ error }, { status });
}

interface ProposalRow {
  id: string;
  from_slug: string;
  to_slug: string;
  branch: string;
  confidence: number;
  confidence_source: string;
  agreement: boolean;
  justification: string;
  secondary_justification: string | null;
  model: string;
  prompt_hash: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
}

export async function GET(req: NextRequest) {
  if (!configured()) return bad(503, "research_os_unavailable");
  const reviewer = await verifyReviewer(req);
  if (!reviewer) return bad(403, "forbidden");

  const svc = graphService();
  const { data: rows, error } = await svc
    .from("edge_proposals")
    .select("id,from_slug,to_slug,branch,confidence,confidence_source,agreement,justification,secondary_justification,model,prompt_hash,status,created_at")
    .eq("status", "pending")
    .order("created_at", { ascending: true });
  if (error) return bad(500, "read_failed");

  const proposals = (rows as ProposalRow[]) || [];
  const slugs = Array.from(new Set(proposals.flatMap((p) => [p.from_slug, p.to_slug])));
  let titleBySlug = new Map<string, string>();
  if (slugs.length) {
    const { data: nodes } = await svc.from("nodes").select("slug,title").in("slug", slugs);
    titleBySlug = new Map(((nodes as Array<{ slug: string; title: string }>) || []).map((n) => [n.slug, n.title]));
  }

  return NextResponse.json(
    {
      proposals: proposals.map((p) => ({
        id: p.id,
        fromSlug: p.from_slug,
        fromTitle: titleBySlug.get(p.from_slug) ?? p.from_slug,
        toSlug: p.to_slug,
        toTitle: titleBySlug.get(p.to_slug) ?? p.to_slug,
        branch: p.branch,
        confidence: p.confidence,
        confidenceSource: p.confidence_source,
        agreement: p.agreement,
        justification: p.justification,
        secondaryJustification: p.secondary_justification,
        model: p.model,
        promptHash: p.prompt_hash,
        createdAt: p.created_at,
      })),
    },
    { headers: { "cache-control": "no-store" } },
  );
}

interface EdgeReviewBody {
  id?: string;
  decision?: "approved" | "rejected";
  reason?: string;
}

export async function POST(req: NextRequest) {
  if (!configured()) return bad(503, "research_os_unavailable");
  const reviewer = await verifyReviewer(req);
  if (!reviewer) return bad(403, "forbidden");

  let body: EdgeReviewBody;
  try {
    body = (await req.json()) as EdgeReviewBody;
  } catch {
    return bad(400, "bad_request");
  }
  const id = (body.id || "").trim();
  if (!id) return bad(400, "id is required");
  if (body.decision !== "approved" && body.decision !== "rejected") return bad(400, "decision must be approved or rejected");
  const reason = (body.reason || "").trim() || null;

  const svc = graphService();
  const { data: row, error: readErr } = await svc
    .from("edge_proposals")
    .select("id,from_slug,to_slug,branch,status")
    .eq("id", id)
    .maybeSingle();
  if (readErr) return bad(500, "read_failed");
  if (!row) return bad(404, "proposal_not_found");

  const record: EdgeProposalRecord = { status: row.status, fromSlug: row.from_slug, toSlug: row.to_slug };
  const outcome = decideEdgeProposal(record, body.decision);

  if (outcome.alreadyDecided) {
    return NextResponse.json({ decision: outcome.status, alreadyDecided: true }, { headers: { "cache-control": "no-store" } });
  }

  if (outcome.edgeToWrite) {
    const [fromNode, toNode] = await Promise.all([findNodeBySlug(outcome.edgeToWrite.fromSlug), findNodeBySlug(outcome.edgeToWrite.toSlug)]);
    if (!fromNode || !toNode) return bad(404, "node_not_found");

    const { error: edgeErr } = await svc.from("edges").upsert(
      [
        {
          from_id: fromNode.id,
          to_id: toNode.id,
          kind: outcome.edgeToWrite.kind,
          confidence: outcome.edgeToWrite.confidence,
          confidence_source: outcome.edgeToWrite.confidenceSource,
        },
      ],
      { onConflict: "from_id,to_id,kind", ignoreDuplicates: true },
    );
    if (edgeErr) return bad(500, "edge_write_failed");

    // Task item 4: "mark prereq_ancestor stale and call the existing
    // rebuild function." Best-effort: a rebuild failure never fails this
    // response, matching db.ts's own writeEdgeFlags posture -- the edge
    // itself is already live in graph.edges either way, and the closure
    // table is a derived cache safe to rebuild again later (a later
    // approve on the same branch, or a manual
    // `npm run rebuild:research-os-ancestors` run, both fix a missed one).
    try {
      await rebuildPrereqAncestorForBranch(svc, row.branch);
    } catch (err) {
      console.error("[research-os/edges] prereq_ancestor rebuild failed (non-fatal):", (err as Error).message);
    }
  }

  const { error: updateErr } = await svc
    .from("edge_proposals")
    .update({ status: outcome.status, reviewer_id: reviewer.id, decision_reason: reason, decided_at: new Date().toISOString() })
    .eq("id", id);
  if (updateErr) return bad(500, "decision_write_failed");

  return NextResponse.json({ decision: outcome.status, alreadyDecided: false }, { headers: { "cache-control": "no-store" } });
}
