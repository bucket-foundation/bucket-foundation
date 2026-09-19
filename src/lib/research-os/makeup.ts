/**
 * A node's makeup for the node page's "made of" section
 * (learning/research-os/PRIMES.md): its place in the prime decomposition,
 * the primes under it, what it rests on directly, and the decompose-further
 * work waiting on review for it: proposed factors, missing base ideas named
 * for it, and an irreducible verdict.
 *
 * `buildMakeup` is pure and tested in scripts/test-research-os-makeup.ts.
 * `makeupSnapshot` decomposes the public graph once and keeps the result
 * for a minute, so opening node after node does not re-read the graph.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { decompose, FACTOR_EDGES, penetration, type Decomposition, type DepEdge, type PrimePenetration, type PrimeStatus } from "./primes";

export type MakeupNode = { id: string; slug: string; title: string; branch: string };

export type Makeup = {
  status: PrimeStatus;
  /** Tier by primality: 0 for a prime, one more per layer of combination. */
  tier: number;
  inCycle: boolean;
  /** Distinct primes under the node. */
  primeCount: number;
  /** The primes under it, the most-reached first, at most `limit`. */
  primes: (MakeupNode & { paths: number })[];
  /** What the node rests on directly, through approved edges. */
  factors: MakeupNode[];
  /** For a prime: how many composites contain it, across how many branches. */
  reach: { composites: number; branches: number } | null;
  proposals: MakeupProposal[];
  missing: { key: string; title: string; summary: string | null; reason: string | null }[];
  irreducible: { status: "pending" | "confirmed" | "rejected"; justification: string } | null;
};

export type MakeupProposal = {
  id: string;
  factor: MakeupNode | { slug: string; title: string; branch: string | null; id: null };
  verification: "confirmed" | "refuted" | "unchecked" | null;
  refd: number | null;
  crossBranch: boolean;
  inCycle: boolean;
  source: string;
};

export type ProposalRowLite = {
  id: string;
  from_slug: string;
  verification: MakeupProposal["verification"];
  refd: number | null;
  cross_branch: boolean;
  in_cycle: boolean | null;
  confidence_source: string;
};

export type Snapshot = {
  dec: Map<string, Decomposition>;
  byId: Map<string, MakeupNode>;
  bySlug: Map<string, MakeupNode>;
  reach: Map<string, PrimePenetration>;
};

const VERDICT_ORDER: Record<string, number> = { confirmed: 0, unchecked: 1, refuted: 2 };

export function buildMakeup(
  nodeId: string,
  snap: Snapshot,
  pending: {
    proposals: ProposalRowLite[];
    missing: { key: string; title: string; summary: string | null; reasons: Record<string, string> | null }[];
    irreducible: { status: "pending" | "confirmed" | "rejected"; justification: string } | null;
  },
  limit = 12,
): Makeup | null {
  const d = snap.dec.get(nodeId);
  const self = snap.byId.get(nodeId);
  if (!d || !self) return null;
  const primes = Array.from(d.signature.entries())
    .filter(([id]) => id !== nodeId)
    .map(([id, paths]) => ({ node: snap.byId.get(id), paths }))
    .filter((p): p is { node: MakeupNode; paths: number } => !!p.node)
    .sort((a, b) => b.paths - a.paths || a.node.title.localeCompare(b.node.title))
    .map((p) => ({ ...p.node, paths: p.paths }));
  const factors = d.factors
    .map((f) => snap.byId.get(f.id))
    .filter((n): n is MakeupNode => !!n)
    .sort((a, b) => a.title.localeCompare(b.title));
  const r = d.status === "prime" ? snap.reach.get(nodeId) : undefined;
  const proposals: MakeupProposal[] = pending.proposals
    .map((p) => ({
      id: p.id,
      factor: snap.bySlug.get(p.from_slug) ?? { id: null, slug: p.from_slug, title: p.from_slug, branch: null },
      verification: p.verification,
      refd: p.refd,
      crossBranch: p.cross_branch,
      inCycle: Boolean(p.in_cycle),
      source: p.confidence_source,
    }))
    .sort((a, b) => (VERDICT_ORDER[a.verification ?? "unchecked"] ?? 1) - (VERDICT_ORDER[b.verification ?? "unchecked"] ?? 1) || a.factor.title.localeCompare(b.factor.title));
  return {
    status: d.status,
    tier: d.tier,
    inCycle: d.inCycle,
    primeCount: primes.length,
    primes: primes.slice(0, limit),
    factors,
    reach: r ? { composites: r.composites, branches: r.branches } : null,
    proposals,
    missing: pending.missing
      .map((m) => ({ key: m.key, title: m.title, summary: m.summary, reason: m.reasons?.[self.slug] ?? null }))
      .sort((a, b) => a.title.localeCompare(b.title)),
    irreducible: pending.irreducible,
  };
}

async function paged<T>(q: (from: number) => PromiseLike<{ data: unknown; error: { message: string } | null }>): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await q(from);
    if (error) throw new Error(error.message);
    const page = (data as T[]) || [];
    out.push(...page);
    if (page.length < 1000) return out;
  }
}

let cached: { at: number; snap: Snapshot } | null = null;

/** The public graph's decomposition, reused for `ttlMs` so node pages stay fast. */
export async function makeupSnapshot(svc: SupabaseClient, ttlMs = 60_000): Promise<Snapshot> {
  if (cached && Date.now() - cached.at < ttlMs) return cached.snap;
  const rows = await paged<MakeupNode>((from) =>
    svc.from("nodes").select("id,slug,title,branch").eq("visibility", "public").is("superseded_by", null).order("id").range(from, from + 999),
  );
  const live = new Set(rows.map((n) => n.id));
  const edgeRows = await paged<{ from_id: string; to_id: string; kind: string; confidence: number | null }>((from) =>
    svc.from("edges").select("from_id,to_id,kind,confidence").in("kind", Object.keys(FACTOR_EDGES)).order("id").range(from, from + 999),
  );
  const edges: DepEdge[] = edgeRows
    .filter((e) => live.has(e.from_id) && live.has(e.to_id))
    .map((e) => ({ fromId: e.from_id, toId: e.to_id, kind: e.kind, confidence: e.confidence }));
  const dec = decompose(rows, edges);
  const snap: Snapshot = {
    dec,
    byId: new Map(rows.map((n) => [n.id, n])),
    bySlug: new Map(rows.map((n) => [n.slug, n])),
    reach: new Map(penetration(rows, dec).map((p) => [p.id, p])),
  };
  cached = { at: Date.now(), snap };
  return snap;
}

/** Drop the cached decomposition, so the next read sees a just-approved edge. */
export function forgetMakeupSnapshot(): void {
  cached = null;
}
