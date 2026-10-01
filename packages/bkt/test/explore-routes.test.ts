import { Database } from "bun:sqlite";
import { afterEach, describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { CanonStore, syncCanon } from "../src/canon";
import { EXPLORE_META_KEY, exploreRoutes, ExploreStore, NO_ADVISORS, syncExplore } from "../src/explore";
import { buildCanonPack } from "../src/pack/canon";
import { buildExplorePack } from "../src/pack/explore";
import { startServe, type Serve } from "../src/serve";
import { readCanonClaims } from "../../../src/lib/canon-index-loader";
import { rankCanon, type ClaimIndexEntry } from "../../../src/lib/canon-rank";
import { loadAdvisors } from "../../../src/lib/explore/advisors";
import { canonFileHits } from "../../../src/lib/explore/canon-files";
import { exploreSearch, type ExploreSearchDeps } from "../../../src/lib/explore/respond";
import { loadSourceIndex, resetSourceIndex } from "../../../src/lib/explore/sources";
import timeline from "../../../src/data/canon-timeline.json";

const REPO = resolve(import.meta.dir, "../../..");
const canonPack = buildCanonPack(REPO);
const pack = buildExplorePack(REPO);
const ME = 4242;
let peerUid = ME;
let s: Serve | null = null;

function freshDb(): Database {
  const db = new Database(":memory:");
  db.run("create table meta (k text primary key, v text not null)");
  return db;
}

function boot(db = freshDb()) {
  syncCanon(db, canonPack);
  syncExplore(db, pack);
  peerUid = ME;
  s = startServe({ uid: ME, resolvePeerUid: () => peerUid, routes: exploreRoutes(new ExploreStore(db), new CanonStore(db)) });
  return s;
}

afterEach(() => {
  s?.stop();
  s = null;
});

const host = () => `127.0.0.1:${s!.port}`;

function req(path: string, init: RequestInit & { headers?: Record<string, string> } = {}) {
  return fetch(`http://${host()}${path}`, { ...init, headers: { host: host(), ...init.headers } });
}

async function token(): Promise<string> {
  const page = await (await req("/")).text();
  const nonce = page.match(/"nonce":"([A-Za-z0-9_-]+)"/)![1];
  const r = await req("/session", { method: "POST", headers: { origin: `http://${host()}`, "content-type": "application/json" }, body: JSON.stringify({ nonce }) });
  return ((await r.json()) as { token: string }).token;
}

const auth = (t: string) => ({ authorization: `Bucket ${t}` });

type Shape = { [key: string]: Shape } | string;

function shape(v: unknown): Shape {
  if (v === null) return "null";
  if (Array.isArray(v)) return { "[]": merge(v.map(shape)) };
  if (typeof v === "object") return Object.fromEntries(Object.entries(v).sort(([a], [b]) => (a < b ? -1 : 1)).map(([k, x]) => [k, shape(x)]));
  return typeof v;
}

function merge(shapes: Shape[]): Shape {
  const names = new Set<string>();
  const fields: Record<string, Shape[]> = {};
  for (const s of shapes) {
    if (typeof s === "string") names.add(s);
    else for (const [k, x] of Object.entries(s)) (fields[k] ??= []).push(x);
  }
  const keys = Object.keys(fields).sort();
  if (!keys.length) return [...names].sort().join("|");
  const out: Record<string, Shape> = Object.fromEntries(keys.map((k) => [k, merge(fields[k])]));
  if (names.size) out["|"] = [...names].sort().join("|");
  return out;
}

const YEARS = new Map<string, number>(timeline.events.map((e: { id: string; year: number }) => [e.id, e.year]));

function webDeps(): ExploreSearchDeps {
  const index: ClaimIndexEntry[] = readCanonClaims(REPO).map((c, rowid) => ({ rowid, branch: c.branch, concept: c.concept, slug: c.slug, title: c.title, path: c.path, text: c.text, vec: new Float32Array(0) }));
  resetSourceIndex();
  return {
    canon: (p) => rankCanon({ loadIndex: () => index, decodeQVec: () => null }, p),
    advisors: () => loadAdvisors({ NODE_ENV: "production", BUCKET_ADVISOR_BUNDLE: join(REPO, "no-such-bundle.json") }),
    sources: () => loadSourceIndex(join(REPO, "src", "data")),
    yearOf: (concept) => YEARS.get(concept) ?? null,
    canonFiles: (query) => canonFileHits(query),
  };
}

interface Body {
  query: string | null;
  top_k: number;
  mode: string;
  n_results: number;
  advisors_sample: boolean;
  advisors_source: string;
  results: { id: string; type: string; title: string; text: string; url: string | null; score: number; links: string[]; license?: string; source?: string }[];
  took_ms: number;
}

describe("explore tables", () => {
  test("the pack loads once per version and reloads when the version changes", () => {
    const db = freshDb();
    expect(syncExplore(db, pack)).toBe(true);
    expect(syncExplore(db, pack)).toBe(false);
    const store = new ExploreStore(db);
    expect(store.version()).toBe(pack.version);
    expect(store.pool().length).toBe(pack.sources.length);
    expect(store.pool()[0].row).toEqual([pack.sources[0][0], pack.sources[0][1], pack.sources[0][2], pack.sources[0][3], "", pack.sources[0][4]]);
    expect(store.licences()).toEqual(pack.licences);
    expect(store.foundingWorks()).toEqual(pack.foundingWorks);
    expect(store.referenceBasis()!.vocab.length).toBe(pack.referenceBasis.vocab.length);
    expect(store.yearOf(Object.keys(pack.years)[0])).toBe(Object.values(pack.years)[0]);
    expect(store.yearOf("no-such-concept")).toBeNull();
    expect(syncExplore(db, { ...pack, version: "000000000000", sources: pack.sources.slice(0, 3) })).toBe(true);
    expect(new ExploreStore(db).pool().length).toBe(3);
    expect(db.query<{ v: string }, [string]>("select v from meta where k = ?").get(EXPLORE_META_KEY)!.v).toBe("000000000000");
  });

  test("a store with no pack loaded returns nothing", () => {
    const store = new ExploreStore(freshDb());
    expect(store.pool()).toEqual([]);
    expect(store.licences()).toEqual([]);
    expect(store.foundingWorks()).toBeNull();
    expect(store.referenceBasis()).toBeNull();
    expect(store.yearOf("light")).toBeNull();
  });
});

describe("GET /local/explore/search", () => {
  test("is refused without the token, with a wrong token, and for another user's process", async () => {
    boot();
    expect((await req("/local/explore/search?q=entropy")).status).toBe(401);
    expect((await req("/local/explore/search?q=entropy", { headers: { authorization: `Bucket ${"x".repeat(43)}` } })).status).toBe(401);
    expect((await req("/local/explore/search?q=entropy", { headers: { host: "evil.example" } })).status).toBe(403);
    peerUid = ME + 1;
    expect((await req("/")).status).toBe(403);
  });

  test("returns excerpts, works, papers, texts and talks from the pack, each source with a link and a licence", async () => {
    boot();
    const t = await token();
    const r = await req("/local/explore/search?q=energy&top_k=50", { headers: auth(t) });
    expect(r.status).toBe(200);
    expect(r.headers.get("cache-control")).toBe("no-store");
    const body = (await r.json()) as Body;
    expect(body.query).toBe("energy");
    expect(body.mode).toBe("lexical");
    expect(body.n_results).toBe(body.results.length);
    expect(body.results.map((h) => h.score)).toEqual([...body.results.map((h) => h.score)].sort((a, b) => b - a));
    const types = new Set(body.results.map((h) => h.type));
    expect([...types].sort()).toEqual(["canon-file", "excerpt", "paper", "talk", "text", "work"]);
    const sources = body.results.filter((h) => ["paper", "text", "talk"].includes(h.type));
    expect(sources.filter((h) => !/^https:\/\//.test(h.url ?? "") || !h.license || !h.source || h.text !== "")).toEqual([]);
    const kept = new Set(pack.sources.map((x) => `${x[0]}/${x[1]}`));
    expect(sources.filter((h) => !kept.has(h.id.slice(h.id.indexOf(":") + 1)))).toEqual([]);
    const only = (await (await req("/local/explore/search?q=entropy&types=paper", { headers: auth(t) })).json()) as Body;
    expect(only.results.length).toBeGreaterThan(0);
    expect(only.results.every((h) => h.type === "paper")).toBe(true);
    const shannon = (await (await req("/local/explore/search?q=mathematical%20theory%20of%20communication&types=paper", { headers: auth(t) })).json()) as Body;
    expect(shannon.results[0].url).toBe("https://doi.org/10.1002/j.1538-7305.1948.tb01338.x");
    const missing = await req("/local/explore/search", { headers: auth(t) });
    expect(missing.status).toBe(400);
    expect(((await missing.json()) as { error: { code: string } }).error.code).toBe("missing_q");
  });

  test("serves no advisor, sample or real, in results or on the map", async () => {
    boot();
    const t = await token();
    expect(NO_ADVISORS).toEqual({ sources: [], sample: false, origin: "none", axes: [] });
    for (const q of ["entropy", "sample advisor biophysics", "mitochondria light water", "physics"]) {
      const body = (await (await req(`/local/explore/search?q=${encodeURIComponent(q)}&top_k=50`, { headers: auth(t) })).json()) as Body;
      expect(body.advisors_sample).toBe(false);
      expect(body.advisors_source).toBe("none");
      expect(body.results.filter((h) => h.type === "advisor" || h.id.startsWith("advisor:") || h.links.some((l) => l.startsWith("advisor:")))).toEqual([]);
    }
    const map = await (await req("/local/explore/search?map=1", { headers: auth(t) })).json();
    expect(map).toEqual({ advisors_sample: false, advisors_source: "none", axes_split: false, axes: [], advisors: [] });
  });

  test("the app's code path never imports the advisor loader or its sample files", () => {
    const seen: string[] = [];
    const queue = [resolve(import.meta.dir, "../src/explore.ts")];
    while (queue.length) {
      const file = queue.pop() as string;
      if (seen.includes(file)) continue;
      seen.push(file);
      if (!file.endsWith(".ts")) continue;
      for (const m of readFileSync(file, "utf8").matchAll(/^(?:import|export)\s+(?!type\s)[^;]*?from\s+["']([^"']+)["']/gm)) {
        if (m[1].startsWith(".")) queue.push(m[1].endsWith(".json") ? join(dirname(file), m[1]) : `${join(dirname(file), m[1])}.ts`);
      }
    }
    const lib = seen.filter((f) => f.includes("/src/lib/"));
    expect(lib.some((f) => f.endsWith("/explore/respond.ts"))).toBe(true);
    expect(lib.some((f) => f.endsWith("/explore/source-index.ts"))).toBe(true);
    expect(seen.filter((f) => /advisors|sample/.test(f))).toEqual([]);
    for (const f of lib.filter((x) => x.endsWith(".ts"))) expect([f, /from\s+["'](?:node:)?(?:fs|path|os)["']/.test(readFileSync(f, "utf8"))]).toEqual([f, false]);
  });

  test("one query yields the same field names and types from the web assembly and the local route", async () => {
    boot();
    const t = await token();
    const q = "?q=energy&top_k=50";
    const local = await req(`/local/explore/search${q}`, { headers: auth(t) });
    const web = await exploreSearch(webDeps(), new URL(`http://site.test/api/explore/search${q}`));
    expect(web.status).toBe(200);
    const webBody = web.body as Body;
    const localBody = (await local.json()) as Body;
    expect(webBody.advisors_source).toBe("none");
    for (const type of ["excerpt", "work", "paper", "talk", "text", "canon-file"]) {
      expect(webBody.results.some((h) => h.type === type)).toBe(true);
      expect(localBody.results.some((h) => h.type === type)).toBe(true);
    }
    expect(shape(localBody)).toEqual(shape(webBody));
    const webMap = await exploreSearch(webDeps(), new URL("http://site.test/api/explore/search?map=1"));
    expect(shape(await (await req("/local/explore/search?map=1", { headers: auth(t) })).json())).toEqual(shape(webMap.body));
    const webErr = await exploreSearch(webDeps(), new URL("http://site.test/api/explore/search"));
    const localErr = await req("/local/explore/search", { headers: auth(t) });
    expect(localErr.status).toBe(webErr.status);
    expect(shape(await localErr.json())).toEqual(shape(webErr.body));
  });
});
