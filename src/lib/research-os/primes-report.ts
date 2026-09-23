/**
 * The prime report as data for a page (ros-frontend 1): what
 * scripts/research-os/primes-report.ts prints, computed from the graph's
 * public current nodes and their factor edges. `buildPrimesReport` is pure
 * and tested in scripts/test-research-os-primes-report.ts; `loadPrimesReport`
 * reads the graph.
 *
 * Every read pages with `.range()` under an `.order("id")`, since PostgREST
 * caps a response at 1,000 rows and Postgres keeps no stable order across
 * pages without one.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { coverage, depthPolynomials, frontier, implications, leibnizPrimes, pmiPairs, type Nonface } from "./prime-algebra";
import { decompose, FACTOR_EDGES, penetration, summarize, type DepEdge, type PrimeNodeInput, type PrimeSummary } from "./primes";

export type ReportNode = { id: string; slug: string | null; title: string | null; kind: string | null; branch: string | null };
export type ReportEdge = { from_id: string; to_id: string; kind: string; confidence: number | null };

export interface ReportRef {
  slug: string | null;
  title: string;
  kind: string | null;
  branch: string | null;
}

export interface PrimesReport {
  generatedAt: string;
  summary: PrimeSummary;
  unfactoredByKind: { kind: string; count: number }[];
  penetrating: (ReportRef & { composites: number; branches: number; spread: number })[];
  deepest: (ReportRef & { depth: number; primes: number })[];
  widest: (ReportRef & { depth: number; primes: number })[];
  confirmedIrreducible: { count: number; of: number; sample: ReportRef[] };
  reviewAgain: ReportRef[];
  algebra: PrimeAlgebraReport;
}

export interface PrimeAlgebraReport {
  coverage: { s: number; coverage: number; supports: number }[];
  frontier: {
    pairs: number;
    triples: number;
    expectedAtLeastOne: number;
    withinBranch: number;
    top: { primes: ReportRef[]; expected: number }[];
    topWithinBranch: { primes: ReportRef[]; expected: number }[];
  };
  together: { a: ReportRef; b: ReportRef; joint: number; pmi: number }[];
  implied: { node: ReportRef; factor: ReportRef; support: number; mutual: boolean }[];
  reach: (ReportRef & { coefficients: number[]; meanDepth: number })[];
}

const TOP = 12;
const FRONTIER_TOP = 15;

export function buildPrimesReport(nodeRows: ReportNode[], edgeRows: ReportEdge[], irreducibleSlugs: Set<string>, now = new Date()): PrimesReport {
  const live = new Set(nodeRows.map((n) => n.id));
  const nodes: PrimeNodeInput[] = nodeRows.map((n) => ({ id: n.id, slug: n.slug, title: n.title, kind: n.kind, branch: n.branch }));
  const edges: DepEdge[] = edgeRows
    .filter((e) => e.kind in FACTOR_EDGES && live.has(e.from_id) && live.has(e.to_id))
    .map((e) => ({ fromId: e.from_id, toId: e.to_id, kind: e.kind, confidence: e.confidence }));

  const dec = decompose(nodes, edges);
  const pen = penetration(nodes, dec);
  const byId = new Map(nodeRows.map((n) => [n.id, n]));
  const ref = (id: string): ReportRef => {
    const n = byId.get(id);
    return { slug: n?.slug ?? null, title: n?.title ?? n?.slug ?? id, kind: n?.kind ?? null, branch: n?.branch ?? null };
  };

  const unfactored: Record<string, number> = {};
  const composites = [];
  for (const d of Array.from(dec.values())) {
    if (d.status === "unfactored") {
      const k = byId.get(d.id)?.kind ?? "unknown";
      unfactored[k] = (unfactored[k] ?? 0) + 1;
    }
    if (d.status === "composite") composites.push(d);
  }
  const byDepth = [...composites].sort((a, b) => b.depth - a.depth || b.signature.size - a.signature.size || a.id.localeCompare(b.id));
  const byWidth = [...composites].sort((a, b) => b.signature.size - a.signature.size || b.depth - a.depth || a.id.localeCompare(b.id));

  const primes = nodeRows.filter((n) => dec.get(n.id)?.status === "prime");
  const confirmed = primes.filter((n) => n.slug && irreducibleSlugs.has(n.slug));
  const reviewAgain = nodeRows.filter((n) => n.slug && irreducibleSlugs.has(n.slug) && dec.get(n.id)?.status !== "prime");

  const lp = leibnizPrimes(dec);
  const branchOfPrime = new Map<string, string>();
  for (const p of lp) branchOfPrime.set(p.id, byId.get(p.id)?.branch ?? "(none)");
  const all = frontier(dec);
  const within = frontier(dec, 3, branchOfPrime);
  const named = (x: Nonface) => ({ primes: x.primes.map(ref), expected: x.expected });
  const algebra: PrimeAlgebraReport = {
    coverage: [1, 2].map((s) => {
      const c = coverage(dec, s, lp);
      return { s, coverage: c.coverage, supports: c.supports };
    }),
    frontier: {
      pairs: all.pairs,
      triples: all.triples,
      expectedAtLeastOne: all.expectedAtLeastOne,
      withinBranch: within.nonfaces.length,
      top: all.nonfaces.slice(0, FRONTIER_TOP).map(named),
      topWithinBranch: within.nonfaces.slice(0, 5).map(named),
    },
    together: pmiPairs(dec)
      .slice(0, TOP)
      .map((x) => ({ a: ref(x.a), b: ref(x.b), joint: x.joint, pmi: x.pmi })),
    implied: implications(dec)
      .filter((x) => !x.mutual || x.node < x.factor)
      .slice(0, TOP)
      .map((x) => ({ node: ref(x.node), factor: ref(x.factor), support: x.support, mutual: x.mutual })),
    reach: depthPolynomials(dec)
      .slice(0, TOP)
      .map((x) => ({ ...ref(x.id), coefficients: x.coefficients, meanDepth: x.meanDepth })),
  };

  return {
    generatedAt: now.toISOString(),
    summary: summarize(dec),
    unfactoredByKind: Object.entries(unfactored)
      .map(([kind, count]) => ({ kind, count }))
      .sort((a, b) => b.count - a.count || a.kind.localeCompare(b.kind)),
    penetrating: pen.slice(0, TOP).map((p) => ({ ...ref(p.id), composites: p.composites, branches: p.branches, spread: p.spread })),
    deepest: byDepth.slice(0, TOP).map((d) => ({ ...ref(d.id), depth: d.depth, primes: d.signature.size })),
    widest: byWidth.slice(0, TOP).map((d) => ({ ...ref(d.id), depth: d.depth, primes: d.signature.size })),
    confirmedIrreducible: { count: confirmed.length, of: primes.length, sample: confirmed.slice(0, TOP).map((n) => ref(n.id)) },
    reviewAgain: reviewAgain.map((n) => ref(n.id)),
    algebra,
  };
}

type Query = ReturnType<ReturnType<SupabaseClient["from"]>["select"]>;

async function readAll<T>(svc: SupabaseClient, table: string, columns: string, orderBy: string, filter?: (q: Query) => Query): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += 1000) {
    let q = svc.from(table).select(columns).order(orderBy, { ascending: true }).range(from, from + 999) as unknown as Query;
    if (filter) q = filter(q);
    const { data, error } = await q;
    if (error) throw new Error(`${table}: ${error.message}`);
    const rows = (data ?? []) as unknown as T[];
    out.push(...rows);
    if (rows.length < 1000) return out;
  }
}

/** Reads the graph and builds the report. Throws when a read fails, so the page can say the graph did not answer. */
export async function loadPrimesReport(svc: SupabaseClient): Promise<PrimesReport> {
  const [nodeRows, edgeRows, reviewed] = await Promise.all([
    readAll<ReportNode>(svc, "nodes", "id, slug, title, kind, branch", "id", (q) => q.eq("visibility", "public").is("superseded_by", null)),
    readAll<ReportEdge>(svc, "edges", "id, from_id, to_id, kind, confidence", "id", (q) => q.in("kind", Object.keys(FACTOR_EDGES))),
    readAll<{ node_slug: string; status: string }>(svc, "irreducible_proposals", "id, node_slug, status", "id"),
  ]);
  const irreducible = new Set(reviewed.filter((r) => r.status === "confirmed").map((r) => r.node_slug));
  return buildPrimesReport(nodeRows, edgeRows, irreducible);
}
