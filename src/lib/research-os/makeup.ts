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
import { cyclicPairs } from "./decompose-further";
import { isIdeaNode } from "./idea";
import { contractedFactorEdges, decompose, FACTOR_EDGES, factorMap, penetration, type Decomposition, type DepEdge, type PrimePenetration, type PrimeStatus } from "./primes";

export type MakeupNode = { id: string; slug: string; title: string; branch: string; kind?: string; provenanceType?: string | null };

export type Makeup = {
  status: PrimeStatus;
  /** Layers of combination above the node's primes: 0 for a prime. Distinct from the grade tier on the node. */
  tier: number;
  inCycle: boolean;
  /** Distinct primes under the node. */
  primeCount: number;
  /** The primes under it, the most-reached first, at most `limit`. */
  primes: (MakeupNode & { paths: number })[];
  /** What the node rests on directly, through approved edges. */
  factors: MakeupNode[];
  /** For a prime: how many idea composites contain it, across how many branches. */
  reach: { composites: number; branches: number } | null;
  /** Facts, sources, and other non-idea nodes the idea rests on directly: its evidence, apart from its makeup. */
  evidence: { count: number; items: MakeupNode[] };
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
  /** Set for reviewers: the factor already rests on the node in the graph, or the node already rests on the factor. */
  graphLoop?: boolean;
  implied?: boolean;
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
  /** The decomposition of the idea layer: idea nodes and the factor edges between them. */
  dec: Map<string, Decomposition>;
  /** Every factor edge on the public graph, for loop checks that may pass through evidence. */
  edges: DepEdge[];
  /** Each idea's direct non-idea factors. */
  evidence: Map<string, MakeupNode[]>;
  /** Node id to its direct factors over every public factor edge. */
  factors: Map<string, Map<string, number>>;
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
    evidence: (() => {
      const ev = (snap.evidence.get(nodeId) ?? []).slice().sort((a, b) => a.title.localeCompare(b.title));
      return { count: ev.length, items: ev.slice(0, 6) };
    })(),
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

async function readSnapshot(svc: SupabaseClient): Promise<Snapshot> {
  const rows = await paged<MakeupNode>((from) =>
    svc.from("nodes").select("id,slug,title,branch,kind,provenanceType:provenance->>type").eq("visibility", "public").is("superseded_by", null).order("id").range(from, from + 999),
  );
  const edgeRows = await paged<{ from_id: string; to_id: string; kind: string; confidence: number | null }>((from) =>
    svc.from("edges").select("from_id,to_id,kind,confidence").in("kind", Object.keys(FACTOR_EDGES)).order("id").range(from, from + 999),
  );
  return snapshotFrom(
    rows,
    edgeRows.map((e) => ({ fromId: e.from_id, toId: e.to_id, kind: e.kind, confidence: e.confidence })),
  );
}

/**
 * The snapshot from public nodes and factor edges: the idea layer, as the
 * queue decomposes it (decompose-further.ts ideaLayer), with paths through
 * evidence contracted into idea-to-idea edges; each idea's direct non-idea
 * factors as its evidence; and every public factor edge kept for loop
 * checks, which may pass through evidence.
 */
export function snapshotFrom(rows: MakeupNode[], allEdges: DepEdge[]): Snapshot {
  const live = new Set(rows.map((n) => n.id));
  const edges = allEdges.filter((e) => live.has(e.fromId) && live.has(e.toId));
  const ideas = rows.filter((n) => isIdeaNode({ kind: n.kind ?? "", provenanceType: n.provenanceType ?? null }));
  const ideaIds = new Set(ideas.map((n) => n.id));
  const dec = decompose(ideas, contractedFactorEdges(ideaIds, edges));
  const byId = new Map(rows.map((n) => [n.id, n]));
  const evidence = new Map<string, MakeupNode[]>();
  const allFactors = factorMap(edges);
  for (const [nodeId, factors] of Array.from(allFactors.entries())) {
    if (!ideaIds.has(nodeId)) continue;
    const ev = Array.from(factors.keys())
      .filter((f) => !ideaIds.has(f))
      .map((f) => byId.get(f))
      .filter((n): n is MakeupNode => !!n);
    if (ev.length) evidence.set(nodeId, ev);
  }
  return {
    dec,
    edges,
    evidence,
    factors: allFactors,
    byId,
    bySlug: new Map(rows.map((n) => [n.slug, n])),
    reach: new Map(penetration(ideas, dec).map((p) => [p.id, p])),
  };
}

let cached: { at: number; snap: Snapshot } | null = null;
let inflight: { gen: number; promise: Promise<Snapshot> } | null = null;
/** Bumped when an approval changes the graph; a read started before the bump is never stored. */
let generation = 0;

/**
 * The public graph's decomposition, reused for `ttlMs` so node pages stay
 * fast. Requests that arrive while a read is running share it, and a read
 * that an approval overtook is served once and never cached.
 */
export async function makeupSnapshot(svc: SupabaseClient, ttlMs = 60_000, read: (svc: SupabaseClient) => Promise<Snapshot> = readSnapshot): Promise<Snapshot> {
  if (cached && Date.now() - cached.at < ttlMs) return cached.snap;
  if (inflight && inflight.gen === generation) return inflight.promise;
  const started = generation;
  const promise = read(svc)
    .then((snap) => {
      if (generation === started) cached = { at: Date.now(), snap };
      return snap;
    })
    .finally(() => {
      if (inflight?.promise === promise) inflight = null;
    });
  inflight = { gen: started, promise };
  return promise;
}

/**
 * Pending pairs that close a loop with the graph's factor edges and the
 * other pending pairs right now, keyed "factor->target". Computed on read,
 * so a decision elsewhere clears or adds a flag at once.
 */
export function liveCycles(snap: Snapshot, pending: { from_slug: string; to_slug: string }[]): Set<string> {
  const idOf = new Map(Array.from(snap.bySlug.entries()).map(([slug, n]) => [slug, n.id]));
  return cyclicPairs(snap.edges, pending, idOf);
}

/** Every pending proposal pair, paged past PostgREST's 1,000-row cap. */
export async function allPendingPairs(svc: SupabaseClient): Promise<{ from_slug: string; to_slug: string }[]> {
  return paged<{ from_slug: string; to_slug: string }>((from) =>
    svc.from("edge_proposals").select("from_slug,to_slug").eq("status", "pending").order("id").range(from, from + 999),
  );
}

/** Drop the cached decomposition, so the next read sees a just-approved edge. */
export function forgetMakeupSnapshot(): void {
  cached = null;
  generation++;
}

export type PendingCounts = { proposals: number; missing: number; irreducible: boolean; truncated: boolean };

/**
 * What a viewer gets. The decomposition is public; what waits on review is
 * reviewer data, so everyone else gets the counts and only a confirmed
 * irreducible verdict, which is a review outcome.
 */
export function makeupForViewer(makeup: Makeup, pending: PendingCounts, isReviewer: boolean): { makeup: Makeup; pending: PendingCounts; canReview: boolean } {
  if (isReviewer) return { makeup, pending, canReview: true };
  return {
    makeup: { ...makeup, proposals: [], missing: [], irreducible: makeup.irreducible?.status === "confirmed" ? makeup.irreducible : null },
    pending,
    canReview: false,
  };
}

/** True when `nodeId` rests on `factorId` through any chain of public factor edges. */
export function restsOnInGraph(snap: Snapshot, nodeId: string, factorId: string): boolean {
  if (nodeId === factorId) return false;
  const seen = new Set<string>([nodeId]);
  const stack = [nodeId];
  while (stack.length) {
    const id = stack.pop()!;
    for (const f of Array.from(snap.factors.get(id)?.keys() ?? [])) {
      if (f === factorId) return true;
      if (!seen.has(f)) {
        seen.add(f);
        stack.push(f);
      }
    }
  }
  return false;
}

/**
 * How a proposed pair meets the graph as it stands: `graphLoop` when the
 * factor already rests on the target, so approval makes a loop and the
 * review refuses it; `implied` when the target already rests on the factor
 * through other nodes, so approval adds a direct edge to a chain.
 */
export function pairInGraph(snap: Snapshot, factorSlug: string, targetSlug: string): { graphLoop: boolean; implied: boolean } {
  const f = snap.bySlug.get(factorSlug)?.id;
  const t = snap.bySlug.get(targetSlug)?.id;
  if (!f || !t) return { graphLoop: false, implied: false };
  return { graphLoop: restsOnInGraph(snap, f, t), implied: restsOnInGraph(snap, t, f) };
}
