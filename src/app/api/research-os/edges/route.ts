/**
 * /api/research-os/edges, the LLM-proposed edge review queue (bkt-ros
 * ros-13, task item 3). Backs graph.edge_proposals
 * (supabase/migrations/20260910050001_research_os_edge_proposals.sql),
 * queued by scripts/research-os/ingest/infer-edges-llm.ts (task item 1)
 * and decided here by a signed-in reviewer.
 *
 * GET  -> { proposals: [...] }, every row still `status = 'pending'`,
 *   the most at stake first: impact (nodes resting on the target, set by
 *   scripts/research-os/decompose-further.ts), then oldest, with each
 *   node's own title looked up for display. `?source=prime_decompose_llm`
 *   or `?source=inferred_llm` narrows the list to one proposer.
 *
 * POST { id, decision: "approved" | "rejected", reason? }
 *   -> src/lib/research-os/inference/decide.ts's `decideEdgeProposal` is
 *   the sole decision logic; this route only persists whatever it
 *   returns. "approved" upserts a `prerequisite` edge into graph.edges at
 *   confidence 0.95, confidence_source 'teacher' (onConflict
 *   "from_id,to_id,kind", ignoreDuplicates -- the same unique index
 *   src/lib/research-os/db.ts's writeEngineEdges already relies on) with
 *   provenance naming the proposal, its proposer, and its model, then
 *   best-effort rebuilds graph.prereq_ancestor for the proposal's own
 *   branch and for every branch holding a node that rests on the target
 *   (task item 4, src/lib/research-os/rebuild-ancestor.ts's
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
 * 404 proposal or node not found · 409 approving would close a
 * prerequisite cycle (the proposal stays pending) · 500 the edge write itself failed
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
  impact: number;
  cross_branch: boolean;
}

const SOURCES = new Set(["inferred_llm", "prime_decompose_llm"]);

export async function GET(req: NextRequest) {
  if (!configured()) return bad(503, "research_os_unavailable");
  const reviewer = await verifyReviewer(req);
  if (!reviewer) return bad(403, "forbidden");

  const source = req.nextUrl.searchParams.get("source");
  if (source && !SOURCES.has(source)) return bad(400, "unknown source");

  const svc = graphService();
  const proposals: ProposalRow[] = [];
  for (let from = 0; ; from += 1000) {
    let q = svc
      .from("edge_proposals")
      .select("id,from_slug,to_slug,branch,confidence,confidence_source,agreement,justification,secondary_justification,model,prompt_hash,status,created_at,impact,cross_branch")
      .eq("status", "pending");
    if (source) q = q.eq("confidence_source", source);
    const { data: rows, error } = await q
      .order("impact", { ascending: false })
      .order("created_at", { ascending: true })
      .range(from, from + 999);
    if (error) return bad(500, "read_failed");
    const page = (rows as ProposalRow[]) || [];
    proposals.push(...page);
    if (page.length < 1000) break;
  }

  const slugs = Array.from(new Set(proposals.flatMap((p) => [p.from_slug, p.to_slug])));
  const titleBySlug = new Map<string, string>();
  const branchBySlug = new Map<string, string>();
  for (let i = 0; i < slugs.length; i += 200) {
    const { data: nodes } = await svc.from("nodes").select("slug,title,branch").in("slug", slugs.slice(i, i + 200));
    for (const n of (nodes as Array<{ slug: string; title: string; branch: string }>) || []) {
      titleBySlug.set(n.slug, n.title);
      branchBySlug.set(n.slug, n.branch);
    }
  }

  return NextResponse.json(
    {
      proposals: proposals.map((p) => ({
        id: p.id,
        fromSlug: p.from_slug,
        fromTitle: titleBySlug.get(p.from_slug) ?? p.from_slug,
        fromBranch: branchBySlug.get(p.from_slug) ?? null,
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
        impact: p.impact,
        crossBranch: p.cross_branch,
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
    .select("id,from_slug,to_slug,branch,status,confidence_source,model")
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

    // A factor that already rests on its target would close a prerequisite
    // cycle. Refuse, and leave the proposal pending for a reject.
    const { data: loop, error: loopErr } = await svc
      .from("prereq_ancestor")
      .select("node_id")
      .eq("node_id", fromNode.id)
      .eq("ancestor_id", toNode.id)
      .limit(1);
    if (loopErr) return bad(500, "read_failed");
    if (fromNode.id === toNode.id || ((loop as unknown[]) || []).length > 0) return bad(409, "would_close_cycle");

    const { error: edgeErr } = await svc.from("edges").upsert(
      [
        {
          from_id: fromNode.id,
          to_id: toNode.id,
          kind: outcome.edgeToWrite.kind,
          confidence: outcome.edgeToWrite.confidence,
          confidence_source: outcome.edgeToWrite.confidenceSource,
          provenance: { type: "edge_proposal", proposal_id: row.id, proposed_by: row.confidence_source, model: row.model, reviewer_id: reviewer.id },
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
    // The new factor's ancestors reach every node that rests on the target,
    // in any branch, so each of those branches rebuilds too.
    const branches = new Set<string>([row.branch]);
    try {
      const { data: dependents } = await svc.from("prereq_ancestor").select("node_id").eq("ancestor_id", toNode.id).limit(5000);
      const ids = ((dependents as Array<{ node_id: string }>) || []).map((d) => d.node_id);
      for (let i = 0; i < ids.length; i += 200) {
        const { data: nodes } = await svc.from("nodes").select("branch").in("id", ids.slice(i, i + 200));
        for (const n of (nodes as Array<{ branch: string }>) || []) branches.add(n.branch);
      }
    } catch (err) {
      console.error("[research-os/edges] dependent lookup failed (non-fatal):", (err as Error).message);
    }
    for (const b of Array.from(branches)) {
      try {
        await rebuildPrereqAncestorForBranch(svc, b);
      } catch (err) {
        console.error(`[research-os/edges] prereq_ancestor rebuild failed for ${b} (non-fatal):`, (err as Error).message);
      }
    }
  }

  const { error: updateErr } = await svc
    .from("edge_proposals")
    .update({ status: outcome.status, reviewer_id: reviewer.id, decision_reason: reason, decided_at: new Date().toISOString() })
    .eq("id", id);
  if (updateErr) return bad(500, "decision_write_failed");

  return NextResponse.json({ decision: outcome.status, alreadyDecided: false }, { headers: { "cache-control": "no-store" } });
}
