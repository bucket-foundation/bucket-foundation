import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { NextRequest } from "next/server";

process.env.BUCKET_ADVISOR_REVIEW = path.join(__dirname, "fixtures", "no-advisor-review.json");
delete process.env.BUCKET_ADVISOR_BUNDLE;
delete process.env.BUCKET_PRIME_DIRECTIONS;
delete process.env.BUCKET_GATEWAY_URL;
delete process.env.BUCKET_WALLET_PRIVATE_KEY;

const FIXTURE = path.join(__dirname, "fixtures", "canon-search-parity.json");
const UPDATE = process.env.CANON_PARITY_UPDATE === "1";
const MIN_CASES = 40;

type Params = Record<string, string>;
type Row = [string, number];
type Captured = Record<string, unknown>;
type Fixture = Record<string, Record<string, Captured>>;

const WORDS = [
  "entropy", "light", "water", "quantum", "mitochondria", "energy", "information", "consciousness", "gravity", "electron",
  "proton", "symmetry", "time", "field", "ENTROPY", "the", "of", "a", "x1", "dna",
];
const PHRASES = [
  "second law of thermodynamics", "speed of light", "structured water", "quantum field theory", "free energy principle",
  "electron transport chain", "information is physical", "black hole entropy", "wave function collapse", "natural selection",
  "light water magnetism", "what is life", "entropy entropy entropy", "energy-momentum", "c.elegans (worm)",
];
const NONSENSE = ["zzqxv", "asdfghjkl qwertyuiop", "!!!", "   ", "a b c", "💡", "\\b[.*", "x".repeat(260), `entropy ${"y".repeat(220)} light`];
const BRANCHES = ["01-mathematics", "02-physics", "05-biophysics", "07-mind", "99-nowhere"];

function vec(dim: number, seed: number): string {
  const v = new Float32Array(dim);
  for (let i = 0; i < dim; i++) v[i] = Math.sin(seed + i * 0.37);
  return Buffer.from(v.buffer).toString("base64");
}

function urlCases(): Params[] {
  const out: Params[] = [{}, { q: "" }];
  for (const q of [...WORDS, ...PHRASES, ...NONSENSE]) out.push({ q });
  for (const branch of BRANCHES) {
    out.push({ q: "energy", branch });
    out.push({ q: "light water", branch, top_k: "5" });
  }
  for (const top_k of ["1", "2", "10", "49", "50", "51", "500", "0", "-3", "zz", "7.9", ""]) out.push({ q: "energy light", top_k });
  for (const mode of ["semantic", "lexical", "hybrid", "SEMANTIC"]) out.push({ q: "entropy", mode });
  out.push({ q: "entropy", tier: "Core" });
  out.push({ qvec: vec(384, 1) });
  out.push({ qvec: vec(384, 2), top_k: "50" });
  out.push({ q: "entropy", qvec: vec(384, 3), branch: "02-physics" });
  out.push({ q: "entropy", qvec: vec(768, 4) });
  out.push({ q: "entropy", qvec: "not-base64!" });
  out.push({ qvec: "AAAA" });
  out.push({ qvec: vec(384, 5), mode: "semantic", top_k: "3" });
  return out;
}

function exploreCases(): Params[] {
  return [
    ...urlCases(),
    { q: "entropy", types: "excerpt" },
    { q: "entropy", types: "advisor,work" },
    { q: "light", types: "paper,text,talk" },
    { q: "light", types: "bogus" },
  ];
}

function retrieverCases(): { query: string; topK?: number }[] {
  const out: { query: string; topK?: number }[] = [...WORDS, ...PHRASES, ...NONSENSE, ""].map((query) => ({ query }));
  for (const topK of [0, 1, 2, 10, 24, 50, 5000]) out.push({ query: "energy light", topK });
  return out;
}

function researchCases(): Params[] {
  const out: Params[] = [...WORDS, ...PHRASES, ...NONSENSE].map((q) => ({ q }));
  for (const tier of ["raw", "query", "insight"]) out.push({ q: "structured water", tier });
  return out;
}

function mcpCases(): Record<string, unknown>[] {
  const out: Record<string, unknown>[] = [{}, { q: "" }];
  for (const q of [...WORDS, ...PHRASES, ...NONSENSE]) out.push({ q });
  for (const branch of BRANCHES) out.push({ q: "energy", branch }, { q: "light water", branch, top_k: 5 });
  for (const top_k of [1, 2, 10, 50, 51, 500, 0, -3, "7", "zz", 7.9]) out.push({ q: "energy light", top_k });
  return out;
}

function href(base: string, p: Params): string {
  const u = new URL(base);
  for (const [k, v] of Object.entries(p)) u.searchParams.set(k, v);
  return u.toString();
}

async function captureCanonRoute(p: Params): Promise<Captured> {
  const { GET } = await import("../src/app/api/canon/search/route");
  const res = await GET(new NextRequest(href("http://x/api/canon/search", p)));
  const body = JSON.parse(await res.text());
  if (res.status !== 200) return { status: res.status, error: body.error };
  return {
    status: res.status,
    query: body.query,
    top_k: body.top_k,
    mode: body.mode,
    n_results: body.n_results,
    results: body.results.map((r: { claim_id: number; concept: string; slug: string; score: number }): Row => [`${r.claim_id}:${r.concept}/${r.slug}`, r.score]),
  };
}

async function captureExploreRoute(p: Params): Promise<Captured> {
  const { GET } = await import("../src/app/api/explore/search/route");
  const res = await GET(new NextRequest(href("http://x/api/explore/search", p)));
  const body = JSON.parse(await res.text());
  if (res.status !== 200) return { status: res.status, error: body.error };
  return {
    status: res.status,
    query: body.query,
    top_k: body.top_k,
    mode: body.mode,
    n_results: body.n_results,
    results: body.results.map((r: { id: string; score: number }): Row => [r.id, r.score]),
  };
}

async function captureRetriever(c: { query: string; topK?: number }): Promise<Captured> {
  const { retrieveCanon } = await import("../src/app/api/research-agent/retrievers");
  const r = c.topK === undefined ? retrieveCanon(c.query) : retrieveCanon(c.query, c.topK);
  return {
    log: r.log,
    results: r.sources.map((s): Row => [s.id, s.meta?.overlap_score as number]),
  };
}

async function captureResearchRoute(p: Params): Promise<Captured> {
  const { GET } = await import("../src/app/api/research/route");
  const res = await GET(new NextRequest(href("http://x/api/research", p)));
  const body = JSON.parse(await res.text());
  const rows = (list: { source_id: string; score: number }[] | undefined): Row[] => (list ?? []).map((e) => [e.source_id, e.score]);
  return {
    status: res.status,
    source: res.headers.get("x-bucket-source"),
    citation: body.citation?.source_id ?? null,
    canon_tier: body.canon_tier ?? null,
    foundation_branches: body.foundation_branches ?? null,
    answer: body.data?.answer ?? null,
    evidence: rows(body.data?.evidence),
    supporting_candidates: rows(body.data?.supporting_candidates),
  };
}

async function captureMcp(args: Record<string, unknown>): Promise<Captured> {
  const { handleMessage } = await import("../src/lib/mcp/server");
  const r = (await handleMessage({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "canon_search", arguments: args } })) as {
    result: { isError: boolean; structuredContent: { ok: boolean; error?: string; query?: string; mode?: string; n_results?: number; results?: { claim_id: number; concept: string; slug: string; score: number }[] } };
  };
  const s = r.result.structuredContent;
  if (!s.ok) return { isError: r.result.isError, error: s.error };
  return {
    isError: r.result.isError,
    query: s.query,
    mode: s.mode,
    n_results: s.n_results,
    results: (s.results ?? []).map((x): Row => [`${x.claim_id}:${x.concept}/${x.slug}`, x.score]),
  };
}

async function captureAll(): Promise<Fixture> {
  const out: Fixture = {};
  const run = async <C>(name: string, cases: C[], fn: (c: C) => Promise<Captured>) => {
    out[name] = {};
    for (const c of cases) out[name][JSON.stringify(c)] = await fn(c);
  };
  await run("api/canon/search", urlCases(), captureCanonRoute);
  await run("api/explore/search", exploreCases(), captureExploreRoute);
  await run("research-agent/retrieveCanon", retrieverCases(), captureRetriever);
  await run("api/research", researchCases(), captureResearchRoute);
  await run("mcp/canon_search", mcpCases(), captureMcp);
  return out;
}

function serialize(f: Fixture): string {
  const entries = Object.entries(f).map(([entry, cases]) => {
    const rows = Object.entries(cases).map(([key, value]) => `  ${JSON.stringify(key)}: ${JSON.stringify(value)}`);
    return ` ${JSON.stringify(entry)}: {\n${rows.join(",\n")}\n }`;
  });
  return `{\n${entries.join(",\n")}\n}\n`;
}

test("every canon search entry point returns the recorded ids, order and scores", async () => {
  const live = JSON.parse(JSON.stringify(await captureAll())) as Fixture;
  if (UPDATE) {
    fs.writeFileSync(FIXTURE, serialize(live));
    return;
  }
  const golden = JSON.parse(fs.readFileSync(FIXTURE, "utf8")) as Fixture;
  assert.deepEqual(Object.keys(live), Object.keys(golden));
  for (const [entry, cases] of Object.entries(golden)) {
    assert.ok(Object.keys(cases).length >= MIN_CASES, `${entry} has fewer than ${MIN_CASES} recorded queries`);
    assert.deepEqual(Object.keys(live[entry]), Object.keys(cases), `${entry} case list drifted`);
    for (const [key, want] of Object.entries(cases)) assert.deepEqual(live[entry][key], want, `${entry} ${key}`);
  }
});

test("the fixture records ranked hits, so an empty index cannot pass", () => {
  const golden = JSON.parse(fs.readFileSync(FIXTURE, "utf8")) as Fixture;
  for (const [entry, cases] of Object.entries(golden)) {
    const withHits = Object.values(cases).filter((c) => Array.isArray(c.results ?? c.supporting_candidates) && ((c.results ?? c.supporting_candidates) as Row[]).length > 0);
    assert.ok(withHits.length >= 20, `${entry} recorded hits for only ${withHits.length} queries`);
  }
});
