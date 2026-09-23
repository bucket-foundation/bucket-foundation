import { graphService, verifyLearner } from "@/lib/research-os/db";
import { bad, withResearchOsRoute } from "@/lib/research-os/route";
import { authorizeNodes, readVisibility, storeWithNodes } from "@/lib/research-os/read-access";
import { requireConsent } from "@/lib/research-os/consent";
import type { NodeAccess } from "@/lib/research-os/access";
import { rankNodes, tokenize, type SearchNode } from "@/lib/research-os/search";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withResearchOsRoute({ auth: "none" }, async (req) => {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim().slice(0, 120);
  const branch = (searchParams.get("branch") || "").trim();
  const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit") || 20)));
  if (!q || tokenize(q).length === 0) return { q, results: [] };
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
  let standing: Record<string, string> = {};
  const consent = viewerId ? await requireConsent(viewerId, "search_standing") : null;
  const standingWithheld = Boolean(viewerId) && consent !== null && !consent.allowed;
  if (viewerId && consent?.allowed && ranked.length) {
    const { data: st } = await svc.from("learner_node_state").select("node_id,stage").eq("learner_id", viewerId).in("node_id", ranked.map((r) => r.id));
    standing = Object.fromEntries(((st as { node_id: string; stage: string }[]) || []).map((r) => [r.node_id, r.stage]));
  }
  return {
    q,
    results: ranked.map((r) => ({ id: r.id, slug: r.slug, title: r.title, kind: r.kind, tier: r.tier, branch: r.branch, summary: r.summary ? r.summary.slice(0, 160) : null, stage: standing[r.id] ?? null })),
    ...(standingWithheld ? { standingWithheld: true, standingReason: consent?.reason ?? "consent_required" } : {}),
  };
});
