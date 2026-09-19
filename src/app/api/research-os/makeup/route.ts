/**
 * /api/research-os/makeup?slug=, the node page's "made of" section
 * (learning/research-os/PRIMES.md): the node's place in the prime
 * decomposition and the decompose-further work waiting on review for it.
 * Public nodes only, the same set the decomposition runs over. `canReview`
 * tells the page whether to link the reviewer to /research-os/edges.
 */
import { NextRequest, NextResponse } from "next/server";
import { configured, graphService } from "@/lib/research-os/db";
import { verifyReviewer } from "@/lib/research-os/reviewer";
import { buildMakeup, makeupSnapshot, type ProposalRowLite } from "@/lib/research-os/makeup";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
    const [proposals, missing, irreducible, reviewer] = await Promise.all([
      svc
        .from("edge_proposals")
        .select("id,from_slug,verification,refd,cross_branch,in_cycle,confidence_source")
        .eq("to_slug", slug)
        .eq("status", "pending")
        .order("id")
        .range(0, 199),
      svc.from("node_proposals").select("key,title,summary,reasons").eq("status", "pending").contains("named_by", [slug]).order("key").range(0, 99),
      svc.from("irreducible_proposals").select("status,justification").eq("node_slug", slug).maybeSingle(),
      verifyReviewer(req),
    ]);
    for (const r of [proposals, missing, irreducible]) if (r.error) throw new Error(r.error.message);
    const makeup = buildMakeup(node.id, snap, {
      proposals: (proposals.data as ProposalRowLite[]) || [],
      missing: (missing.data as { key: string; title: string; summary: string | null; reasons: Record<string, string> | null }[]) || [],
      irreducible: (irreducible.data as { status: "pending" | "confirmed" | "rejected"; justification: string } | null) ?? null,
    });
    if (!makeup) return NextResponse.json({ error: "node_not_found" }, { status: 404, ...NO_STORE });
    return NextResponse.json({ makeup, canReview: !!reviewer }, NO_STORE);
  } catch (err) {
    console.error("[research-os/makeup] read failed:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "read_failed" }, { status: 500, ...NO_STORE });
  }
}
