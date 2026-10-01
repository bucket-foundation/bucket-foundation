import { Database } from "bun:sqlite";
import { afterEach, describe, expect, test } from "bun:test";
import { resolve } from "node:path";
import { browserCommand, CANON_META_KEY, canonRoutes, CanonStore, openable, OPEN_BODY_BYTES, syncCanon } from "../src/canon";
import { buildCanonPack } from "../src/pack/canon";
import { startServe, type Serve } from "../src/serve";

const pack = buildCanonPack(resolve(import.meta.dir, "../../.."));
const ME = 4242;
let peerUid = ME;
let s: Serve | null = null;
let opened: string[] = [];

function freshDb(): Database {
  const db = new Database(":memory:");
  db.run("create table meta (k text primary key, v text not null)");
  return db;
}

function boot(db = freshDb()) {
  syncCanon(db, pack);
  peerUid = ME;
  opened = [];
  s = startServe({
    uid: ME,
    resolvePeerUid: () => peerUid,
    routes: canonRoutes(new CanonStore(db), { open: (u) => opened.push(u) }),
    routeBodyBytes: { "POST /local/open": OPEN_BODY_BYTES },
  });
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
const post = (t: string | null, body: unknown) => {
  const text = JSON.stringify(body);
  return req("/local/open", { method: "POST", headers: { ...(t ? auth(t) : {}), "content-type": "application/json", "content-length": String(text.length) }, body: text });
};

describe("canon tables", () => {
  test("the pack loads once per version and reloads when the version changes", () => {
    const db = freshDb();
    expect(syncCanon(db, pack)).toBe(true);
    expect(syncCanon(db, pack)).toBe(false);
    const store = new CanonStore(db);
    expect(store.version()).toBe(pack.version);
    expect(store.index().length).toBe(pack.excerpts.length);
    expect(store.index().map((e) => e.rowid)).toEqual(pack.excerpts.map((e) => e.rowid));
    const smaller = { ...pack, version: "000000000000", excerpts: pack.excerpts.slice(0, 3) };
    expect(syncCanon(db, smaller)).toBe(true);
    expect(new CanonStore(db).index().length).toBe(3);
    expect(db.query<{ v: string }, [string]>("select v from meta where k = ?").get(CANON_META_KEY)!.v).toBe("000000000000");
  });

  test("the full-text table answers a match query with the rows that hold the word", () => {
    const db = freshDb();
    syncCanon(db, pack);
    const store = new CanonStore(db);
    const want = pack.excerpts.filter((e) => /\bentropy\b/i.test(e.text)).map((e) => e.rowid);
    expect(want.length).toBeGreaterThan(0);
    expect(store.matches("entropy")).toEqual(want);
    expect(store.matches("of a")).toEqual([]);
  });

  test("a store with no pack loaded returns nothing", () => {
    const store = new CanonStore(freshDb());
    expect(store.index()).toEqual([]);
    expect(store.excerpt(0)).toBeNull();
    expect(store.licences()).toEqual([]);
  });
});

describe("GET /local/canon/search", () => {
  test("is refused without the token, with a wrong token, and for another user's process", async () => {
    boot();
    expect((await req("/local/canon/search?q=entropy")).status).toBe(401);
    expect((await req("/local/canon/search?q=entropy", { headers: { authorization: `Bucket ${"x".repeat(43)}` } })).status).toBe(401);
    expect((await req("/local/canon/excerpt?id=0")).status).toBe(401);
    expect((await req("/local/canon/licences")).status).toBe(401);
    peerUid = ME + 1;
    expect((await req("/")).status).toBe(403);
    expect((await req("/local/canon/search?q=entropy", { headers: { host: "evil.example" } })).status).toBe(403);
  });

  test("ranks through the shared ranking and returns ids, scores and evidence counts", async () => {
    boot();
    const t = await token();
    const r = await req("/local/canon/search?q=entropy&top_k=5", { headers: auth(t) });
    expect(r.status).toBe(200);
    const body = (await r.json()) as { mode: string; top_k: number; results: { claim_id: number; concept: string; slug: string; score: number; evidence_count: number }[] };
    expect(body.mode).toBe("lexical");
    expect(body.results.length).toBe(5);
    expect(body.results[0].score).toBeGreaterThan(0);
    expect(body.results.map((x) => x.score)).toEqual([...body.results.map((x) => x.score)].sort((a, b) => b - a));
    const first = body.results[0];
    expect(first.evidence_count).toBe(pack.evidence[String(first.claim_id)].length);
    expect((await req("/local/canon/search", { headers: auth(t) })).status).toBe(400);
    const none = (await (await req("/local/canon/search?q=energy&branch=99-nowhere", { headers: auth(t) })).json()) as { n_results: number };
    expect(none.n_results).toBe(0);

    const d = await req(`/local/canon/excerpt?id=${first.claim_id}`, { headers: auth(t) });
    expect(d.status).toBe(200);
    const detail = (await d.json()) as { id: number; source: { url: string | null }; evidence: { text: string; kind: string; title: string; url: string | null; openable: boolean }[] };
    expect(detail.evidence.every((p) => p.title.length > 0)).toBe(true);
    expect(detail.evidence.every((p) => p.openable === (openable(p.url) !== null))).toBe(true);
    expect(detail.id).toBe(first.claim_id);
    expect(detail.evidence.length).toBe(first.evidence_count);
    expect((await req("/local/canon/excerpt?id=999999", { headers: auth(t) })).status).toBe(404);
    expect((await req("/local/canon/excerpt?id=1%20or%201", { headers: auth(t) })).status).toBe(404);

    const lic = (await (await req("/local/canon/licences", { headers: auth(t) })).json()) as { version: string; licences: { kind: string }[] };
    expect(lic.version).toBe(pack.version);
    expect(lic.licences.map((l) => l.kind)).toEqual(pack.licences.map((l) => l.kind));
  });
});

describe("POST /local/open", () => {
  test("is refused without the token and for another user's process", async () => {
    boot();
    expect((await post(null, { url: "https://www.youtube.com/watch?v=abc" })).status).toBe(401);
    const t = await token();
    peerUid = ME + 1;
    expect((await req("/")).status).toBe(403);
    expect(opened).toEqual([]);
    peerUid = ME;
    expect((await post(t, { url: "https://www.youtube.com/watch?v=abc" })).status).toBe(200);
    expect(opened).toEqual(["https://www.youtube.com/watch?v=abc"]);
  });

  test("opens allowlisted links and refuses everything else", async () => {
    boot();
    const t = await token();
    const refused = [
      "https://evil.example/",
      "https://www.youtube.com.evil.example/",
      "https://evil.example/?https://www.youtube.com/",
      "file:///etc/passwd",
      "javascript:alert(1)",
      "ftp://arxiv.org/x",
      "http://arxiv.org/abs/1",
      "https://archive.org/details/x",
      "https://doi.org/10.1/x",
      "data:text/html,x",
      "https://user:pw@www.youtube.com/",
      "https://user@www.youtube.com/",
      "https://www.youtube.com@evil.example/",
      "https://www.youtube.com:8443/",
      "https://www.youtube.com./",
      "https://www.youtube.com/ --flag",
      "https://www.youtube.com/\\x",
      "www.youtube.com",
      "",
      `https://www.youtube.com/${"a".repeat(3000)}`,
    ];
    for (const url of refused) expect([url, (await post(t, { url })).status]).toEqual([url, 400]);
    for (const body of [{}, { url: 5 }, { url: null }, []]) expect((await post(t, body)).status).toBe(400);
    expect(opened).toEqual([]);
    expect((await post(t, { url: "https://arxiv.org/abs/1103.1984" })).status).toBe(200);
    expect((await post(t, { url: "https://pubmed.ncbi.nlm.nih.gov/123/" })).status).toBe(200);
    expect(opened).toEqual(["https://arxiv.org/abs/1103.1984", "https://pubmed.ncbi.nlm.nih.gov/123/"]);
    const big = JSON.stringify({ url: `https://arxiv.org/${"a".repeat(OPEN_BODY_BYTES)}` });
    expect((await req("/local/open", { method: "POST", headers: { ...auth(t), "content-length": String(big.length) }, body: big })).status).toBe(413);
  });

  test("every source link in the pack is on the allowlist", () => {
    const urls = [...pack.excerpts.map((e) => e.source.url), ...Object.values(pack.evidence).flatMap((ps) => ps.map((p) => p.url)), ...pack.licences.map((l) => l.url)].filter((u): u is string => !!u);
    expect(urls.length).toBeGreaterThan(300);
    expect(urls.filter((u) => !u.startsWith("https://"))).toEqual([]);
    expect(urls.filter((u) => !openable(u) && new URL(u).hostname !== "archive.org")).toEqual([]);
  });

  test("the browser command passes the link as one argument and never through a shell", () => {
    const u = "https://archive.org/details/a&b";
    expect(browserCommand(u, "linux")).toEqual(["xdg-open", u]);
    expect(browserCommand(u, "darwin")).toEqual(["open", u]);
    expect(browserCommand(u, "win32")).toEqual(["rundll32", "url.dll,FileProtocolHandler", u]);
  });
});
