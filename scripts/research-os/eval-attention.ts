import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { spawnSync } from "node:child_process";
import { readdirSync, readFileSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { attentionIndex, phraseEntries, rankQuery } from "../../src/lib/research-os/attention";
import { cosine, seeded, tokens } from "../../src/lib/research-os/decompose-further";
import { normalizeTitle, titleSimilarity } from "../../src/lib/research-os/dedup";
import { academyNodeSlug } from "../../src/lib/research-os/ingest/academy";
import { makeupSnapshot, type Snapshot } from "../../src/lib/research-os/makeup";
import { wikipediaIndex } from "./wikipedia-links";

const OUT = path.join(__dirname, "ingest", "out");
const CORPUS = path.join(__dirname, "..", "..", "learning", "app", "corpus");
const QUERIES = 120;
const NEAR_TITLE = 0.8;
const NEAR_VECTOR = 0.93;
const RESAMPLES = 1000;

export type Query = { source: string; text: string };

function embed(items: { id: string; text: string }[]): Map<string, number[]> {
  if (!items.length) return new Map();
  const res = spawnSync("python3", [path.join(__dirname, "embed-texts.py")], { input: JSON.stringify(items), encoding: "utf8", maxBuffer: 512 * 1024 * 1024 });
  if (res.status !== 0) throw new Error(`embed-texts.py exited ${res.status}: ${(res.stderr || "").slice(-300)}`);
  return new Map(Object.entries(JSON.parse(res.stdout) as Record<string, number[]>));
}

export function plainSentences(markdown: string): string[] {
  return markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/\$\$[\s\S]*?\$\$/g, " ")
    .replace(/\$[^$]*\$/g, " ")
    .replace(/^#+.*$/gm, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[*_`>]/g, "")
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.replace(/\s+/g, " ").trim())
    .filter((s) => s.split(" ").length >= 6);
}

export function queryFor(title: string, lesson: string): string | null {
  const own = tokens(title);
  return plainSentences(lesson).find((s) => !Array.from(tokens(s)).some((t) => own.has(t))) ?? null;
}

export function ndcgAt(ranked: string[], relevant: Set<string>, k: number): number {
  let dcg = 0;
  ranked.slice(0, k).forEach((id, i) => {
    if (relevant.has(id)) dcg += 1 / Math.log2(i + 2);
  });
  let ideal = 0;
  for (let i = 0; i < Math.min(k, relevant.size); i++) ideal += 1 / Math.log2(i + 2);
  return ideal ? dcg / ideal : 0;
}

export function recallAt(ranked: string[], relevant: Set<string>, k: number): number {
  return relevant.size ? ranked.slice(0, k).filter((id) => relevant.has(id)).length / relevant.size : 0;
}

export function fuse(lists: string[][], k = 60): string[] {
  const score = new Map<string, number>();
  for (const list of lists) list.forEach((id, i) => score.set(id, (score.get(id) ?? 0) + 1 / (k + i + 1)));
  return Array.from(score).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([id]) => id);
}

export function pairedInterval(a: number[], b: number[], seed: string, resamples = RESAMPLES): { mean: number; interval: [number, number] } {
  const d = a.map((x, i) => x - b[i]);
  const mean = d.reduce((s, x) => s + x, 0) / Math.max(1, d.length);
  const rand = seeded(seed);
  const means: number[] = [];
  for (let r = 0; r < resamples; r++) {
    let s = 0;
    for (let i = 0; i < d.length; i++) s += d[Math.floor(rand() * d.length)];
    means.push(s / Math.max(1, d.length));
  }
  means.sort((x, y) => x - y);
  return { mean, interval: [means[Math.floor(0.025 * resamples)], means[Math.floor(0.975 * resamples) - 1]] };
}

type Settings = { entries: number; floor: number; cone: "hide" | "show" };

export async function prepare() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set");
  const svc = createClient(url, key, { db: { schema: "graph" }, auth: { persistSession: false } }) as unknown as SupabaseClient;
  const snap: Snapshot = await makeupSnapshot(svc);
  const index = attentionIndex(snap);
  const ideas = index.ideas;
  const idOfSlug = new Map(ideas.map((n) => [n.slug, n.id]));

  const atoms: { slug: string; title: string; lesson: string }[] = [];
  for (const name of readdirSync(CORPUS).sort()) {
    if (!name.endsWith(".json") || name === "index.json") continue;
    const json = JSON.parse(readFileSync(path.join(CORPUS, name), "utf8"));
    for (const a of Array.isArray(json?.atoms) ? json.atoms : [])
      if (typeof a?.id === "string" && typeof a?.lesson === "string") atoms.push({ slug: academyNodeSlug(`learning/app/corpus/${name}`, a.id), title: a.title ?? a.id, lesson: a.lesson });
  }

  const wiki = await wikipediaIndex(ideas.map((n) => ({ slug: n.slug, title: n.title })), { offline: true });
  const articleOf = (id: string) => wiki.titleOf.get(snap.byId.get(id)?.slug ?? "");
  const linked = (a: string, b: string) => Boolean(wiki.links.get(a)?.has(b) || wiki.links.get(b)?.has(a));

  const nodeVec = embed(ideas.map((n) => ({ id: n.id, text: `${n.title}. ${snap.summaries.get(n.id) ?? ""}`.trim() })));
  const candidates: Query[] = [];
  for (const a of atoms) {
    const id = idOfSlug.get(a.slug);
    if (!id || !articleOf(id)) continue;
    const text = queryFor(a.title, a.lesson);
    if (text) candidates.push({ source: id, text });
  }
  const rand = seeded("attention-eval");
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }

  const excludedFor = (source: string): Set<string> => {
    const s = snap.byId.get(source)!;
    const art = articleOf(source);
    const sv = nodeVec.get(source);
    const out = new Set<string>([source]);
    for (const n of ideas) {
      if (n.id === source) continue;
      const v = nodeVec.get(n.id);
      if (
        normalizeTitle(n.title) === normalizeTitle(s.title) ||
        titleSimilarity(n.title, s.title) >= NEAR_TITLE ||
        (art && articleOf(n.id) === art) ||
        (sv && v && cosine(sv, v) >= NEAR_VECTOR)
      )
        out.add(n.id);
    }
    return out;
  };

  const queries: (Query & { relevant: Set<string>; excluded: Set<string> })[] = [];
  for (const c of candidates) {
    if (queries.length >= QUERIES) break;
    const excluded = excludedFor(c.source);
    const art = articleOf(c.source)!;
    const relevant = new Set(ideas.filter((n) => !excluded.has(n.id) && articleOf(n.id) && linked(art, articleOf(n.id)!)).map((n) => n.id));
    if (relevant.size) queries.push({ ...c, relevant, excluded });
  }
  const dev = queries.slice(0, Math.floor(queries.length / 2));
  const held = queries.slice(Math.floor(queries.length / 2));
  const qVec = embed(queries.map((q, i) => ({ id: String(i), text: q.text })));
  const vecOf = new Map(queries.map((q, i) => [q, qVec.get(String(i))!]));

  type Q = (typeof queries)[number];
  const vectors = new Map(ideas.filter((n) => nodeVec.has(n.id)).map((n) => [n.id, nodeVec.get(n.id)!]));
  const embedRank = (q: Q) =>
    ideas
      .filter((n) => !q.excluded.has(n.id) && nodeVec.has(n.id))
      .map((n) => ({ id: n.id, s: cosine(vecOf.get(q)!, nodeVec.get(n.id)!) }))
      .sort((a, b) => b.s - a.s || a.id.localeCompare(b.id))
      .map((x) => x.id);
  const ranked = (q: Q, query: Parameters<typeof rankQuery>[2]) =>
    rankQuery(snap, vectors, { ...query, k: 50 })
      .hits.map((h) => h.id)
      .filter((id) => !q.excluded.has(id));
  const lexicalEntries = (q: Q, s: Settings) => phraseEntries(q.text, index, { entries: s.entries, floor: s.floor, exclude: q.excluded });
  return { snap, index, ideas, atoms, candidates, queries, dev, held, vectors, embedRank, ranked, lexicalEntries };
}

export type Prepared = Awaited<ReturnType<typeof prepare>>;
export type EvalQuery = Prepared["queries"][number];

async function main() {
  const { snap, index, ideas, atoms, candidates, queries, dev, held, vectors, embedRank, ranked, lexicalEntries } = await prepare();
  type Q = EvalQuery;
  const score = (set: Q[], rank: (q: Q) => string[]) => {
    const n: number[] = [];
    const r: number[] = [];
    let empty = 0;
    for (const q of set) {
      const list = rank(q);
      if (!list.length) empty++;
      n.push(ndcgAt(list, q.relevant, 10));
      r.push(recallAt(list, q.relevant, 20));
    }
    return { ndcg: n, recall: r, empty };
  };
  const mean = (x: number[]) => x.reduce((a, b) => a + b, 0) / Math.max(1, x.length);
  const round = (x: number) => Math.round(x * 1000) / 1000;

  const grid: Settings[] = [];
  for (const entries of [1, 3, 5]) for (const floor of [0.05, 0.1, 0.2]) for (const cone of ["hide", "show"] as const) grid.push({ entries, floor, cone });
  const tune = (make: (s: Settings) => (q: Q) => string[], settings = grid) =>
    settings.map((s) => ({ s, dev: mean(score(dev, make(s)).ndcg) })).sort((a, b) => b.dev - a.dev || a.s.entries - b.s.entries)[0];
  const cones = grid.filter((g) => g.entries === 1 && g.floor === 0.05);

  const evaluate = (baseline: (q: Q) => string[], arms: Record<string, { make: (s: Settings) => (q: Q) => string[]; settings: Settings[] }>) => {
    const base = score(held, baseline);
    const out: Record<string, unknown> = { baseline: { ndcg10: round(mean(base.ndcg)), recall20: round(mean(base.recall)) } };
    for (const [name, arm] of Object.entries(arms)) {
      const byCone: Record<string, unknown> = {};
      for (const cone of ["hide", "show"] as const) {
        const best = tune(arm.make, arm.settings.filter((x) => x.cone === cone));
        const res = score(held, arm.make(best.s));
        const dn = pairedInterval(res.ndcg, base.ndcg, `${name}-${cone}-ndcg`);
        const dr = pairedInterval(res.recall, base.recall, `${name}-${cone}-recall`);
        byCone[cone] = {
          tuned: { ...best.s, dev_ndcg10: round(best.dev) },
          ndcg10: round(mean(res.ndcg)),
          recall20: round(mean(res.recall)),
          empty: res.empty,
          versus_baseline: {
            ndcg10: { mean: round(dn.mean), interval: dn.interval.map(round) },
            recall20: { mean: round(dr.mean), interval: dr.interval.map(round) },
          },
        };
      }
      out[name] = byCone;
    }
    return out;
  };

  const concepts = evaluate((q) => ranked(q, { ids: [q.source], cone: "show", rank: "vector" }), {
    attention: { make: (s) => (q) => ranked(q, { ids: [q.source], cone: s.cone, rank: "attention" }), settings: cones },
    fused: { make: (s) => (q) => ranked(q, { ids: [q.source], cone: s.cone, rank: "fused" }), settings: cones },
  });
  const phrases = evaluate(embedRank, {
    attention_lexical: { make: (s) => (q) => ranked(q, { entries: lexicalEntries(q, s), cone: s.cone, rank: "attention" }), settings: grid },
    vector_via_lexical_entries: { make: (s) => (q) => ranked(q, { entries: lexicalEntries(q, s), cone: s.cone, rank: "vector" }), settings: grid },
    fused_via_lexical_entries: { make: (s) => (q) => ranked(q, { entries: lexicalEntries(q, s), cone: s.cone, rank: "fused" }), settings: grid },
  });

  const bench = { lexical_entry_ms: [] as number[], rank_ms: [] as number[] };
  for (let i = 0; i < 200; i++) {
    const q = queries[i % queries.length];
    const t0 = performance.now();
    const e = phraseEntries(q.text, index);
    const t1 = performance.now();
    rankQuery(snap, vectors, { entries: e, k: 20, rank: "fused" });
    const t2 = performance.now();
    bench.lexical_entry_ms.push(t1 - t0);
    bench.rank_ms.push(t2 - t1);
  }
  const pct = (x: number[], p: number) => {
    const sorted = x.slice().sort((a, b) => a - b);
    return Math.round(sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))] * 100) / 100;
  };
  const report = {
    generated_at: new Date().toISOString(),
    ideas: ideas.length,
    atoms: atoms.length,
    queries: { candidates: candidates.length, used: queries.length, dev: dev.length, held_out: held.length },
    relevance: "idea nodes whose mapped Wikipedia article links to or from the source atom's article, the source and its near duplicates removed",
    near_duplicates: { title_similarity: NEAR_TITLE, embedding_cosine: NEAR_VECTOR, same_article: true },
    concepts: { baseline: "bge-small kNN from the picked node's vector", ...concepts },
    phrases: { baseline: "bge-small kNN from the phrase's own embedding, which needs bkt-ig20", ...phrases },
    bench_ms: {
      lexical_entry: { p50: pct(bench.lexical_entry_ms, 0.5), p95: pct(bench.lexical_entry_ms, 0.95) },
      fused_rank: { p50: pct(bench.rank_ms, 0.5), p95: pct(bench.rank_ms, 0.95) },
    },
  };
  mkdirSync(OUT, { recursive: true });
  writeFileSync(path.join(OUT, "attention-eval.json"), JSON.stringify(report, null, 1));
  console.log(JSON.stringify(report, null, 1));
}

if (require.main === module)
  main().catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
