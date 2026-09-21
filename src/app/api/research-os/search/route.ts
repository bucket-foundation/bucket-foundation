/**
 * GET /api/research-os/search?q=<query>&branch=<slug?>&limit=20
 * One search for the whole app: graph nodes the viewer may see, ranked by
 * title, slug, and summary (src/lib/research-os/search.ts), each with the
 * viewer's standing when signed in. Signed out, public nodes only.
 *
 * Who may see a row is read-access.ts's decision (ros-ai-access). This
 * route used to filter on public-or-owner and never load a grant, so a
 * node shared with a learner was invisible to them and an expired grant
 * was indistinguishable from a live one. An access-store failure answers
 * 503 rather than an empty result, and a signed-in viewer's standing is
 * read after consent.
 */
import { NextRequest, NextResponse } from "next/server";
import { configured, graphService, verifyLearner } from "@/lib/research-os/db";
import { authorizeNodes, readVisibility, storeWithNodes } from "@/lib/research-os/read-access";
import { requireConsent } from "@/lib/research-os/consent";
import type { NodeAccess } from "@/lib/research-os/access";
import { rankNodes, tokenize, type SearchNode } from "@/lib/research-os/search";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const NO_STORE = { headers: { "cache-control": "no-store" } };
const bad = (status: number, error: string) => NextResponse.json({ error }, { status, ...NO_STORE });

export async function GET(req: NextRequest) {
  if (!configured()) return bad(503, "research_os_unavailable");
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim().slice(0, 120);
  const branch = (searchParams.get("branch") || "").trim();
  const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit") || 20)));
  if (!q || tokenize(q).length === 0) return NextResponse.json({ q, results: [] }, NO_STORE);
  const viewerId = req.headers.get("authorization") || req.cookies.getAll().length ? await verifyLearner(req) : null;
  const svc = graphService();
  const tokens = tokenize(q);
  const pattern = `%${tokens[0].replace(/[%_]/g, "")}%`;
  let query = svc
    .from("nodes")
    .select("id,slug,title,kind,tier,branch,summary,visibility,owner_id")
    .or(`title.ilike.${pattern},slug.ilike.${pattern},summary.ilike.${pattern}`)
    .limit(400);
  if (branch) query = query.eq("branch", branch);
  const { data, error } = await query;
  if (error) return bad(500, "search_failed");
  const candidates = (data as { id: string; slug: string; title: string; kind: string; tier: number; branch: string; summary: string | null; visibility: string | null; owner_id: string | null }[]) || [];

  // The rows this query already read carry visibility and owner, so the
  // adapter judges them without reading the nodes again; it loads grants
  // and the viewer's classes only when a candidate is not public.
  const access: NodeAccess[] = candidates.map((n) => ({
    id: n.id,
    visibility: readVisibility(n.visibility),
    ownerId: n.owner_id ?? null,
  }));
  const decision = await authorizeNodes(
    candidates.map((n) => n.id),
    { id: viewerId },
    "view",
    storeWithNodes(access),
  );
  if (!decision.ok) return bad(503, "access_unavailable");
  const visible = new Set(decision.allowed);
  const rows = candidates.filter((n) => visible.has(n.id));
  const nodes: SearchNode[] = rows.map((n) => ({ id: n.id, slug: n.slug, title: n.title, kind: n.kind, tier: n.tier, branch: n.branch, summary: n.summary, visibility: n.visibility, ownerId: n.owner_id }));
  const ranked = rankNodes(nodes, q, limit);
  // Personal standing is personal data: a signed-in viewer reads it after
  // consent, and a viewer without consent still gets the search. The
  // response says when standing was withheld, so an empty map cannot be
  // read as "nothing recorded" (Bucket critic C4).
  let standing: Record<string, string> = {};
  const consent = viewerId ? await requireConsent(viewerId, "search_standing") : null;
  const standingWithheld = Boolean(viewerId) && consent !== null && !consent.allowed;
  if (viewerId && consent?.allowed && ranked.length) {
    const { data: st } = await svc.from("learner_node_state").select("node_id,stage").eq("learner_id", viewerId).in("node_id", ranked.map((r) => r.id));
    standing = Object.fromEntries(((st as { node_id: string; stage: string }[]) || []).map((r) => [r.node_id, r.stage]));
  }
  return NextResponse.json(
    {
      q,
      results: ranked.map((r) => ({ id: r.id, slug: r.slug, title: r.title, kind: r.kind, tier: r.tier, branch: r.branch, summary: r.summary ? r.summary.slice(0, 160) : null, stage: standing[r.id] ?? null })),
      ...(standingWithheld ? { standingWithheld: true, standingReason: consent?.reason ?? "consent_required" } : {}),
    },
    NO_STORE
  );
}
