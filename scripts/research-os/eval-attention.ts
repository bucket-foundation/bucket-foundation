import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { spawnSync } from "node:child_process";
import { readdirSync, readFileSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { attentionIndex, phraseEntries, rankByAttention, type Entry } from "../../src/lib/research-os/attention";
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

async function main() {
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

  const embedRank = (q: (typeof queries)[number]) =>
    ideas
      .filter((n) => !q.excluded.has(n.id) && nodeVec.has(n.id))
      .map((n) => ({ id: n.id, s: cosine(vecOf.get(q)!, nodeVec.get(n.id)!) }))
      .sort((a, b) => b.s - a.s || a.id.localeCompare(b.id))
      .map((x) => x.id);
  const attentionRank = (q: (typeof queries)[number], entries: Entry[], cone: "hide" | "show") =>
    rankByAttention(snap, { entries, k: 50, cone })
      .hits.map((h) => h.id)
      .filter((id) => !q.excluded.has(id));
  const lexicalEntries = (q: (typeof queries)[number], s: Settings) => phraseEntries(q.text, index, { entries: s.entries, floor: s.floor, exclude: q.excluded });
  const embeddingEntries = (q: (typeof queries)[number], s: Settings) =>
    embedRank(q)
      .slice(0, s.entries)
      .map((id) => ({ id, score: cosine(vecOf.get(q)!, nodeVec.get(id)!) }))
      .filter((e) => e.score >= 0.5);

  const arms = (s: Settings, sEmb: Settings) => ({
    embedding: (q: (typeof queries)[number]) => embedRank(q),
    attention_lexical: (q: (typeof queries)[number]) => attentionRank(q, lexicalEntries(q, s), s.cone),
    attention_embedding_entry: (q: (typeof queries)[number]) => attentionRank(q, embeddingEntries(q, sEmb), sEmb.cone),
    fused: (q: (typeof queries)[number]) => fuse([embedRank(q).slice(0, 50), attentionRank(q, lexicalEntries(q, s), s.cone)]),
  });
  const score = (set: typeof queries, rank: (q: (typeof queries)[number]) => string[]) => {
    const n: number[] = [];
    const r: number[] = [];
    let empty = 0;
    for (const q of set) {
      const ranked = rank(q);
      if (!ranked.length) empty++;
      n.push(ndcgAt(ranked, q.relevant, 10));
      r.push(recallAt(ranked, q.relevant, 20));
    }
    return { ndcg: n, recall: r, empty };
  };
  const mean = (x: number[]) => x.reduce((a, b) => a + b, 0) / Math.max(1, x.length);

  const grid: Settings[] = [];
  for (const entries of [1, 3, 5]) for (const floor of [0.05, 0.1, 0.2]) for (const cone of ["hide", "show"] as const) grid.push({ entries, floor, cone });
  const tune = (make: (s: Settings) => (q: (typeof queries)[number]) => string[]) =>
    grid.map((s) => ({ s, dev: mean(score(dev, make(s)).ndcg) })).sort((a, b) => b.dev - a.dev || a.s.entries - b.s.entries)[0];
  const bestLex = tune((s) => (q) => attentionRank(q, lexicalEntries(q, s), s.cone));
  const bestEmb = tune((s) => (q) => attentionRank(q, embeddingEntries(q, s), s.cone));

  const chosen = arms(bestLex.s, bestEmb.s);
  const results: Record<string, { ndcg10: number; recall20: number; empty: number }> = {};
  const raw: Record<string, ReturnType<typeof score>> = {};
  for (const [name, rank] of Object.entries(chosen)) {
    raw[name] = score(held, rank);
    results[name] = { ndcg10: mean(raw[name].ndcg), recall20: mean(raw[name].recall), empty: raw[name].empty };
  }
  const versus: Record<string, { ndcg10: ReturnType<typeof pairedInterval>; recall20: ReturnType<typeof pairedInterval> }> = {};
  for (const name of Object.keys(chosen).filter((n) => n !== "embedding"))
    versus[name] = {
      ndcg10: pairedInterval(raw[name].ndcg, raw.embedding.ndcg, `${name}-ndcg`),
      recall20: pairedInterval(raw[name].recall, raw.embedding.recall, `${name}-recall`),
    };

  const bench = { lexical_entry_ms: [] as number[], attention_ms: [] as number[] };
  for (let i = 0; i < 200; i++) {
    const q = queries[i % queries.length];
    const t0 = performance.now();
    const e = phraseEntries(q.text, index, { entries: bestLex.s.entries, floor: bestLex.s.floor });
    const t1 = performance.now();
    rankByAttention(snap, { entries: e, k: 20, cone: bestLex.s.cone });
    const t2 = performance.now();
    bench.lexical_entry_ms.push(t1 - t0);
    bench.attention_ms.push(t2 - t1);
  }
  const pct = (x: number[], p: number) => {
    const s = x.slice().sort((a, b) => a - b);
    return Math.round(s[Math.min(s.length - 1, Math.floor(p * s.length))] * 100) / 100;
  };
  const round = (x: number) => Math.round(x * 1000) / 1000;
  const report = {
    generated_at: new Date().toISOString(),
    ideas: ideas.length,
    atoms: atoms.length,
    queries: { candidates: candidates.length, used: queries.length, dev: dev.length, held_out: held.length },
    relevance: "idea nodes whose mapped Wikipedia article links to or from the source atom's article, the source and its near duplicates removed",
    near_duplicates: { title_similarity: NEAR_TITLE, embedding_cosine: NEAR_VECTOR, same_article: true },
    tuned_on_dev: { attention_lexical: { ...bestLex.s, ndcg10: round(bestLex.dev) }, attention_embedding_entry: { ...bestEmb.s, ndcg10: round(bestEmb.dev) } },
    held_out: Object.fromEntries(Object.entries(results).map(([k, v]) => [k, { ndcg10: round(v.ndcg10), recall20: round(v.recall20), empty: v.empty }])),
    versus_embedding: Object.fromEntries(
      Object.entries(versus).map(([k, v]) => [
        k,
        {
          ndcg10: { mean: round(v.ndcg10.mean), interval: v.ndcg10.interval.map(round) },
          recall20: { mean: round(v.recall20.mean), interval: v.recall20.interval.map(round) },
        },
      ]),
    ),
    bench_ms: {
      lexical_entry: { p50: pct(bench.lexical_entry_ms, 0.5), p95: pct(bench.lexical_entry_ms, 0.95) },
      attention: { p50: pct(bench.attention_ms, 0.5), p95: pct(bench.attention_ms, 0.95) },
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
