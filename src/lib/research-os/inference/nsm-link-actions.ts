import type { SupabaseClient } from "@supabase/supabase-js";
import { inChunks } from "../paging";
import { RATIONALE_MAX } from "../nsm-links";

export type ActionResult = { status: number; body: Record<string, unknown> };
const ok = (body: Record<string, unknown>): ActionResult => ({ status: 200, body });
const fail = (status: number, error: string): ActionResult => ({ status, body: { error } });

export const QUEUE_LIMIT = 200;

type LinkRow = { id: string; node_id: string; prime_id: string; status: string };
type NodeRow = { id: string; slug: string | null; title: string | null; branch: string | null; summary: string | null; superseded_by: string | null };
type PrimeRow = { id: string; label: string; category: string; english: string[] | null; sense: string | null };

export interface NsmLinkItem {
  id: string;
  node: { slug: string | null; title: string; branch: string | null; summary: string | null };
  prime: { id: string; label: string; category: string; english: string[]; sense: string | null };
}

export async function listNsmLinkProposals(svc: SupabaseClient): Promise<ActionResult> {
  const { data, error } = await svc
    .from("nsm_links")
    .select("id,node_id,prime_id,status")
    .eq("status", "proposed")
    .order("id", { ascending: true })
    .range(0, QUEUE_LIMIT - 1);
  if (error) return fail(500, "read_failed");
  const rows = (data ?? []) as LinkRow[];
  const nodeIds = Array.from(new Set(rows.map((r) => r.node_id)));
  const primeIds = Array.from(new Set(rows.map((r) => r.prime_id)));
  type Page<T> = Promise<{ data: T[] | null; error: { message: string } | null }>;
  let nodeRows: NodeRow[];
  let primeRows: PrimeRow[];
  try {
    nodeRows = await inChunks<NodeRow>(nodeIds, (chunk, page) =>
      svc.from("nodes").select("id,slug,title,branch,summary,superseded_by").in("id", chunk).order("id").range(page.from, page.to) as unknown as Page<NodeRow>,
    );
    primeRows = await inChunks<PrimeRow>(primeIds, (chunk, page) =>
      svc.from("nsm_primes").select("id,label,category,english,sense").in("id", chunk).order("id").range(page.from, page.to) as unknown as Page<PrimeRow>,
    );
  } catch {
    return fail(500, "read_failed");
  }
  const nodes = new Map(nodeRows.map((n) => [n.id, n]));
  const primes = new Map(primeRows.map((p) => [p.id, p]));
  const items: NsmLinkItem[] = [];
  for (const r of rows) {
    const n = nodes.get(r.node_id);
    const p = primes.get(r.prime_id);
    if (!n || !p || n.superseded_by) continue;
    items.push({
      id: r.id,
      node: { slug: n.slug, title: n.title ?? n.slug ?? r.node_id, branch: n.branch, summary: n.summary },
      prime: { id: p.id, label: p.label, category: p.category, english: Array.isArray(p.english) ? p.english : [], sense: p.sense },
    });
  }
  return ok({ proposals: items });
}

export interface NsmLinkDecision {
  id: string;
  decision: "approved" | "rejected";
  reason: string | null;
  reviewerId: string;
}

export async function decideNsmLink(svc: SupabaseClient, input: NsmLinkDecision): Promise<ActionResult> {
  const { data: found, error: fe } = await svc.from("nsm_links").select("id,status").eq("id", input.id).maybeSingle();
  if (fe) return fail(500, "read_failed");
  if (!found) return fail(404, "not_found");
  const row = found as { id: string; status: string };
  if (row.status !== "proposed") return ok({ alreadyDecided: true, decision: row.status });
  const { data: claimed, error: ce } = await svc
    .from("nsm_links")
    .update({ status: input.decision, reviewer_id: input.reviewerId, decision_reason: input.reason ? input.reason.slice(0, RATIONALE_MAX) : null, decided_at: new Date().toISOString() })
    .eq("id", row.id)
    .eq("status", "proposed")
    .select("id");
  if (ce) return fail(500, "write_failed");
  if (!claimed || claimed.length === 0) return ok({ alreadyDecided: true, decision: null });
  return ok({ decision: input.decision });
}
