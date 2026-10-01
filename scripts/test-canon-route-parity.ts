import test from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { GET } from "../src/app/api/canon/search/route";
import { canonSearch, parseCanonSearchParams } from "../src/lib/canon-search";

type Params = Record<string, string>;
type Outcome = { status: number; mode: string | null; top_k: number | null; hits: [number, number][] };

const QUERIES = [
  "entropy", "light", "water", "quantum", "mitochondria", "energy", "information", "consciousness", "gravity", "electron",
  "ENTROPY", "the", "of", "x1", "dna", "second law of thermodynamics", "speed of light", "structured water",
  "free energy principle", "energy-momentum", "c.elegans (worm)", "zzqxv", "!!!", "a b c", "\\b[.*",
];
const BRANCHES = ["01-mathematics", "02-physics", "05-biophysics", "07-mind", "99-nowhere"];
const LONG_Q = `entropy ${"y".repeat(220)} light`;

function vec(dim: number, seed: number): string {
  const v = new Float32Array(dim);
  for (let i = 0; i < dim; i++) v[i] = Math.sin(seed + i * 0.37);
  return Buffer.from(v.buffer).toString("base64");
}

function cases(): Params[] {
  const out: Params[] = [{}, { q: "" }, ...QUERIES.map((q) => ({ q }))];
  for (const branch of BRANCHES) out.push({ q: "energy", branch }, { q: "light water", branch, top_k: "5" });
  for (const top_k of ["1", "2", "10", "49", "50", "51", "500", "0", "-3", "7.9", ""]) out.push({ q: "energy light", top_k });
  for (const mode of ["semantic", "lexical", "hybrid", "SEMANTIC"]) out.push({ q: "entropy", mode });
  out.push({ qvec: vec(384, 1) }, { q: "entropy", qvec: vec(384, 3), branch: "02-physics" }, { q: "entropy", qvec: vec(768, 4) }, { q: "entropy", qvec: "not-base64!" }, { qvec: "AAAA" });
  return out;
}

function url(p: Params): URL {
  const u = new URL("http://x/api/canon/search");
  for (const [k, v] of Object.entries(p)) u.searchParams.set(k, v);
  return u;
}

async function viaRoute(p: Params): Promise<Outcome> {
  const res = await GET(new NextRequest(url(p).toString()));
  const body = JSON.parse(await res.text());
  if (res.status !== 200) return { status: res.status, mode: null, top_k: null, hits: [] };
  return { status: 200, mode: body.mode, top_k: body.top_k, hits: body.results.map((r: { claim_id: number; score: number }) => [r.claim_id, r.score]) };
}

function viaCanonSearch(p: Params): Outcome {
  const params = parseCanonSearchParams(url(p), 10);
  const found = canonSearch(params);
  if (!found.ok) return { status: found.status, mode: null, top_k: null, hits: [] };
  return { status: 200, mode: found.mode, top_k: params.topK, hits: found.results.map((r) => [r.entry.rowid, r.score]) };
}

test("the pinned canon route and canonSearch return the same ids, order and scores", async () => {
  const all = cases();
  assert.ok(all.length >= 50);
  let withHits = 0;
  for (const p of all) {
    const route = await viaRoute(p);
    assert.deepEqual(route, viaCanonSearch(p), JSON.stringify(p));
    if (route.hits.length) withHits++;
  }
  assert.ok(withHits >= 30, `only ${withHits} cases returned hits`);
});

test("a query over 200 characters: the route ranks all of it, canonSearch ranks the first 200", async () => {
  const route = await viaRoute({ q: LONG_Q });
  const lib = viaCanonSearch({ q: LONG_Q });
  assert.equal(parseCanonSearchParams(url({ q: LONG_Q }), 10).q.length, 200);
  assert.deepEqual(route.hits, (await viaRoute({ q: "entropy light" })).hits);
  assert.deepEqual(lib.hits, (await viaRoute({ q: "entropy" })).hits);
  assert.notDeepEqual(route.hits, lib.hits);
});

test("a non-numeric top_k: the route returns nothing with top_k null, canonSearch uses the default", async () => {
  const p = { q: "energy light", top_k: "zz" };
  assert.deepEqual(await viaRoute(p), { status: 200, mode: "lexical", top_k: null, hits: [] });
  const lib = viaCanonSearch(p);
  assert.equal(lib.top_k, 10);
  assert.equal(lib.hits.length, 10);
  assert.deepEqual(lib, viaCanonSearch({ q: "energy light" }));
});
