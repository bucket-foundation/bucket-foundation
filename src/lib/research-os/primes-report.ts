import type { SupabaseClient } from "@supabase/supabase-js";
import { classifyFrontier, coverage, depthPolynomials, formatP, frontier, implications, leibnizPrimes, pmiPairs, withinGroup, type GapClass, type Nonface } from "./prime-algebra";
import { CONFIDENCE_SOURCE } from "./decompose-further";
import { pagedRead } from "./paging";
import { decompose, FACTOR_EDGES, penetration, summarize, type Decomposition, type DepEdge, type PrimeNodeInput, type PrimeSummary } from "./primes";
import { readLineageSummary } from "./medallion/lineage-read";
import type { LineageSummary } from "./medallion/report";

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
  lineage?: LineageBlock;
}

export type LineageBlock = { ok: true; summary: LineageSummary } | { ok: false; unavailable: string };

export interface PrimeAlgebraReport {
  coverage: { s: number; coverage: number; supports: number }[];
  frontier: {
    pairs: number;
    triples: number;
    expectedAtLeastOne: number;
    withinBranch: number;
    top: GapRow[];
    topWithinBranch: GapRow[];
    gaps: { draws: number; counts: Record<GapClass, number>; counterfactualPairs: number };
  };
  together: { a: ReportRef; b: ReportRef; joint: number; pmi: number }[];
  implied: { node: ReportRef; factor: ReportRef; support: number; mutual: boolean }[];
  reach: (ReportRef & { coefficients: number[]; meanDepth: number })[];
}

export type GapRow = { primes: ReportRef[]; expected: number; p: string; gap: GapClass };

export type PendingPair = { from_id: string; to_id: string };

export type ReportOptions = { now?: Date; pendingConfirmed?: PendingPair[]; nullDraws?: number };

export const NULL_DRAWS = 1000;

const TOP = 12;
const ALGEBRA_ROWS = 5;

function factorInputs(nodeRows: ReportNode[], edgeRows: ReportEdge[]): { nodes: PrimeNodeInput[]; edges: DepEdge[] } {
  const live = new Set(nodeRows.map((n) => n.id));
  return {
    nodes: nodeRows.map((n) => ({ id: n.id, slug: n.slug, title: n.title, kind: n.kind, branch: n.branch })),
    edges: edgeRows
      .filter((e) => e.kind in FACTOR_EDGES && live.has(e.from_id) && live.has(e.to_id))
      .map((e) => ({ fromId: e.from_id, toId: e.to_id, kind: e.kind, confidence: e.confidence })),
  };
}

export function decomposeRows(nodeRows: ReportNode[], edgeRows: ReportEdge[]): Map<string, Decomposition> {
  const { nodes, edges } = factorInputs(nodeRows, edgeRows);
  return decompose(nodes, edges);
}

export function buildPrimesReport(nodeRows: ReportNode[], edgeRows: ReportEdge[], irreducibleSlugs: Set<string>, options: ReportOptions = {}): PrimesReport {
  const now = options.now ?? new Date();
  const { nodes, edges } = factorInputs(nodeRows, edgeRows);
  const live = new Set(nodeRows.map((n) => n.id));

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
  const branchKey = (id: string) => {
    const b = byId.get(id)?.branch;
    return b ? `branch:${b}` : `prime:${id}`;
  };
  const all = frontier(dec);
  const extra = (options.pendingConfirmed ?? []).filter((p) => live.has(p.from_id) && live.has(p.to_id));
  const counterfactual = extra.length
    ? decompose(nodes, edges.concat(extra.map((p) => ({ fromId: p.from_id, toId: p.to_id, kind: "prerequisite", confidence: null }))))
    : null;
  const gaps = classifyFrontier(dec, all.nonfaces, counterfactual, { draws: options.nullDraws ?? NULL_DRAWS });
  const within = withinGroup(gaps.nonfaces, branchKey) as typeof gaps.nonfaces;
  const named = (x: (typeof gaps.nonfaces)[number]): GapRow => ({ primes: x.primes.map(ref), expected: x.expected, p: formatP(x.p, gaps.draws), gap: x.gap });
  const algebra: PrimeAlgebraReport = {
    coverage: [1, 2].map((s) => {
      const c = coverage(dec, s, lp);
      return { s, coverage: c.coverage, supports: c.supports };
    }),
    frontier: {
      pairs: all.pairs,
      triples: all.triples,
      expectedAtLeastOne: all.expectedAtLeastOne,
      withinBranch: within.length,
      top: gaps.nonfaces.slice(0, ALGEBRA_ROWS).map(named),
      topWithinBranch: within.slice(0, ALGEBRA_ROWS).map(named),
      gaps: { draws: gaps.draws, counts: gaps.counts, counterfactualPairs: extra.length },
    },
    together: pmiPairs(dec)
      .slice(0, ALGEBRA_ROWS)
      .map((x) => ({ a: ref(x.a), b: ref(x.b), joint: x.joint, pmi: x.pmi })),
    implied: implications(dec)
      .filter((x) => !x.mutual || x.node < x.factor)
      .slice(0, ALGEBRA_ROWS)
      .map((x) => ({ node: ref(x.node), factor: ref(x.factor), support: x.support, mutual: x.mutual })),
    reach: depthPolynomials(dec)
      .slice(0, ALGEBRA_ROWS)
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

export function pendingPairIds(nodeRows: ReportNode[], pairs: { from_slug: string; to_slug: string }[]): PendingPair[] {
  const idOf = new Map(nodeRows.filter((n) => n.slug).map((n) => [n.slug!, n.id]));
  return pairs.flatMap((p) => {
    const from = idOf.get(p.from_slug);
    const to = idOf.get(p.to_slug);
    return from && to ? [{ from_id: from, to_id: to }] : [];
  });
}

type Query = ReturnType<ReturnType<SupabaseClient["from"]>["select"]>;

function readAll<T>(svc: SupabaseClient, table: string, columns: string, orderBy: string, filter?: (q: Query) => Query): Promise<T[]> {
  return pagedRead<T>((page) => {
    let q = svc.from(table).select(columns).order(orderBy, { ascending: true }).range(page.from, page.to) as unknown as Query;
    if (filter) q = filter(q);
    return q as unknown as Promise<{ data: T[] | null; error: { message: string } | null }>;
  }).catch((err: unknown) => {
    throw new Error(`${table}: ${err instanceof Error ? err.message : String(err)}`);
  });
}

let cachedReport: { at: number; report: PrimesReport } | null = null;
let inflightReport: { gen: number; promise: Promise<PrimesReport> } | null = null;
let reportGeneration = 0;

export function forgetPrimesReport(): void {
  reportGeneration++;
  cachedReport = null;
}

export async function loadPrimesReport(svc: SupabaseClient, ttlMs = 60_000, read: (svc: SupabaseClient) => Promise<PrimesReport> = readPrimesReport): Promise<PrimesReport> {
  if (cachedReport && Date.now() - cachedReport.at < ttlMs) return cachedReport.report;
  if (inflightReport && inflightReport.gen === reportGeneration) return inflightReport.promise;
  const started = reportGeneration;
  const promise = read(svc)
    .then((report) => {
      if (reportGeneration === started) cachedReport = { at: Date.now(), report };
      return report;
    })
    .finally(() => {
      if (inflightReport?.promise === promise) inflightReport = null;
    });
  inflightReport = { gen: started, promise };
  return promise;
}

export type PrimesInputs = { nodeRows: ReportNode[]; edgeRows: ReportEdge[]; irreducible: Set<string>; pendingConfirmed: PendingPair[] };

export async function readPrimesInputs(svc: SupabaseClient): Promise<PrimesInputs> {
  const [nodeRows, edgeRows, reviewed, pending] = await Promise.all([
    readAll<ReportNode>(svc, "nodes", "id, slug, title, kind, branch", "id", (q) => q.eq("visibility", "public").is("superseded_by", null)),
    readAll<ReportEdge>(svc, "edges", "id, from_id, to_id, kind, confidence", "id", (q) => q.in("kind", Object.keys(FACTOR_EDGES))),
    readAll<{ node_slug: string; status: string }>(svc, "irreducible_proposals", "id, node_slug, status", "id"),
    readAll<{ from_slug: string; to_slug: string }>(svc, "edge_proposals", "id, from_slug, to_slug", "id", (q) =>
      q.eq("status", "pending").eq("verification", "confirmed").eq("confidence_source", CONFIDENCE_SOURCE),
    ),
  ]);
  const irreducible = new Set(reviewed.filter((r) => r.status === "confirmed").map((r) => r.node_slug));
  return { nodeRows, edgeRows, irreducible, pendingConfirmed: pendingPairIds(nodeRows, pending) };
}

export async function readLineageBlock(svc: SupabaseClient, nodeRows: ReportNode[], edgeRows: ReportEdge[]): Promise<LineageBlock> {
  try {
    return { ok: true, summary: await readLineageSummary(svc, decomposeRows(nodeRows, edgeRows)) };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[primes] lineage block failed:", message);
    return { ok: false, unavailable: message };
  }
}

async function readPrimesReport(svc: SupabaseClient): Promise<PrimesReport> {
  const x = await readPrimesInputs(svc);
  const report = buildPrimesReport(x.nodeRows, x.edgeRows, x.irreducible, { pendingConfirmed: x.pendingConfirmed });
  return { ...report, lineage: await readLineageBlock(svc, x.nodeRows, x.edgeRows) };
}
