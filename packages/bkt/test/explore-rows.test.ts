import { Database } from "bun:sqlite";
import { afterEach, beforeAll, describe, expect, test } from "bun:test";
import { resolve } from "node:path";
import { CanonStore } from "../src/canon";
import { dataRoutes, rowSetAdapter } from "../src/data";
import { exploreRoutes, ExploreStore, ROWS_META_KEY, rowSetReply, RowSetStore, syncRowSets } from "../src/explore";
import { assembleRowSet, checkRows, hitIds, packedBytes, REPLY_BYTES, REPLY_HITS, rowKeys, type PackedRows, type RowDraft } from "../src/pack/row-sets/contract";
import { assembleRowSetPack, buildRowSetPack, repoContext, type RowSetPack } from "../src/pack/row-sets/index";
import { buildDenylist } from "../src/pack/rights";
import { fixtureContext, fixtureDraft } from "../src/pack/row-sets/test-fixtures";
import { startServe, type Serve } from "../src/serve";

const REPO = resolve(import.meta.dir, "../../..");
const deny = buildDenylist(REPO);
const ME = 4242;
let pack: RowSetPack;
let s: Serve | null = null;

beforeAll(async () => {
  pack = await buildRowSetPack(REPO, deny);
}, 120_000);

afterEach(() => {
  s?.stop();
  s = null;
});

function freshDb(): Database {
  const db = new Database(":memory:");
  db.run("create table meta (k text primary key, v text not null)");
  return db;
}

function boot(sets: Pick<RowSetPack, "version" | "sets"> | null = pack, db = freshDb()) {
  syncRowSets(db, sets);
  s = startServe({ uid: ME, resolvePeerUid: () => ME, routes: exploreRoutes(new ExploreStore(db), new CanonStore(db)) });
  return db;
}

const host = () => `127.0.0.1:${s!.port}`;
const req = (path: string, headers: Record<string, string> = {}) => fetch(`http://${host()}${path}`, { headers: { host: host(), ...headers } });

async function token(): Promise<string> {
  const page = await (await req("/")).text();
  const nonce = page.match(/"nonce":"([A-Za-z0-9_-]+)"/)![1];
  const r = await fetch(`http://${host()}/session`, { method: "POST", headers: { host: host(), origin: `http://${host()}`, "content-type": "application/json" }, body: JSON.stringify({ nonce }) });
  return ((await r.json()) as { token: string }).token;
}

async function rows(t: string, query: string): Promise<{ status: number; body: PackedRows & { datasets?: { id: string; label: string }[]; error?: string }; bytes: number }> {
  const r = await req(`/local/explore/rows${query}`, { authorization: `Bucket ${t}` });
  const text = await r.text();
  return { status: r.status, body: JSON.parse(text), bytes: Buffer.byteLength(text) };
}

const chain = (n: number): RowDraft[] => Array.from({ length: n }, (_, i) => ({
  key: `course-${String(i).padStart(4, "0")}`, title: i % 2 ? `Algebra course ${i}` : `Geometry course ${i}`, sub: "", group: "a", source: "open",
  links: [i + 1, i + 300].filter((to) => to < n).map((to) => ({ to: `course-${String(to).padStart(4, "0")}`, weight: 1, stated: to === i + 1 })),
}));

function fixturePack(): RowSetPack {
  const ctx = fixtureContext();
  return assembleRowSetPack([assembleRowSet([fixtureDraft({ id: "long-chain", label: "Long chain", rows: chain(886) })], ctx), assembleRowSet([fixtureDraft()], ctx)], deny, "fixture");
}

describe("the row set route", () => {
  test("refuses a caller with no token", async () => {
    boot();
    expect((await req("/local/explore/rows")).status).toBe(401);
    expect((await req("/local/explore/rows?id=major-to-career", { authorization: `Bucket ${"x".repeat(43)}` })).status).toBe(401);
  });

  test("lists the sets of this build in the shape the data set picker reads", async () => {
    boot();
    const t = await token();
    const list = await rows(t, "");
    expect(list.status).toBe(200);
    const listed = list.body as unknown as { datasets: unknown; aliases: Record<string, string> };
    expect(Object.keys(listed.aliases)).toHaveLength(30);
    expect(listed.datasets).toEqual([{ id: "occupations-time", label: "Occupations through time" }, { id: "major-to-career", label: "Major to career" }, { id: "mathematics-chain", label: "School mathematics chain" }, { id: "technology-waves", label: "Technology waves" }, { id: "education-by-country", label: "Education by country" }, { id: "coverage-by-country", label: "Corpus coverage by country" }]);
  });

  test("a build with no row set pack lists nothing and knows no set", async () => {
    boot(null);
    const t = await token();
    expect((await rows(t, "")).body as unknown).toEqual({ datasets: [], aliases: {} });
    expect((await rows(t, "?id=major-to-career")).status).toBe(404);
    s?.stop();
    boot({ version: "empty", sets: [] });
    expect((await rows(await token(), "")).body as unknown).toEqual({ datasets: [], aliases: {} });
  });

  test("answers 400 on a bad id, group or page and 404 on an unknown id", async () => {
    boot();
    const t = await token();
    for (const q of ["?id=Major", "?id=a_b", "?id=..%2Fetc", "?id=", `?id=${"a".repeat(65)}`, "?id=major-to-career&group=soc-11", "?id=occupations-time&group=nope", "?id=occupations-time&group=histocc-life-soc-11-1011", "?id=major-to-career&page=1", "?id=major-to-career&page=-1", "?id=major-to-career&page=x", "?id=major-to-career&page=1.5", "?id=occupations-time&group=soc-11&page=1"]) {
      const r = await rows(t, q);
      expect([q, r.status, r.body.error]).toEqual([q, 400, "bad_request"]);
    }
    const unknown = await rows(t, "?id=progression");
    expect([unknown.status, unknown.body as unknown]).toEqual([404, { error: "not_found" }]);
    expect((await rows(t, "?id=edtech-market")).status).toBe(404);
  });

  test("a set answers with one packed page that passes the nine rules", async () => {
    boot();
    const t = await token();
    const ctx = await repoContext(REPO);
    const flow = await rows(t, "?id=major-to-career");
    expect(flow.status).toBe(200);
    expect([flow.body.n, flow.body.total, flow.body.page, flow.body.cut]).toEqual([64, 64, 0, 0]);
    expect(flow.body.links.flat()).toHaveLength(240);
    checkRows(flow.body, ctx);
    const chainSet = await rows(t, "?id=mathematics-chain");
    expect([chainSet.body.n, chainSet.body.links.flat().length]).toEqual([65, 147]);
    expect(chainSet.body.frame.edgeStated?.flat().filter(Boolean)).toHaveLength(112);
    checkRows(chainSet.body, ctx);
    const domain = await rows(t, "?id=mathematics-chain&group=school-ccss-math-5-nbt");
    expect(domain.status).toBe(200);
    expect(domain.body.title.every((title) => title.startsWith("5.NBT."))).toBe(true);
    checkRows(domain.body, ctx);
  });

  test("a drill set opens on its group hits and a group opens its lifecycles", async () => {
    boot();
    const t = await token();
    const opening = await rows(t, "?id=occupations-time");
    expect(opening.body.n).toBe(48);
    expect(opening.body.frame.drill?.values).toEqual(rowKeys(opening.body));
    const group = await rows(t, "?id=occupations-time&group=census-2018");
    expect([group.status, group.body.n, group.body.total, group.body.page]).toEqual([200, 570, 570, 0]);
    expect(hitIds(group.body)[0]).toStartWith("row:occupations-time:histocc-life-census-2018-");
    expect(group.bytes).toBeLessThanOrEqual(REPLY_BYTES);
    expect(group.bytes).toBe(packedBytes(group.body));
    const soc = await rows(t, "?id=occupations-time&group=soc-15");
    expect(soc.body.sub.every((code) => code.startsWith("15-"))).toBe(true);
  });

  test("every reply the route can return for the built pack keeps the caps", async () => {
    boot();
    const t = await token();
    let seen = 0;
    for (const set of pack.sets) {
      const values = [null, ...(set.pages[0].frame.drill?.values ?? [])];
      for (const value of values) {
        const r = await rows(t, `?id=${set.id}${value ? `&group=${encodeURIComponent(value)}` : ""}`);
        expect(r.status).toBe(200);
        expect(r.body.n).toBeLessThanOrEqual(REPLY_HITS);
        expect(r.bytes).toBeLessThanOrEqual(REPLY_BYTES);
        seen++;
      }
    }
    expect(seen).toBe(119);
  });

  test("a result above 600 hits is paged, and links that leave the page are dropped and counted", async () => {
    boot(fixturePack());
    const t = await token();
    const first = await rows(t, "?id=long-chain");
    const second = await rows(t, "?id=long-chain&page=1");
    expect([first.body.n, first.body.total, first.body.page, first.body.cut]).toEqual([600, 886, 0, 287]);
    expect([second.body.n, second.body.total, second.body.page, second.body.cut]).toEqual([286, 886, 1, 0]);
    expect((await rows(t, "?id=long-chain&page=2")).status).toBe(400);
    for (const page of [first.body, second.body]) {
      expect(page.links.flat().every((to) => to < page.n)).toBe(true);
      expect(page.frame.edgeStated?.map((l) => l.length)).toEqual(page.links.map((l) => l.length));
    }
    expect(first.body.frame.edgeStated?.[0]).toEqual([true, false]);
  });

  test("q narrows a set on the server by the words of title and detail", async () => {
    boot(fixturePack());
    const t = await token();
    const algebra = await rows(t, "?id=long-chain&q=algebra");
    expect([algebra.body.n, algebra.body.total, algebra.body.cut]).toEqual([443, 443, 0]);
    expect(algebra.body.title.every((title) => title.startsWith("Algebra"))).toBe(true);
    expect(algebra.body.links.flat().every((to) => to < algebra.body.n)).toBe(true);
    const none = await rows(t, "?id=long-chain&q=zebra");
    expect([none.status, none.body.n, none.body.total]).toEqual([200, 0, 0]);
    expect((await rows(t, "?id=long-chain&q=zebra&page=1")).status).toBe(400);
    const all = await rows(t, "?id=long-chain&q=course");
    expect([all.body.n, all.body.total]).toEqual([600, 886]);
    const blank = await rows(t, "?id=fixture-set&q=%20");
    expect(blank.body.n).toBe(3);
  });

  test("the request names no file: a path in any parameter reaches no page", async () => {
    boot();
    const t = await token();
    for (const q of ["?id=..%2F..%2Fetc%2Fpasswd", "?id=occupations-time&group=..%2F..%2Fx", "?id=major-to-career%00"]) expect((await rows(t, q)).status).toBe(400);
  });
});

describe("the row set store", () => {
  test("a sync writes once per pack version and replaces the sets on a new one", () => {
    const db = freshDb();
    expect(syncRowSets(db, pack)).toBe(true);
    expect(syncRowSets(db, pack)).toBe(false);
    expect(db.query<{ v: string }, [string]>("select v from meta where k = ?").get(ROWS_META_KEY)?.v).toBe(pack.version);
    const store = new RowSetStore(db);
    expect(store.list()).toHaveLength(6);
    expect(store.page("major-to-career", 0)?.n).toBe(64);
    expect(store.page("major-to-career", 1)).toBeNull();
    expect(syncRowSets(db, fixturePack())).toBe(true);
    expect(store.list().map((x) => x.id)).toEqual(["long-chain", "fixture-set"]);
    expect(store.has("major-to-career")).toBe(false);
    expect(syncRowSets(db, null)).toBe(true);
    expect(store.list()).toEqual([]);
    expect(new RowSetStore(freshDb()).list()).toEqual([]);
    expect(rowSetReply(new RowSetStore(freshDb()), new URL("http://x/local/explore/rows?id=major-to-career")).status).toBe(404);
  });

  test("a reply over the byte cap is refused", () => {
    const ctx = fixtureContext();
    const wide = assembleRowSet([fixtureDraft({ rows: Array.from({ length: 600 }, (_, i): RowDraft => ({ key: `k${i}`, title: `${"t".repeat(190)} ${i}`, sub: "", group: "a", source: "open" })) })], ctx);
    const db = freshDb();
    syncRowSets(db, { version: "wide", sets: [{ id: "fixture-set", label: "Fixture set", licence: wide[0].licence, audience: "public", bytes: 0, hits: 600, pages: wide }] });
    expect(rowSetReply(new RowSetStore(db), new URL("http://x/local/explore/rows?id=fixture-set"))).toEqual({ status: 500, body: { error: "reply_too_large" } });
  });
});

describe("row sets on the Data screen", () => {
  test("each set registers under its own id with its sources, licence and rows", async () => {
    const adapters = pack.sets.map(rowSetAdapter);
    expect(adapters.map((a) => a.info().id)).toEqual(pack.sets.map((x) => x.id));
    const occupations = adapters[0];
    const info = occupations.info();
    expect(info.name).toBe("Occupations through time");
    expect(info.about).toContain("CC-BY-4.0");
    expect(info.parts.map((p) => p.count).reduce((a, b) => a + b, 0)).toBe(3296);
    expect(info.parts.every((p) => p.link?.startsWith("https://") && (p.terms ?? "").length > 0)).toBe(true);
    expect(occupations.records()).toHaveLength(3296);
    expect(info.counts.reduce((sum, c) => sum + c.n, 0)).toBe(3296);
    const first = occupations.records()[0];
    expect(first.id).toStartWith("row:occupations-time:histocc-life-");
    expect(occupations.fields(first.id)?.map((f) => f.label)).toEqual(expect.arrayContaining(["Group", "Licence", "Source"]));
    expect(occupations.fields("row:occupations-time:nope")).toBeNull();
    const flow = adapters[1];
    expect(flow.records()).toHaveLength(64);
    expect(flow.fields("row:major-to-career:cip-11")?.find((f) => f.label === "Licence")?.value).toBe("US federal work, public domain");
    const data = dataRoutes(adapters);
    expect(typeof data.match).toBe("function");
  });
});
