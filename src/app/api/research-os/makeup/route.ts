/**
 * /api/research-os/makeup?slug=, the node page's "made of" section
 * (learning/research-os/PRIMES.md): the node's place in the prime
 * decomposition and the decompose-further work waiting on review for it.
 * Public nodes only, the same set the decomposition runs over.
 *
 * The decomposition is public. What waits on review is reviewer data, as
 * on /api/research-os/edges: a reviewer gets each proposal with its
 * verdicts, the missing ideas, and any irreducible verdict; everyone else
 * gets the counts. `canReview` tells the page which it has.
 */
import { NextRequest, NextResponse } from "next/server";
import { configured, graphService } from "@/lib/research-os/db";
import { verifyGraphReviewer } from "@/lib/research-os/reviewer";
import { isIdeaNode } from "@/lib/research-os/idea";
import { allPendingPairs, buildMakeup, liveCycles, makeupForViewer, makeupSnapshot, type ProposalRowLite } from "@/lib/research-os/makeup";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Rows read per list; the reply says when a list reached it. */
const PROPOSAL_CAP = 200;
const MISSING_CAP = 100;

const NO_STORE = { headers: { "cache-control": "no-store" } };

export async function GET(req: NextRequest) {
  if (!configured()) return NextResponse.json({ error: "research_os_unavailable" }, { status: 503, ...NO_STORE });
  const slug = (req.nextUrl.searchParams.get("slug") || "").trim();
  if (!slug) return NextResponse.json({ error: "slug is required" }, { status: 400, ...NO_STORE });
  const svc = graphService();
  try {
    const snap = await makeupSnapshot(svc);
    const node = snap.bySlug.get(slug);
    if (!node) return NextResponse.json({ error: "node_not_found" }, { status: 404, ...NO_STORE });
    // Figures, sites, sources, and tags are evidence; only ideas are decomposed.
    if (!isIdeaNode({ kind: node.kind ?? "", provenanceType: node.provenanceType ?? null }))
      return NextResponse.json({ error: "not_an_idea" }, { status: 404, ...NO_STORE });
    const [proposals, missing, irreducible, reviewer] = await Promise.all([
      svc
        .from("edge_proposals")
        .select("id,from_slug,to_slug,verification,refd,cross_branch,in_cycle,confidence_source")
        .eq("to_slug", slug)
        .eq("status", "pending")
        .order("id")
        .range(0, PROPOSAL_CAP - 1),
      svc
        .from("node_proposals")
        .select("key,title,summary,reasons")
        .eq("status", "pending")
        .contains("named_by", [slug])
        .order("key")
        .range(0, MISSING_CAP - 1),
      svc.from("irreducible_proposals").select("status,justification").eq("node_slug", slug).maybeSingle(),
      verifyGraphReviewer(req),
    ]);
    for (const r of [proposals, missing, irreducible]) if (r.error) throw new Error(r.error.message);
    const rows = ((proposals.data as (ProposalRowLite & { to_slug: string })[]) || []).slice();
    // Loop flags from the pending set as it stands, so a decision elsewhere
    // shows at once. Only a reviewer sees the pairs, so only a reviewer pays
    // for the read.
    if (reviewer && rows.length) {
      const loops = liveCycles(snap, await allPendingPairs(svc));
      for (const r of rows) r.in_cycle = loops.has(`${r.from_slug}->${r.to_slug}`);
    }
    const missingRows = (missing.data as { key: string; title: string; summary: string | null; reasons: Record<string, string> | null }[]) || [];
    const irr = (irreducible.data as { status: "pending" | "confirmed" | "rejected"; justification: string } | null) ?? null;
    const makeup = buildMakeup(node.id, snap, { proposals: rows, missing: missingRows, irreducible: irr });
    if (!makeup) return NextResponse.json({ error: "node_not_found" }, { status: 404, ...NO_STORE });
    const pending = {
      proposals: rows.length,
      missing: missingRows.length,
      irreducible: irr?.status === "pending",
      truncated: rows.length === PROPOSAL_CAP || missingRows.length === MISSING_CAP,
    };
    return NextResponse.json(makeupForViewer(makeup, pending, !!reviewer), NO_STORE);
  } catch (err) {
    console.error("[research-os/makeup] read failed:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "read_failed" }, { status: 500, ...NO_STORE });
  }
}
