import { Database } from "bun:sqlite";
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { CanonStore, syncCanon } from "../src/canon";
import { exploreRoutes, ExploreStore, SavedStore, syncExplore } from "../src/explore";
import { buildCanonPack } from "../src/pack/canon";
import { buildExplorePack } from "../src/pack/explore";
import { rankCanon, type ClaimIndexEntry } from "../../../src/lib/canon-rank";
import { CANON_FILES, canonFileHits } from "../../../src/lib/explore/canon-files";
import { FOUNDING_ROWS, foundingFor } from "../../../src/lib/explore/founding";
import { buildCorpus, needsClosest, rankedPools, semanticExcerpts } from "../../../src/lib/explore/ranked-core";
import { exploreSearch, type ExploreSearchDeps } from "../../../src/lib/explore/respond";
import { EMPTY_SAVED, SAVED_KEY } from "../../../src/lib/explore/saved";
import { prepare } from "../../../src/lib/explore/source-index";

const REPO = resolve(import.meta.dir, "../../..");
const canonPack = buildCanonPack(REPO);
const pack = buildExplorePack(REPO);
const EVAL = JSON.parse(readFileSync(resolve(REPO, "scripts/fixtures/explore-eval.draft.json"), "utf8")) as { queries: { query: string }[] };
const QUERIES = EVAL.queries.map((q) => q.query).slice(0, 20);
const PRODUCTION = { NODE_ENV: "production" };

function db(): Database {
  const d = new Database(":memory:");
  d.run("create table meta (k text primary key, v text not null)");
  syncCanon(d, canonPack);
  syncExplore(d, pack);
  return d;
}

function siteDeps(): ExploreSearchDeps {
  const entries: ClaimIndexEntry[] = canonPack.excerpts.map((e) => ({ rowid: e.rowid, branch: e.branch, concept: e.concept, slug: e.slug, title: e.title, text: e.text, path: e.path, vec: new Float32Array(0) }));
  const pool = prepare({ v: 1, items: pack.sources.map(([kind, id, title, year, by]) => [kind, id, title, year, "", by]) });
  const talk = (f: string) => pack.talks[f] ?? null;
  const corpus = buildCorpus({ rows: pool.map((p) => p.row), entries, files: CANON_FILES, talk });
  return {
    canon: (p) => rankCanon({ loadIndex: () => entries, decodeQVec: () => null }, { ...p, qvec: null }),
    advisors: () => ({ sources: [], sample: false, origin: "none", axes: [] }),
    sources: () => pool,
    yearOf: (concept) => pack.years[concept] ?? null,
    canonFiles: (q) => canonFileHits(q),
    ranking: { corpus: async () => corpus, founding: (q) => foundingFor(q, PRODUCTION), talkFor: talk, rankedPools, semanticExcerpts, needsClosest },
  };
}

type Body = { results: { id: string }[]; pinned: unknown; closest: boolean };

async function top10(route: (u: URL) => Promise<Body>, q: string): Promise<string[]> {
  return (await route(new URL(`http://x.test/search?q=${encodeURIComponent(q)}&top_k=40`))).results.slice(0, 10).map((h) => h.id);
}

describe("explore ranking parity", () => {
  test("the desktop route returns the site route's top 10 for 20 queries over the same pack", async () => {
    expect(QUERIES.length).toBe(20);
    const d = db();
    const local = exploreRoutes(new ExploreStore(d), new CanonStore(d))["GET /local/explore/search"];
    const site = siteDeps();
    const desk = async (u: URL) => (await (await local(new Request(u), u)).json()) as Body;
    const web = async (u: URL) => (await exploreSearch(site, u)).body as Body;
    const misses: string[] = [];
    const empty: string[] = [];
    for (const q of QUERIES) {
      const [a, b] = [await top10(desk, q), await top10(web, q)];
      if (a.length === 0) empty.push(q);
      if (JSON.stringify(a) !== JSON.stringify(b)) misses.push(q);
    }
    expect(misses).toEqual([]);
    expect(empty.length).toBeLessThan(5);
  });

  test("the founding card follows the production rule: unapproved rows never pin", async () => {
    const d = db();
    const store = new ExploreStore(d);
    expect(store.foundingWorks().length).toBe(pack.counts.foundingWorks.approved);
    const local = exploreRoutes(store, new CanonStore(d))["GET /local/explore/search"];
    for (const row of FOUNDING_ROWS.slice(0, 10)) {
      const u = new URL(`http://x.test/search?q=${encodeURIComponent(row.concept)}`);
      const body = (await (await local(new Request(u), u)).json()) as Body;
      const site = foundingFor(row.concept, PRODUCTION);
      expect([row.concept, body.pinned]).toEqual([row.concept, site ? site.card : null]);
    }
  });
});

describe("saved list in the local store", () => {
  const item = { id: "paper:d/10.1002/j.1538-7305.1948.tb01338.x", kind: "paper", title: "A Mathematical Theory of Communication", authors: "C. E. Shannon", year: 1948, citation: "C. E. Shannon. A Mathematical Theory of Communication. 1948.", url: "https://doi.org/10.1002/j.1538-7305.1948.tb01338.x", savedAt: "2026-10-01T00:00:00.000Z" };

  test("starts empty, keeps a written list, and refuses a damaged one", async () => {
    const d = db();
    const routes = exploreRoutes(new ExploreStore(d), new CanonStore(d));
    const get = async () => (await routes["GET /local/explore/saved"](new Request("http://x.test/"), new URL("http://x.test/"))).json();
    const post = (body: string) => routes["POST /local/explore/saved"](new Request("http://x.test/", { method: "POST", body }), new URL("http://x.test/"));
    expect(await get()).toEqual(EMPTY_SAVED);
    expect((await post(JSON.stringify({ v: 1, items: [item], noticeSeen: true }))).status).toBe(200);
    expect(await get()).toEqual({ v: 1, items: [item], noticeSeen: true });
    expect((await post("{not json")).status).toBe(400);
    expect((await post(JSON.stringify({ v: 2, items: [] }))).status).toBe(400);
    expect(await get()).toEqual({ v: 1, items: [item], noticeSeen: true });
    expect(new SavedStore(d).get().items.length).toBe(1);
    expect(SAVED_KEY).toBe("bucket.explore.saved.v1");
  });

  test("a new explore pack version leaves the saved list in place", async () => {
    const d = db();
    new SavedStore(d).put(JSON.stringify({ v: 1, items: [item], noticeSeen: false }));
    syncExplore(d, { ...pack, version: "000000000000" });
    expect(new SavedStore(d).get().items.map((i) => i.id)).toEqual([item.id]);
  });
});
