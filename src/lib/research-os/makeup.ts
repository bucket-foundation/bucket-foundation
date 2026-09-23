import type { SupabaseClient } from "@supabase/supabase-js";
import { cyclicPairs } from "./decompose-further";
import { isIdeaNode } from "./idea";
import { attend, primeBasis, type PrimeBasis } from "./prime-algebra";
import { contractedFactorEdges, decompose, FACTOR_EDGES, factorMap, penetration, type Decomposition, type DepEdge, type PrimePenetration, type PrimeStatus } from "./primes";

export type MakeupNode = { id: string; slug: string; title: string; branch: string; kind?: string; provenanceType?: string | null };

export type Makeup = {
  status: PrimeStatus;
  tier: number;
  inCycle: boolean;
  primeCount: number;
  primes: (MakeupNode & { paths: number })[];
  factors: (MakeupNode & { throughEvidence: boolean })[];
  reach: { composites: number; branches: number } | null;
  evidence: { count: number; items: MakeupNode[] };
  proposals: MakeupProposal[];
  missing: { key: string; title: string; summary: string | null; reason: string | null }[];
  irreducible: { status: "pending" | "confirmed" | "rejected"; justification: string } | null;
  nearest: (MakeupNode & { score: number; shared: MakeupNode[]; sameMakeup: number })[];
};

export type MakeupProposal = {
  id: string;
  factor: MakeupNode | { slug: string; title: string; branch: string | null; id: null };
  verification: "confirmed" | "refuted" | "unchecked" | null;
  refd: number | null;
  crossBranch: boolean;
  inCycle: boolean;
  graphLoop?: boolean;
  implied?: boolean;
  viaPending?: boolean;
  through?: ChainStep[];
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
  edges: DepEdge[];
  evidence: Map<string, MakeupNode[]>;
  factors: Map<string, Map<string, number>>;
  byId: Map<string, MakeupNode>;
  bySlug: Map<string, MakeupNode>;
  reach: Map<string, PrimePenetration>;
  summaries: Map<string, string>;
};

const bases = new WeakMap<Map<string, Decomposition>, PrimeBasis>();

function basisOf(dec: Map<string, Decomposition>): PrimeBasis {
  let b = bases.get(dec);
  if (!b) {
    b = primeBasis(dec);
    bases.set(dec, b);
  }
  return b;
}

export function nearestByMakeup(nodeId: string, snap: Snapshot, k = 8): Makeup["nearest"] {
  const title = (id: string) => snap.byId.get(id)?.title ?? id;
  const depth = (id: string) => snap.dec.get(id)?.depth ?? 0;
  const hits = attend(snap.dec, [nodeId], {
    k: Number.MAX_SAFE_INTEGER,
    basis: basisOf(snap.dec),
    tieBreak: (a, b) => depth(a) - depth(b) || title(a).localeCompare(title(b)) || a.localeCompare(b),
  });
  const groups = new Map<string, Makeup["nearest"][number]>();
  for (const a of hits) {
    const n = snap.byId.get(a.id);
    if (!n) continue;
    const key = Array.from(snap.dec.get(a.id)?.signature.keys() ?? []).sort().join("\u0000");
    const seen = groups.get(key);
    if (seen) {
      seen.sameMakeup++;
      continue;
    }
    if (groups.size >= k) continue;
    const shared = a.sharedPrimes.map((p) => snap.byId.get(p)).filter((x): x is MakeupNode => !!x);
    groups.set(key, { ...n, score: a.score, shared, sameMakeup: 0 });
  }
  return Array.from(groups.values());
}

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
  const direct = snap.factors.get(nodeId);
  const factors = d.factors
    .map((f) => snap.byId.get(f.id))
    .filter((n): n is MakeupNode => !!n)
    .map((n) => ({ ...n, throughEvidence: !direct?.has(n.id) }))
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
    nearest: nearestByMakeup(nodeId, snap),
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
  const rows = await paged<MakeupNode & { summary?: string | null }>((from) =>
    svc.from("nodes").select("id,slug,title,branch,kind,summary,provenanceType:provenance->>type").eq("visibility", "public").is("superseded_by", null).order("id").range(from, from + 999),
  );
  const edgeRows = await paged<{ from_id: string; to_id: string; kind: string; confidence: number | null }>((from) =>
    svc.from("edges").select("from_id,to_id,kind,confidence").in("kind", Object.keys(FACTOR_EDGES)).order("id").range(from, from + 999),
  );
  return snapshotFrom(
    rows,
    edgeRows.map((e) => ({ fromId: e.from_id, toId: e.to_id, kind: e.kind, confidence: e.confidence })),
  );
}

export function snapshotFrom(withSummaries: (MakeupNode & { summary?: string | null })[], allEdges: DepEdge[]): Snapshot {
  const summaries = new Map<string, string>();
  const rows: MakeupNode[] = withSummaries.map(({ summary, ...n }) => {
    if (summary) summaries.set(n.id, summary);
    return n;
  });
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
    summaries,
  };
}

let cached: { at: number; snap: Snapshot } | null = null;
let inflight: { gen: number; promise: Promise<Snapshot> } | null = null;
let generation = 0;

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

export function liveCycles(snap: Snapshot, pending: { from_slug: string; to_slug: string }[]): Set<string> {
  const idOf = new Map(Array.from(snap.bySlug.entries()).map(([slug, n]) => [slug, n.id]));
  return cyclicPairs(snap.edges, pending, idOf);
}

export async function allPendingPairs(svc: SupabaseClient): Promise<{ from_slug: string; to_slug: string; verification: string | null }[]> {
  return paged<{ from_slug: string; to_slug: string; verification: string | null }>((from) =>
    svc.from("edge_proposals").select("from_slug,to_slug,verification").eq("status", "pending").order("id").range(from, from + 999),
  );
}

export function forgetMakeupSnapshot(): void {
  cached = null;
  generation++;
}

export type PendingCounts = { proposals: number; missing: number; irreducible: boolean; truncated: boolean };

export function makeupForViewer(makeup: Makeup, pending: PendingCounts, isReviewer: boolean): { makeup: Makeup; pending: PendingCounts; canReview: boolean } {
  if (isReviewer) return { makeup, pending, canReview: true };
  return {
    makeup: { ...makeup, proposals: [], missing: [], irreducible: makeup.irreducible?.status === "confirmed" ? makeup.irreducible : null },
    pending,
    canReview: false,
  };
}

function chainTo(factors: (id: string) => Iterable<string>, nodeId: string, factorId: string, skip?: [string, string]): string[] | null {
  if (nodeId === factorId) return null;
  const parent = new Map<string, string>();
  const seen = new Set<string>([nodeId]);
  let layer = [nodeId];
  while (layer.length) {
    const next: string[] = [];
    for (const id of layer) {
      for (const f of Array.from(factors(id))) {
        if (skip && id === skip[0] && f === skip[1]) continue;
        if (seen.has(f)) continue;
        seen.add(f);
        parent.set(f, id);
        if (f === factorId) {
          const path = [f];
          while (path[0] !== nodeId) path.unshift(parent.get(path[0])!);
          return path;
        }
        next.push(f);
      }
    }
    layer = next;
  }
  return null;
}

const graphFactors = (snap: Snapshot) => (id: string) => snap.factors.get(id)?.keys() ?? [];

export function restsOnInGraph(snap: Snapshot, nodeId: string, factorId: string): boolean {
  return chainTo(graphFactors(snap), nodeId, factorId) !== null;
}

export type ChainStep = { slug: string; title: string };

export type PairStanding = {
  graphLoop: boolean;
  implied: boolean;
  viaPending: boolean;
  through: ChainStep[];
};

export function pairStandings(snap: Snapshot, pending: { from_slug: string; to_slug: string; verification?: string | null }[]): Map<string, PairStanding> {
  const idOf = (slug: string) => snap.bySlug.get(slug)?.id;
  const withPending = new Map<string, Set<string>>();
  for (const [node, fs] of Array.from(snap.factors.entries())) withPending.set(node, new Set(fs.keys()));
  for (const p of pending) {
    if (p.verification !== "confirmed") continue;
    const f = idOf(p.from_slug);
    const t = idOf(p.to_slug);
    if (!f || !t) continue;
    if (!withPending.has(t)) withPending.set(t, new Set());
    withPending.get(t)!.add(f);
  }
  const step = (id: string): ChainStep => {
    const n = snap.byId.get(id);
    return { slug: n?.slug ?? id, title: n?.title ?? id };
  };
  const out = new Map<string, PairStanding>();
  for (const p of pending) {
    const key = `${p.from_slug}->${p.to_slug}`;
    const f = idOf(p.from_slug);
    const t = idOf(p.to_slug);
    if (!f || !t) {
      out.set(key, { graphLoop: false, implied: false, viaPending: false, through: [] });
      continue;
    }
    const graphLoop = chainTo(graphFactors(snap), f, t) !== null;
    const inGraph = chainTo(graphFactors(snap), t, f);
    const inQueue = inGraph ? null : chainTo((id) => withPending.get(id) ?? [], t, f, [t, f]);
    const chain = inGraph ?? inQueue;
    out.set(key, {
      graphLoop,
      implied: inGraph !== null,
      viaPending: inQueue !== null,
      through: chain ? chain.slice(1, -1).map(step) : [],
    });
  }
  return out;
}

export function pairInGraph(snap: Snapshot, factorSlug: string, targetSlug: string): { graphLoop: boolean; implied: boolean } {
  const s = pairStandings(snap, [{ from_slug: factorSlug, to_slug: targetSlug }]).get(`${factorSlug}->${targetSlug}`)!;
  return { graphLoop: s.graphLoop, implied: s.implied };
}
