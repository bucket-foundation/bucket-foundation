/**
 * ros-graph-dedup: the merge queue a reviewer works on /research-os/merges.
 * scripts/research-os/find-duplicates.ts fills graph.merge_proposals;
 * decideMerge merges a pair through graph.merge_nodes (migration
 * 20260921070000), either way round, or keeps both. Tested with a fake
 * client in scripts/test-research-os-merge-actions.ts.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { rebuildPrereqAncestorForBranch } from "../rebuild-ancestor";
import { forgetMakeupSnapshot } from "../makeup";

export type ActionResult = { status: number; body: Record<string, unknown> };
const ok = (body: Record<string, unknown>): ActionResult => ({ status: 200, body });
const fail = (status: number, error: string): ActionResult => ({ status, body: { error } });

type ProposalRow = {
  id: string;
  keep_slug: string;
  drop_slug: string;
  reason: string;
  similarity: number;
  evidence: string;
  status: "pending" | "merged" | "rejected";
  created_at: string;
};
type NodeRow = { id: string; slug: string; title: string | null; branch: string | null; kind: string; tier: number; superseded_by: string | null };

export interface MergeSide {
  slug: string;
  title: string;
  branch: string | null;
  kind: string;
  tier: number;
  edges: number;
}

async function edgeCount(svc: SupabaseClient, id: string): Promise<number> {
  const [out, inn] = await Promise.all([
    svc.from("edges").select("id", { count: "exact", head: true }).eq("from_id", id),
    svc.from("edges").select("id", { count: "exact", head: true }).eq("to_id", id),
  ]);
  if (out.error || inn.error) throw new Error((out.error ?? inn.error)!.message);
  return (out.count ?? 0) + (inn.count ?? 0);
}

/** Pending pairs with both nodes, oldest first. A pair whose node has since gone is left out. */
export async function listMergeProposals(svc: SupabaseClient): Promise<ActionResult> {
  const { data, error } = await svc
    .from("merge_proposals")
    .select("id,keep_slug,drop_slug,reason,similarity,evidence,status,created_at")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .order("id", { ascending: true })
    .range(0, 199);
  if (error) return fail(500, "read_failed");
  const rows = (data ?? []) as ProposalRow[];
  const slugs = Array.from(new Set(rows.flatMap((r) => [r.keep_slug, r.drop_slug])));
  const nodes = new Map<string, NodeRow>();
  for (let i = 0; i < slugs.length; i += 100) {
    const { data: nd, error: ne } = await svc.from("nodes").select("id,slug,title,branch,kind,tier,superseded_by").in("slug", slugs.slice(i, i + 100)).order("id");
    if (ne) return fail(500, "read_failed");
    for (const n of (nd ?? []) as NodeRow[]) nodes.set(n.slug, n);
  }
  const side = async (n: NodeRow): Promise<MergeSide> => ({ slug: n.slug, title: n.title ?? n.slug, branch: n.branch, kind: n.kind, tier: n.tier, edges: await edgeCount(svc, n.id) });
  const proposals = [];
  try {
    for (const r of rows) {
      const k = nodes.get(r.keep_slug);
      const d = nodes.get(r.drop_slug);
      if (!k || !d || k.superseded_by || d.superseded_by) continue;
      proposals.push({ id: r.id, reason: r.reason, similarity: r.similarity, evidence: r.evidence, keep: await side(k), drop: await side(d) });
    }
  } catch {
    return fail(500, "read_failed");
  }
  return ok({ proposals });
}

export interface MergeDecision {
  id: string;
  decision: "merge" | "merge_swapped" | "reject";
  reason: string | null;
  reviewerId: string;
}

/**
 * Merges the pair, the queued way round or swapped, or keeps both. The
 * proposal is claimed first, so two reviewers cannot both act on it; a
 * failed merge releases the claim. A merge moves edges, so learning order
 * is rebuilt for both nodes' branches; a failed rebuild keeps the merge and
 * warns.
 */
export async function decideMerge(svc: SupabaseClient, input: MergeDecision): Promise<ActionResult> {
  const { data: pd, error: pe } = await svc.from("merge_proposals").select("id,keep_slug,drop_slug,status").eq("id", input.id).maybeSingle();
  if (pe) return fail(500, "read_failed");
  if (!pd) return fail(404, "not_found");
  const p = pd as Pick<ProposalRow, "id" | "keep_slug" | "drop_slug" | "status">;
  if (p.status !== "pending") return ok({ alreadyDecided: true, decision: p.status });

  const decidedAt = new Date().toISOString();
  const status = input.decision === "reject" ? "rejected" : "merged";
  const { data: claimed, error: ce } = await svc
    .from("merge_proposals")
    .update({ status, reviewer_id: input.reviewerId, decision_reason: input.reason, decided_at: decidedAt })
    .eq("id", p.id)
    .eq("status", "pending")
    .select("id");
  if (ce) return fail(500, "write_failed");
  if (!claimed || claimed.length === 0) return ok({ alreadyDecided: true, decision: null });
  if (input.decision === "reject") return ok({ decision: "rejected" });

  const release = async () => {
    const { error } = await svc.from("merge_proposals").update({ status: "pending", reviewer_id: null, decision_reason: null, decided_at: null }).eq("id", p.id);
    return !error;
  };
  const [keepSlug, dropSlug] = input.decision === "merge_swapped" ? [p.drop_slug, p.keep_slug] : [p.keep_slug, p.drop_slug];
  const { data: nd, error: ne } = await svc.from("nodes").select("id,slug,branch,superseded_by").in("slug", [keepSlug, dropSlug]);
  if (ne) return fail(500, (await release()) ? "read_failed" : "read_failed_claim_held");
  const bySlug = new Map(((nd ?? []) as Pick<NodeRow, "id" | "slug" | "branch" | "superseded_by">[]).map((n) => [n.slug, n]));
  const keep = bySlug.get(keepSlug);
  const drop = bySlug.get(dropSlug);
  if (!keep || !drop || keep.superseded_by || drop.superseded_by) return fail(409, (await release()) ? "node_gone" : "node_gone_claim_held");

  const { data: result, error: me } = await svc.rpc("merge_nodes", { p_keep: keep.id, p_drop: drop.id });
  if (me) return fail(500, (await release()) ? "merge_failed" : "merge_failed_claim_held");
  forgetMakeupSnapshot();

  const stale: string[] = [];
  for (const b of Array.from(new Set([keep.branch, drop.branch].filter((x): x is string => Boolean(x))))) {
    try {
      await rebuildPrereqAncestorForBranch(svc, b);
    } catch (err) {
      stale.push(b);
      console.error(`[research-os/merges] prereq_ancestor rebuild failed for ${b}:`, (err as Error).message);
    }
  }
  return ok({
    decision: "merged",
    keep: keepSlug,
    drop: dropSlug,
    moved: result ?? null,
    ...(stale.length ? { warning: `learning order was not rebuilt for ${stale.join(", ")}; run scripts/rebuild-prereq-ancestor.ts --all` } : {}),
  });
}
