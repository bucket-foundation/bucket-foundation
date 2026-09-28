import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { classifyFrontier, formatP, frontier, seededRandom, topJaccard } from "../../src/lib/research-os/prime-algebra";
import { NULL_DRAWS, readPrimesInputs } from "../../src/lib/research-os/primes-report";
import { decompose, FACTOR_EDGES, type DepEdge, type PrimeNodeInput } from "../../src/lib/research-os/primes";

const OUT = path.join(__dirname, "ingest", "out");

function arg(name: string, fallback: string): string {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : fallback;
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set");
  const draws = Number(arg("--draws", String(NULL_DRAWS)));
  const subsets = Number(arg("--subsets", "100"));
  const fraction = Number(arg("--fraction", "0.9"));
  const subsetDraws = Number(arg("--subset-draws", String(NULL_DRAWS)));
  const k = Number(arg("--top", "20"));
  const svc = createClient(url, key, { db: { schema: "graph" }, auth: { persistSession: false } }) as unknown as SupabaseClient;
  const x = await readPrimesInputs(svc);
  const live = new Set(x.nodeRows.map((n) => n.id));
  const nodes: PrimeNodeInput[] = x.nodeRows.map((n) => ({ id: n.id, slug: n.slug, title: n.title, kind: n.kind, branch: n.branch }));
  const edges: DepEdge[] = x.edgeRows
    .filter((e) => e.kind in FACTOR_EDGES && live.has(e.from_id) && live.has(e.to_id))
    .map((e) => ({ fromId: e.from_id, toId: e.to_id, kind: e.kind, confidence: e.confidence }));
  const extra: DepEdge[] = x.pendingConfirmed.map((p) => ({ fromId: p.from_id, toId: p.to_id, kind: "prerequisite", confidence: null }));
  const titleOf = new Map(x.nodeRows.map((n) => [n.id, n.title ?? n.slug ?? n.id]));
  const branchOf = new Map(x.nodeRows.map((n) => [n.id, n.branch]));

  const started = Date.now();
  const dec = decompose(nodes, edges);
  const all = frontier(dec);
  const counterfactual = extra.length ? decompose(nodes, edges.concat(extra)) : null;
  const gaps = classifyFrontier(dec, all.nonfaces, counterfactual, { draws });
  const fullMs = Date.now() - started;
  const realTop = gaps.nonfaces.filter((n) => n.gap === "real").map((n) => n.primes);

  const rand = seededRandom("subsets");
  const overlaps: number[] = [];
  const subsetReal: number[] = [];
  for (let h = 0; h < subsets; h++) {
    const d = new Map(Array.from(dec).filter(([, v]) => v.status !== "composite" || rand() < fraction));
    const f = frontier(d);
    const g = classifyFrontier(d, f.nonfaces, counterfactual, { draws: subsetDraws, seed: `subset-${h}` });
    subsetReal.push(g.counts.real);
    overlaps.push(topJaccard(realTop, g.nonfaces.filter((n) => n.gap === "real").map((n) => n.primes), k));
  }
  overlaps.sort((a, b) => a - b);
  const q = (p: number) => (overlaps.length ? Math.round(overlaps[Math.min(overlaps.length - 1, Math.floor(p * overlaps.length))] * 100) / 100 : null);
  const cross = (primes: string[]) => new Set(primes.map((p) => branchOf.get(p) ?? p)).size > 1;

  const report = {
    generated_at: new Date().toISOString(),
    composites: all.composites,
    nonfaces: all.nonfaces.length,
    pairs: all.pairs,
    triples: all.triples,
    counterfactual_pairs: extra.length,
    null: { method: "curveball", draws, seed: "null-frontier", ms: fullMs },
    counts: gaps.counts,
    cross_branch: {
      missing_edge: gaps.nonfaces.filter((n) => n.gap === "missing_edge" && cross(n.primes)).length,
      chance: gaps.nonfaces.filter((n) => n.gap === "chance" && cross(n.primes)).length,
      real: gaps.nonfaces.filter((n) => n.gap === "real" && cross(n.primes)).length,
    },
    stability: { subsets, fraction, subset_draws: subsetDraws, top: k, jaccard: { min: q(0), median: q(0.5), max: overlaps.length ? Math.round(overlaps[overlaps.length - 1] * 100) / 100 : null }, real_per_subset: { min: Math.min(...subsetReal), max: Math.max(...subsetReal) } },
    top: gaps.nonfaces.slice(0, 40).map((n) => ({ primes: n.primes.map((p) => titleOf.get(p)), expected: Math.round(n.expected * 10) / 10, p: formatP(n.p, draws), gap: n.gap })),
  };
  mkdirSync(OUT, { recursive: true });
  writeFileSync(path.join(OUT, "frontier-baseline.json"), JSON.stringify(report, null, 1));
  console.log(
    `[frontier-baseline] ${all.composites} composites, ${all.nonfaces.length} nonfaces (${all.pairs} pairs, ${all.triples} triples), ${extra.length} confirmed pending pairs in the counterfactual; ` +
      `missing edge ${gaps.counts.missing_edge}, chance ${gaps.counts.chance}, real ${gaps.counts.real}; null ${draws} draws in ${fullMs} ms`,
  );
  console.log(`[frontier-baseline] top-${k} real-gap Jaccard over ${subsets} random subsets of ${fraction} of the composites: min ${report.stability.jaccard.min}, median ${report.stability.jaccard.median}, max ${report.stability.jaccard.max}; real gaps per subset ${report.stability.real_per_subset.min} to ${report.stability.real_per_subset.max}`);
  for (const r of report.top.slice(0, 10)) console.log(`  ${r.gap}\t${r.expected}\tp ${r.p}\t${r.primes.join(" + ")}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
