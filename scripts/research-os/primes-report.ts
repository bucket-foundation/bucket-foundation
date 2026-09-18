/**
 * Runs the prime decomposition (src/lib/research-os/primes.ts) over the
 * graph's public, current nodes in Supabase and prints a report: status
 * counts, tiers, the most penetrating primes, the deepest composites,
 * cycles, the nodes that name equality (the worked example in
 * learning/research-os/PRIMES.md), the primes a reviewer confirmed as
 * irreducible, and what moved since the previous report. Writes the full
 * result to scripts/research-os/ingest/out/primes-report.json (ignored by
 * git), which the next run reads as its baseline.
 *
 * Run from the repo root with the local stack's keys in .env.local:
 *   set -a; . ./.env.local; set +a
 *   npx ts-node --compiler-options '{"module":"commonjs"}' scripts/research-os/primes-report.ts
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  decompose,
  FACTOR_EDGES,
  movesSince,
  penetration,
  summarize,
  type DepEdge,
  type PriorStanding,
  type PrimeNodeInput,
} from "../../src/lib/research-os/primes";

type NodeRow = { id: string; slug: string | null; title: string | null; kind: string | null; branch: string | null };
type EdgeRow = { from_id: string; to_id: string; kind: string; confidence: number | null };

async function all<T>(svc: SupabaseClient, table: string, columns: string, filter?: (q: any) => any): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += 1000) {
    let q = svc.from(table).select(columns).range(from, from + 999);
    if (filter) q = filter(q);
    const { data, error } = await q;
    if (error) throw new Error(`${table}: ${error.message}`);
    out.push(...((data ?? []) as T[]));
    if (!data || data.length < 1000) return out;
  }
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set");
  const svc = createClient(url, key, { db: { schema: "graph" }, auth: { persistSession: false } }) as unknown as SupabaseClient;

  const nodeRows = await all<NodeRow>(svc, "nodes", "id, slug, title, kind, branch", (q) => q.eq("visibility", "public").is("superseded_by", null));
  const live = new Set(nodeRows.map((n) => n.id));
  const edgeRows = (await all<EdgeRow>(svc, "edges", "from_id, to_id, kind, confidence", (q) => q.in("kind", Object.keys(FACTOR_EDGES)))).filter(
    (e) => live.has(e.from_id) && live.has(e.to_id),
  );
  const reviewed = await all<{ node_slug: string; status: string }>(svc, "irreducible_proposals", "node_slug, status");
  const irreducible = new Set(reviewed.filter((r) => r.status === "approved").map((r) => r.node_slug));
  const nodes: PrimeNodeInput[] = nodeRows.map((n) => ({ id: n.id, slug: n.slug, title: n.title, kind: n.kind, branch: n.branch }));
  const edges: DepEdge[] = edgeRows.map((e) => ({ fromId: e.from_id, toId: e.to_id, kind: e.kind, confidence: e.confidence }));

  const dec = decompose(nodes, edges);
  const pen = penetration(nodes, dec);
  const sum = summarize(dec);
  const byId = new Map(nodeRows.map((n) => [n.id, n]));
  const label = (id: string) => {
    const n = byId.get(id);
    return n ? `${n.title ?? n.slug} [${n.kind}, ${n.branch}]` : id;
  };

  const unfactoredByKind: Record<string, number> = {};
  for (const d of Array.from(dec.values())) {
    if (d.status !== "unfactored") continue;
    const k = byId.get(d.id)?.kind ?? "(unknown)";
    unfactoredByKind[k] = (unfactoredByKind[k] ?? 0) + 1;
  }
  const deepest = Array.from(dec.values())
    .filter((d) => d.status === "composite")
    .sort((a, b) => b.depth - a.depth || b.signature.size - a.signature.size)
    .slice(0, 10);
  const widest = Array.from(dec.values())
    .filter((d) => d.status === "composite")
    .sort((a, b) => b.signature.size - a.signature.size)
    .slice(0, 10);
  const equality = nodeRows.filter((n) => /\bequal(s|ity)?\b|equals sign|equation/i.test(`${n.title ?? ""} ${n.slug ?? ""}`)).slice(0, 12);

  console.log(`nodes ${sum.nodes}; prime ${sum.prime}; composite ${sum.composite}; unfactored ${sum.unfactored}; in a cycle ${sum.inCycle}; max depth ${sum.maxDepth}`);
  console.log(`nodes per tier: ${sum.tiers.join(", ")}`);
  console.log(`unfactored by kind: ${JSON.stringify(unfactoredByKind)}`);
  console.log("\nmost penetrating primes (composites containing it, branches, spread):");
  for (const p of pen.slice(0, 15)) console.log(`  ${p.composites}\t${p.branches}\t${p.spread.toFixed(2)}\t${label(p.id)}`);
  console.log("\ndeepest composites (depth, distinct primes):");
  for (const d of deepest) console.log(`  ${d.depth}\t${d.signature.size}\t${label(d.id)}`);
  console.log("\nwidest composites (distinct primes, depth):");
  for (const d of widest) console.log(`  ${d.signature.size}\t${d.depth}\t${label(d.id)}`);
  console.log("\nnodes naming equality:");
  for (const n of equality) {
    const d = dec.get(n.id)!;
    const reach = pen.find((p) => p.id === n.id);
    console.log(`  ${d.status}\tdepth ${d.depth}\tprimes ${d.signature.size}\tin ${reach?.composites ?? 0} composites\t${label(n.id)}`);
  }

  const primeRows = nodeRows.filter((n) => dec.get(n.id)?.status === "prime");
  const confirmed = primeRows.filter((n) => n.slug && irreducible.has(n.slug));
  const lostStanding = nodeRows.filter((n) => n.slug && irreducible.has(n.slug) && dec.get(n.id)?.status !== "prime");
  console.log(`\nprimes a reviewer confirmed as irreducible: ${confirmed.length} of ${primeRows.length}`);
  for (const n of confirmed.slice(0, 15)) console.log(`  ${label(n.id)}`);
  if (lostStanding.length) {
    console.log(`confirmed irreducible, yet factors were approved later (review again): ${lostStanding.length}`);
    for (const n of lostStanding.slice(0, 15)) console.log(`  ${label(n.id)}`);
  }

  const outDir = path.join(__dirname, "ingest", "out");
  const reportFile = path.join(outDir, "primes-report.json");
  let moves: ReturnType<typeof movesSince> | null = null;
  let since: string | null = null;
  if (existsSync(reportFile)) {
    try {
      const prev = JSON.parse(readFileSync(reportFile, "utf8")) as { generated_at?: string; nodes?: PriorStanding[] };
      if (Array.isArray(prev.nodes)) {
        moves = movesSince(prev.nodes, dec);
        since = prev.generated_at ?? null;
      }
    } catch (e) {
      console.log(`\nprevious report unreadable, no baseline: ${e instanceof Error ? e.message : e}`);
    }
  }
  if (moves) {
    console.log(`\nsince ${since}: ${moves.decomposed.length} primes decomposed further, ${moves.newPrimes.length} new primes, ${moves.joined.length} nodes joined the dependency graph, ${moves.deeper} deeper, ${moves.shallower} shallower`);
    for (const id of moves.decomposed.slice(0, 15)) console.log(`  decomposed\t${label(id)}`);
    for (const id of moves.newPrimes.slice(0, 15)) console.log(`  new prime\t${label(id)}`);
  } else console.log("\nno earlier report: this run is the baseline");
  mkdirSync(outDir, { recursive: true });
  const report = {
    generated_at: new Date().toISOString(),
    summary: sum,
    unfactored_by_kind: unfactoredByKind,
    reviewed_irreducible: confirmed.map((n) => n.slug),
    irreducible_with_new_factors: lostStanding.map((n) => n.slug),
    moves: moves && { since, ...moves },
    penetration: pen.map((p) => ({ ...p, label: label(p.id) })),
    nodes: Array.from(dec.values()).map((d) => ({
      id: d.id,
      label: label(d.id),
      status: d.status,
      depth: d.depth,
      in_cycle: d.inCycle,
      factors: d.factors,
      signature: Object.fromEntries(d.signature),
    })),
  };
  writeFileSync(reportFile, JSON.stringify(report, null, 1));
  console.log(`\nwrote ${path.join("scripts", "research-os", "ingest", "out", "primes-report.json")}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
