import test from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { readdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileMarks } from "../src/lib/download/marks";
import { matchToken, parseTokens, REVOCATION_TTL_MS, tokenHash, TOKEN_MIN, type RevocationCache } from "../src/lib/whats-new/auth";
import { BODY_MAX_BYTES, handleList, handlePost, mergeEntries, type Deps, type LegacyEntry, type Limits, type Result } from "../src/lib/whats-new/handler";
import { checkLink, IMAGE_MAX_BYTES, parseEntryBody } from "../src/lib/whats-new/schema";
import { fileDocs, getWhatsNewStore, markRevoked, readEntry, whatsNewPrefix, writeEntry, type DocStore, type StoredEntry } from "../src/lib/whats-new/store";

const FIXTURES = path.join(__dirname, "fixtures", "whats-new-api");
const LEGACY: LegacyEntry[] = [{ id: "pr-496", date: "2026-10-01", category: "pr-merged", title: "Legacy row" }];
const PNG = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

const tokens = { ada: randomBytes(24).toString("hex"), bob: randomBytes(24).toString("hex"), root: randomBytes(24).toString("hex") };
const TOKENS_ENV = `ada:${tokenHash(tokens.ada)}:post,bob:${tokenHash(tokens.bob)}:post,root:${tokenHash(tokens.root)}:admin`;

function fixture(name: string): Record<string, unknown> {
  return JSON.parse(readFileSync(path.join(FIXTURES, `${name}.json`), "utf8")) as Record<string, unknown>;
}

const production = (): Record<string, unknown> => fixture("gap-score-backtest-2026-10");
const generation = (): Record<string, unknown> => fixture("gen-sibling-momentum");

interface Bench {
  deps: Deps;
  store: DocStore;
  root: string;
  now: { value: number };
}

async function bench(t: { after(fn: () => Promise<void>): void }, over: Partial<Deps> = {}, limits?: Partial<Limits>): Promise<Bench> {
  const root = await mkdtemp(path.join(tmpdir(), "whats-new-api-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const store = fileDocs(root, "whats-new-test/");
  const now = { value: Date.parse("2026-10-01T12:00:00.000Z") };
  const deps: Deps = {
    env: { WHATS_NEW_TOKENS: TOKENS_ENV },
    store,
    marks: fileMarks(path.join(root, "marks")),
    legacy: LEGACY,
    clock: () => now.value,
    limits: { ratePerMinute: 1000, draftsPerPoster: 50, draftsTotal: 100, ...limits },
    revocationCache: new Map(),
    ...over,
  };
  return { deps, store, root, now };
}

function post(deps: Deps, body: unknown, token: string | null = tokens.ada, over: { contentType?: string | null; contentLength?: string | null; raw?: string } = {}): Promise<Result> {
  const raw = over.raw ?? JSON.stringify(body);
  return handlePost(
    {
      authorization: token === null ? null : `Bearer ${token}`,
      contentType: over.contentType === undefined ? "application/json" : over.contentType,
      contentLength: over.contentLength === undefined ? String(Buffer.byteLength(raw)) : over.contentLength,
      text: async () => raw,
    },
    deps,
  );
}

function list(deps: Deps, query: { kind?: string; state?: string } = {}, token: string | null = null): Promise<Result> {
  return handleList({ authorization: token === null ? null : `Bearer ${token}`, kind: query.kind ?? null, state: query.state ?? null }, deps);
}

function entriesOf(result: Result): Record<string, unknown>[] {
  return (result.body as { entries: Record<string, unknown>[] }).entries;
}

function setPath(target: Record<string, unknown>, dotted: string, value: unknown): void {
  const parts = dotted.replace(/\[(\d+)\]/g, ".$1").split(".");
  let node = target as Record<string, unknown>;
  for (const p of parts.slice(0, -1)) node = node[p] as Record<string, unknown>;
  node[parts[parts.length - 1]] = value;
}

function stringPaths(value: unknown, at = ""): string[] {
  if (typeof value === "string") return [at];
  if (Array.isArray(value)) return value.flatMap((v, i) => stringPaths(v, `${at}[${i}]`));
  if (value && typeof value === "object") return Object.entries(value).flatMap(([k, v]) => stringPaths(v, at ? `${at}.${k}` : k));
  return [];
}

test("parseTokens keeps well-formed records and drops the rest", () => {
  const records = parseTokens(`${TOKENS_ENV}, nope ,x:zz:post,ada:${tokenHash("other")}:admin,eve:${tokenHash("x")}:owner`);
  assert.deepEqual(records.map((r) => [r.name, r.scope]), [["ada", "post"], ["bob", "post"], ["root", "admin"]]);
  assert.deepEqual(parseTokens(undefined), []);
});

test("matchToken compares against every configured hash and names the poster", () => {
  const records = parseTokens(TOKENS_ENV);
  for (const given of [tokens.ada, tokens.root, randomBytes(24).toString("hex"), null]) {
    let calls = 0;
    const poster = matchToken(given, records, (a, b) => {
      calls++;
      return a.equals(b);
    });
    assert.equal(calls, records.length);
    assert.equal(poster?.name ?? null, given === tokens.ada ? "ada" : given === tokens.root ? "root" : null);
  }
  assert.equal(matchToken(tokens.root, records)?.scope, "admin");
  const short = "a".repeat(TOKEN_MIN - 1);
  assert.equal(matchToken(short, parseTokens(`tiny:${tokenHash(short)}:post`)), null);
  assert.equal(matchToken(tokens.ada, []), null);
});

test("a missing or wrong token gets the cron route's 404 before the body is read", async (t) => {
  const { deps } = await bench(t);
  const unread = { contentType: "application/json", contentLength: "2", text: async (): Promise<string> => assert.fail("body was read") };
  for (const authorization of [null, "Bearer wrong", `Bearer ${randomBytes(24).toString("hex")}`, `Basic ${tokens.ada}`, tokens.ada]) {
    assert.deepEqual(await handlePost({ authorization, ...unread }, deps), { status: 404, body: null });
  }
  assert.deepEqual(await handlePost({ authorization: `Bearer ${tokens.ada}`, ...unread }, { ...deps, env: {} }), { status: 404, body: null });
});

test("POST returns 201 for a new draft and 200 for a replace by the same poster", async (t) => {
  const { deps, store, root } = await bench(t);
  const first = await post(deps, generation());
  assert.equal(first.status, 201);
  assert.deepEqual(first.body, { ok: true, id: "gen-sibling-momentum", kind: "generation", review_state: "draft", replaced: false });
  const second = await post(deps, { ...generation(), title: "Sibling momentum, second pass" });
  assert.equal(second.status, 200);
  assert.equal(second.body?.replaced, true);
  const stored = await readEntry(store, "gen-sibling-momentum");
  assert.equal(stored?.title, "Sibling momentum, second pass");
  assert.equal(stored?.review_state, "draft");
  assert.equal(stored?.poster, "ada");
  assert.equal(stored?.machine_generated, true);
  const audit = await readdir(path.join(root, "whats-new-test", "audit"));
  assert.equal(audit.length, 2);
});

test("a replace of a published entry returns it to draft and the audit keeps the previous hash", async (t) => {
  const { deps, store, root, now } = await bench(t);
  assert.equal((await post(deps, generation())).status, 201);
  const created = (await readEntry(store, "gen-sibling-momentum")) as StoredEntry;
  await writeEntry(store, { ...created, review_state: "published" });
  now.value += 5000;
  assert.equal((await post(deps, { ...generation(), state: "refuted" })).status, 200);
  const after = (await readEntry(store, "gen-sibling-momentum")) as StoredEntry;
  assert.equal(after.review_state, "draft");
  assert.equal(after.created_at, created.created_at);
  assert.notEqual(after.updated_at, created.updated_at);
  const dir = path.join(root, "whats-new-test", "audit");
  const records = await Promise.all((await readdir(dir)).sort().map(async (n) => JSON.parse(await readFile(path.join(dir, n), "utf8")) as Record<string, unknown>));
  assert.deepEqual(records.map((r) => [r.action, r.poster, r.previous_body_hash]), [["create", "ada", null], ["replace", "ada", created.body_hash]]);
  assert.equal(records[1].body_hash, after.body_hash);
  assert.match(String(records[0].body_hash), /^[0-9a-f]{64}$/);
});

test("409 when the id is in the legacy feed or belongs to another poster", async (t) => {
  const { deps } = await bench(t);
  const legacy = await post(deps, { ...generation(), id: "pr-496" });
  assert.equal(legacy.status, 409);
  assert.equal((await post(deps, generation(), tokens.ada)).status, 201);
  assert.equal((await post(deps, generation(), tokens.bob)).status, 409);
  assert.equal((await post(deps, generation(), tokens.root)).status, 409);
  const real = (JSON.parse(readFileSync(path.join(__dirname, "..", "data", "whats-new.json"), "utf8")) as { entries: LegacyEntry[] }).entries;
  const taken = real.find((e) => /^[a-z0-9-]{3,80}$/.test(e.id)) as LegacyEntry;
  assert.equal((await post({ ...deps, legacy: real }, { ...generation(), id: taken.id })).status, 409);
});

test("400, 413, 415 and 503 for a bad body, an oversize body, a wrong type and a missing store", async (t) => {
  const { deps } = await bench(t);
  assert.equal((await post(deps, null, tokens.ada, { raw: "{not json" })).status, 400);
  assert.equal((await post(deps, [])).status, 400);
  const missing = await post(deps, { ...generation(), run_id: undefined });
  assert.deepEqual([missing.status, missing.body?.field], [400, "run_id"]);
  assert.equal((await post(deps, { ...generation(), source: "someone" })).body?.field, "source");
  assert.equal((await post(deps, { ...generation(), source: undefined })).body?.field, "source");
  assert.equal((await post(deps, { ...generation(), id: "No" })).body?.field, "id");
  assert.equal((await post(deps, { ...generation(), extra: 1 })).body?.field, "extra");
  assert.equal((await post(deps, generation(), tokens.ada, { contentType: "text/plain" })).status, 415);
  assert.equal((await post(deps, generation(), tokens.ada, { contentType: null })).status, 415);
  assert.equal((await post(deps, generation(), tokens.ada, { contentType: "application/json; charset=utf-8" })).status, 201);
  assert.equal((await post(deps, generation(), tokens.ada, { contentLength: String(BODY_MAX_BYTES + 1) })).status, 413);
  const big = JSON.stringify({ ...generation(), title: "x".repeat(BODY_MAX_BYTES) });
  assert.equal((await post(deps, null, tokens.ada, { raw: big, contentLength: null })).status, 413);
  assert.equal((await post({ ...deps, store: null }, generation())).status, 503);
  assert.equal((await post({ ...deps, marks: null }, generation())).status, 503);
  assert.equal((await list({ ...deps, store: null }, { state: "draft" }, tokens.root)).status, 503);
});

test("field rules for productions and generations", () => {
  const bad = (body: Record<string, unknown>): string => {
    const r = parseEntryBody(body);
    return r.ok ? "ok" : r.field;
  };
  assert.equal(bad(production()), "ok");
  assert.equal(bad(generation()), "ok");
  for (const field of ["id", "date", "title", "summary", "plot_title", "image_alt", "links", "status", "source"]) assert.equal(bad({ ...production(), [field]: undefined }), field);
  for (const field of ["id", "date", "title", "tool", "run_id", "source"]) assert.equal(bad({ ...generation(), [field]: undefined }), field);
  assert.equal(bad({ ...production(), image: undefined, discussion: undefined }), "ok");
  assert.equal(bad({ ...production(), discussion: Array(100).fill("word").join(" ") }), "discussion");
  assert.equal(bad({ ...production(), discussion: Array(99).fill("word").join(" ") }), "ok");
  assert.equal(bad({ ...production(), status: "closed" }), "status");
  assert.equal(bad({ ...production(), links: [] }), "links");
  assert.equal(bad({ ...production(), date: "2026-02-30" }), "date");
  assert.equal(bad({ ...production(), category: "generation" }), "category");
  assert.equal(bad({ ...production(), title: "two\nlines" }), "title");
  assert.equal(bad({ ...generation(), claim: "One sentence. And a second one." }), "claim");
  assert.equal(bad({ ...generation(), state: "published" }), "state");
  assert.equal(bad({ ...generation(), score: { value: "0.1", meaning: "m" } }), "score.value");
  assert.equal(bad({ ...generation(), score: { value: 1 } }), "score.meaning");
  assert.equal(bad({ ...generation(), parent: "Not An Id" }), "parent");
  assert.equal(bad({ ...generation(), machine_generated: false }), "machine_generated");
  assert.equal(bad({ ...generation(), kind: "note" }), "kind");
  const defaults = parseEntryBody({ ...generation(), state: undefined, machine_generated: undefined, category: undefined });
  assert.equal(defaults.ok && defaults.entry.kind === "generation" && defaults.entry.state, "candidate");
  assert.equal(defaults.ok && defaults.entry.kind === "generation" && defaults.entry.machine_generated, true);
});

test("links need https, an exact allowlisted host and no userinfo", () => {
  assert.equal(checkLink("https://github.com/bucket-foundation/bucket-foundation/pull/519", "href"), "https://github.com/bucket-foundation/bucket-foundation/pull/519");
  const rejected = [
    "http://github.com/a",
    "https://gist.github.com/a",
    "https://www.github.com/a",
    "https://github.com.example.org/a",
    "https://example.org/github.com",
    "https://user@github.com/a",
    "https://user:pw@github.com/a",
    "https://github.com@example.org/a",
    "https://github.com:8443/a",
    "//github.com/a",
    "github.com/a",
    "javascript:alert(1)",
    " https://github.com/a",
    42,
  ];
  for (const href of rejected) assert.throws(() => checkLink(href, "href"), String(href));
  const inLinks = parseEntryBody({ ...production(), links: [{ label: "PR", href: "https://bit.ly/x" }] });
  assert.deepEqual([inLinks.ok, !inLinks.ok && inLinks.field], [false, "links[0].href"]);
  const inEvidence = parseEntryBody({ ...generation(), evidence: ["https://github.com/a", "https://user@github.com/a"] });
  assert.deepEqual([inEvidence.ok, !inEvidence.ok && inEvidence.field], [false, "evidence[1]"]);
});

test("the leak filter runs on every string field and never echoes the match", async (t) => {
  const { deps } = await bench(t);
  const marker = "ada.lovelace@example.org";
  for (const make of [production, generation]) {
    const paths = stringPaths(make()).filter((p) => p !== "image.base64");
    assert.ok(paths.includes("links[0].href") || paths.includes("evidence[0]"));
    for (const field of paths) {
      const body = make();
      setPath(body, field, `https://github.com/a?contact=${marker}`);
      const res = await post(deps, body);
      assert.equal(res.status, 422, field);
      const fields = res.body?.fields as { field: string; kind: string }[];
      assert.ok(fields.some((f) => f.field === field && f.kind === "email"), field);
      assert.ok(!JSON.stringify(res.body).includes("lovelace"), field);
    }
  }
  assert.ok(stringPaths(generation()).includes("run_id"));
  const unknown = await post(deps, { ...generation(), note: { deep: [["", "home", "ada", "run.log"].join("/")] } });
  assert.deepEqual(unknown.body?.fields, [{ field: "note.deep[0]", kind: "absolute-path" }]);
  const secret = await post(deps, { ...generation(), run_id: `ghp_${"a".repeat(36)}` });
  assert.deepEqual([secret.status, JSON.stringify(secret.body).includes("ghp_")], [422, false]);
  assert.equal((await list(deps, { state: "draft" }, tokens.root)).body?.entries instanceof Array && entriesOf(await list(deps, { state: "draft" }, tokens.root)).length, 0);
});

test("revocation by env, by store mark, and a failing revocation read fails closed", async (t) => {
  const { deps, store, now } = await bench(t);
  const cache: RevocationCache = new Map();
  assert.equal((await post({ ...deps, env: { ...deps.env, WHATS_NEW_REVOKED: "bob, Ada" } }, generation())).status, 404);
  assert.equal((await post({ ...deps, env: { ...deps.env, WHATS_NEW_REVOKED: "bob" }, revocationCache: cache }, generation())).status, 201);

  await markRevoked(store, "ada", "2026-10-01T12:00:00.000Z");
  assert.equal((await post({ ...deps, revocationCache: cache }, generation())).status, 200);
  now.value += REVOCATION_TTL_MS + 1;
  assert.equal((await post({ ...deps, revocationCache: cache }, generation())).status, 404);
  assert.equal((await post({ ...deps, revocationCache: new Map() }, generation())).status, 404);
  assert.equal((await post({ ...deps, revocationCache: new Map() }, fixture("gen-september-step-change"), tokens.bob)).status, 201);

  await markRevoked(store, "root", "2026-10-01T12:00:00.000Z");
  assert.equal((await list({ ...deps, revocationCache: new Map() }, { state: "draft" }, tokens.root)).status, 404);

  let reads = 0;
  const outage: DocStore = {
    ...store,
    read: async (name) => {
      if (!name.startsWith("revoked/")) return store.read(name);
      reads++;
      throw new Error("blob store is down");
    },
  };
  const quiet = t.mock.method(console, "error", () => undefined);
  const down = await post({ ...deps, store: outage, revocationCache: new Map() }, fixture("gen-metadata-model-top-50"), tokens.bob);
  assert.equal(down.status, 503);
  assert.equal((await list({ ...deps, store: outage, revocationCache: new Map() }, { state: "draft" }, tokens.root)).status, 503);
  assert.equal(reads, 2);
  assert.equal(quiet.mock.callCount(), 2);
  assert.equal(await readEntry(store, "gen-metadata-model-top-50"), null);
});

test("429 from the per-token rate limit, the per-poster draft cap and the global cap", async (t) => {
  const rate = await bench(t, {}, { ratePerMinute: 2 });
  assert.equal((await post(rate.deps, generation())).status, 201);
  assert.equal((await post(rate.deps, generation())).status, 200);
  assert.equal((await post(rate.deps, generation())).status, 429);
  assert.equal((await post(rate.deps, generation(), tokens.bob)).status, 409);
  rate.now.value += 60_000;
  assert.equal((await post(rate.deps, generation())).status, 200);

  const caps = await bench(t, {}, { draftsPerPoster: 2, draftsTotal: 3 });
  const ids = ["gen-sibling-momentum", "gen-september-step-change", "gen-metadata-model-top-50", "gen-gap-score-predicts-resolution"];
  assert.equal((await post(caps.deps, fixture(ids[0]))).status, 201);
  assert.equal((await post(caps.deps, fixture(ids[1]))).status, 201);
  const third = await post(caps.deps, fixture(ids[2]));
  assert.deepEqual([third.status, /poster/.test(String(third.body?.error))], [429, true]);
  assert.equal((await post(caps.deps, fixture(ids[0]))).status, 200);
  assert.equal((await post(caps.deps, fixture(ids[2]), tokens.bob)).status, 201);
  const global = await post(caps.deps, fixture(ids[3]), tokens.bob);
  assert.deepEqual([global.status, /store holds/.test(String(global.body?.error))], [429, true]);
  assert.equal(await readEntry(caps.store, ids[3]), null);
});

test("a draft appears in no public GET; an admin token with state=draft lists drafts", async (t) => {
  const { deps } = await bench(t);
  assert.equal((await post(deps, production())).status, 201);
  assert.equal((await post(deps, generation())).status, 201);
  for (const query of [{}, { kind: "production" }, { kind: "generation" }]) {
    for (const token of [null, tokens.ada, tokens.root]) {
      const res = await list(deps, query, token);
      assert.equal(res.status, 200);
      const ids = entriesOf(res).map((e) => e.id);
      assert.ok(!ids.includes("gap-score-backtest-2026-10") && !ids.includes("gen-sibling-momentum"));
    }
  }
  assert.deepEqual(entriesOf(await list(deps)).map((e) => e.id), ["pr-496"]);
  assert.deepEqual(entriesOf(await list(deps, { kind: "generation" })), []);
  assert.equal((await list(deps, { kind: "note" })).status, 400);
  for (const token of [null, tokens.ada, "wrong"]) assert.deepEqual(await list(deps, { state: "draft" }, token), { status: 404, body: null });
  assert.equal((await list(deps, { state: "published" }, tokens.root)).status, 400);
  const drafts = entriesOf(await list(deps, { state: "draft" }, tokens.root));
  assert.deepEqual(drafts.map((e) => e.id).sort(), ["gap-score-backtest-2026-10", "gen-sibling-momentum"]);
  const gen = entriesOf(await list(deps, { state: "draft", kind: "generation" }, tokens.root));
  assert.deepEqual(gen.map((e) => [e.kind, e.state, e.machine_generated, e.review_state, e.poster]), [["generation", "tested", true, "draft", "ada"]]);
  assert.ok(!JSON.stringify(drafts).includes(PNG));
});

test("mergeEntries publishes through one path: drafts dropped, legacy wins an id collision", () => {
  const base = { poster: "ada", created_at: "t", updated_at: "t", body_hash: "h" };
  const stored: StoredEntry[] = [
    { ...base, id: "draft-one", kind: "generation", review_state: "draft", date: "2026-10-02" },
    { ...base, id: "pr-496", kind: "production", review_state: "published", date: "2026-10-02" },
    { ...base, id: "live-gen", kind: "generation", review_state: "published", date: "2026-10-02", state: "refuted", machine_generated: true },
  ];
  const merged = mergeEntries(LEGACY, stored);
  assert.deepEqual(merged.map((e) => e.id), ["live-gen", "pr-496"]);
  assert.equal(merged[1].title, "Legacy row");
  assert.deepEqual([merged[0].kind, merged[0].state, merged[0].machine_generated], ["generation", "refuted", true]);
  for (const hidden of ["poster", "body_hash", "review_state"]) assert.ok(!(hidden in merged[0]));
  assert.deepEqual(mergeEntries(LEGACY, stored, "generation").map((e) => e.id), ["live-gen"]);
  assert.deepEqual(mergeEntries([...LEGACY, { id: "legacy-prod", date: "2026-09-30", category: "production" }], stored, "production").map((e) => e.id), ["legacy-prod"]);
});

test("the image object is checked for type and size and stored beside the entry as received", async (t) => {
  const { deps, store, root } = await bench(t);
  const withImage = (image: unknown): Record<string, unknown> => ({ ...production(), image });
  assert.equal((await post(deps, production())).status, 201);
  const kept = JSON.parse(await readFile(path.join(root, "whats-new-test", "entries", "gap-score-backtest-2026-10.image.json"), "utf8")) as unknown;
  assert.deepEqual(kept, { filename: "gap-score-backtest.png", content_type: "image/png", base64: PNG });
  assert.deepEqual((await readEntry(store, "gap-score-backtest-2026-10"))?.image, { filename: "gap-score-backtest.png", content_type: "image/png", bytes: Buffer.from(PNG, "base64").length });
  const svg = Buffer.from("<svg xmlns='http://www.w3.org/2000/svg'/>").toString("base64");
  const cases: [unknown, string][] = [
    [{ filename: "a.svg", content_type: "image/svg+xml", base64: svg }, "content_type"],
    [{ filename: "a.png", content_type: "image/png", base64: svg }, "image.base64"],
    [{ filename: "a.jpg", content_type: "image/jpeg", base64: PNG }, "image.base64"],
    [{ filename: "../a.png", content_type: "image/png", base64: PNG }, "image.filename"],
    [{ filename: "a.png", content_type: "image/png", base64: "not base64!" }, "image.base64"],
    [{ filename: "a.png", content_type: "image/png", base64: PNG, url: "x" }, "image.url"],
    ["a.png", "image"],
  ];
  for (const [image, field] of cases) {
    const res = await post(deps, withImage(image));
    assert.deepEqual([res.status, res.body?.field], [400, field]);
  }
  const header = Buffer.from(PNG, "base64");
  const oversize = Buffer.concat([header, Buffer.alloc(IMAGE_MAX_BYTES)]).toString("base64");
  const big = parseEntryBody(withImage({ filename: "a.png", content_type: "image/png", base64: oversize }));
  assert.deepEqual([big.ok, !big.ok && big.field], [false, "image.base64"]);
});

test("the store is a file store locally, Blob with a token, and absent on Vercel without one", () => {
  assert.equal(whatsNewPrefix({ VERCEL_ENV: "production" }), "whats-new/");
  assert.equal(whatsNewPrefix({ VERCEL_ENV: "preview" }), "whats-new-preview/");
  assert.equal(whatsNewPrefix({}), "whats-new-local/");
  assert.equal(getWhatsNewStore({})?.kind, "file");
  assert.equal(getWhatsNewStore({ VERCEL_ENV: "production", BLOB_READ_WRITE_TOKEN: "set" })?.kind, "blob");
  assert.equal(getWhatsNewStore({ VERCEL_ENV: "production" }), null);
  assert.equal(getWhatsNewStore({ VERCEL: "1" }), null);
});

async function postAll(t: { after(fn: () => Promise<void>): void }, dir: string): Promise<number> {
  const { deps, store } = await bench(t);
  const names = readdirSync(dir).filter((n) => n.endsWith(".json")).sort();
  for (const name of names) {
    const raw = readFileSync(path.join(dir, name), "utf8");
    const res = await post(deps, null, tokens.ada, { raw });
    assert.deepEqual([name, res.status, res.body?.error], [name, 201, undefined]);
    const id = (JSON.parse(raw) as { id: string }).id;
    assert.equal((await readEntry(store, id))?.review_state, "draft");
  }
  assert.equal(entriesOf(await list(deps, { state: "draft" }, tokens.root)).length, names.length);
  assert.deepEqual(entriesOf(await list(deps)).map((e) => e.id), ["pr-496"]);
  return names.length;
}

test("all seven staged fixtures post as drafts", async (t) => {
  assert.equal(await postAll(t, FIXTURES), 7);
});

test("the staged outbox posts as drafts when WHATS_NEW_OUTBOX names it", { skip: !process.env.WHATS_NEW_OUTBOX }, async (t) => {
  assert.ok((await postAll(t, process.env.WHATS_NEW_OUTBOX as string)) > 0);
});
