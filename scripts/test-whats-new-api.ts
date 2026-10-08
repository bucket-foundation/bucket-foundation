import test from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { mkdtemp, readdir, readFile, rm, stat } from "node:fs/promises";
import { readdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileMarks } from "../src/lib/download/marks";
import { matchToken, parseTokens, REVOCATION_TTL_MS, tokenHash, TOKEN_MIN, type RevocationCache } from "../src/lib/whats-new/auth";
import { BODY_MAX_BYTES, handleList, handlePost, handleRevoke, mergeEntries, readCapped, type Deps, type LegacyEntry, type Limits, type Result } from "../src/lib/whats-new/handler";
import { checkLink, IMAGE_MAX_BYTES, imageSize, parseEntryBody } from "../src/lib/whats-new/schema";
import { fileDocs, getWhatsNewStore, LOCK_TTL_MS, markRevoked, readEntry, readUsage, whatsNewPrefix, writeEntry, type DocStore, type StoredEntry } from "../src/lib/whats-new/store";

function pageDirs(dir: string, segments: string[]): string[] {
  const entries = readdirSync(dir, { withFileTypes: true });
  const groups = entries.filter((d) => d.isDirectory() && /^\(.+\)$/.test(d.name)).flatMap((d) => pageDirs(path.join(dir, d.name), segments));
  if (segments.length === 0) return entries.some((d) => d.isFile() && d.name === "page.tsx") ? [dir, ...groups] : groups;
  const exact = entries.some((d) => d.isDirectory() && d.name === segments[0]) ? pageDirs(path.join(dir, segments[0]), segments.slice(1)) : [];
  return [...exact, ...groups];
}

function isSitePage(href: string): boolean {
  if (!/^(?:\/[a-z0-9-]+)+$/.test(href)) return false;
  return pageDirs(path.join(__dirname, "..", "src", "app"), href.slice(1).split("/")).length > 0;
}

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
    limits: { ratePerMinute: 1000, draftsPerPoster: 50, draftsTotal: 100, imageBytesPerPoster: 10_000_000, ...limits },
    revocationCache: new Map(),
    ...over,
  };
  return { deps, store, root, now };
}

function stream(raw: string, chunk = 65536): ReadableStream<Uint8Array> {
  const bytes = Buffer.from(raw, "utf8");
  let at = 0;
  return new ReadableStream<Uint8Array>({
    pull(controller) {
      if (at >= bytes.length) return controller.close();
      controller.enqueue(new Uint8Array(bytes.subarray(at, at + chunk)));
      at += chunk;
    },
  });
}

function post(deps: Deps, body: unknown, token: string | null = tokens.ada, over: { contentType?: string | null; contentLength?: string | null; raw?: string } = {}): Promise<Result> {
  const raw = over.raw ?? JSON.stringify(body);
  return handlePost(
    {
      authorization: token === null ? null : `Bearer ${token}`,
      contentType: over.contentType === undefined ? "application/json" : over.contentType,
      contentLength: over.contentLength === undefined ? String(Buffer.byteLength(raw)) : over.contentLength,
      body: stream(raw),
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
  const body = (): ReadableStream<Uint8Array> => new ReadableStream<Uint8Array>({ pull: () => assert.fail("body was read") });
  const unread = { contentType: "application/json", contentLength: "2" };
  for (const authorization of [null, "Bearer wrong", `Bearer ${randomBytes(24).toString("hex")}`, `Basic ${tokens.ada}`, tokens.ada]) {
    assert.deepEqual(await handlePost({ authorization, ...unread, body: body() }, deps), { status: 404, body: null });
    assert.deepEqual(await handleRevoke({ authorization, name: "ada" }, deps), { status: 404, body: null });
  }
  assert.deepEqual(await handlePost({ authorization: `Bearer ${tokens.ada}`, ...unread, body: body() }, { ...deps, env: {} }), { status: 404, body: null });
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

test("API links need https, an exact host, an allowlisted path, no userinfo and no query; legacy site links name an existing page", () => {
  const accepted = [
    "https://github.com/bucket-foundation/bucket-foundation",
    "https://github.com/bucket-foundation/bucket-foundation/pull/519",
    "https://github.com/bucket-foundation/bucket-foundation/pull/519/files",
    "https://github.com/bucket-foundation/bucket-foundation/pull/519#issuecomment-1",
    "https://github.com/bucket-foundation/bucket-foundation/issues/12",
    "https://github.com/bucket-foundation/bucket-foundation/commit/949b98f95",
    "https://github.com/bucket-foundation/bucket-foundation/blob/dev/reports/2026-09-30-solver-gap-engine.md",
    "https://github.com/bucket-foundation/bucket-foundation/releases/tag/bkt-v0.4.0",
  ];
  for (const href of accepted) assert.equal(checkLink(href, "href"), href);
  const rejected = [
    "http://github.com/a/b",
    "https://gist.github.com/a/b",
    "https://www.github.com/a/b",
    "https://github.com.example.org/a/b",
    "https://example.org/github.com",
    "https://user@github.com/a/b",
    "https://user:pw@github.com/a/b",
    "https://github.com@example.org/a/b",
    "https://github.com:8443/a/b",
    "//github.com/a/b",
    "github.com/a/b",
    "javascript:alert(1)",
    " https://github.com/a/b",
    "https://github.com/login?return_to=https://evil.example",
    "https://github.com/login/oauth",
    "https://github.com/sessions/new",
    "https://github.com/a/b?tab=readme",
    "https://github.com/a/b?",
    "https://github.com/a/b/pull/1?return_to=https://evil.example",
    "https://github.com/a/b#https://evil.example",
    "https://github.com/a/b/wiki/Home",
    "https://github.com/a/b/pull/x",
    "https://github.com/a/b/blob/dev/a%20b",
    "https://github.com/a",
    "https://github.com/",
    "https://github.com/redirect/x",
    42,
  ];
  for (const href of rejected) assert.throws(() => checkLink(href, "href"), Error, String(href));
  const legacy = (JSON.parse(readFileSync(path.join(__dirname, "..", "data", "whats-new.json"), "utf8")) as { entries: { links?: { href: string }[] }[] }).entries;
  for (const link of legacy.flatMap((e) => e.links ?? [])) {
    if (link.href.startsWith("https://")) assert.equal(checkLink(link.href, "href"), link.href);
    else assert.ok(isSitePage(link.href), link.href);
  }
  assert.equal(isSitePage("/research-os/solvability"), true);
  for (const href of ["/no-such-page", "//evil.example/x", "/research-os/solvability/frontier?x=1", "http://github.com/a", "/../etc"]) assert.equal(isSitePage(href), false, href);
  const inLinks = parseEntryBody({ ...production(), links: [{ label: "PR", href: "https://bit.ly/x" }] });
  assert.deepEqual([inLinks.ok, !inLinks.ok && inLinks.field], [false, "links[0].href"]);
  const inEvidence = parseEntryBody({ ...generation(), evidence: ["https://github.com/a/b", "https://user@github.com/a/b"] });
  assert.deepEqual([inEvidence.ok, !inEvidence.ok && inEvidence.field], [false, "evidence[1]"]);
});

test("the leak filter runs on every stored string and never echoes the match", async (t) => {
  const { deps, store } = await bench(t);
  const fixed = ["kind", "category", "date", "source", "status", "state", "image.content_type", "image.base64"];
  const hostile = (field: string): string => {
    if (field === "id" || field === "parent") return "kruse-run-7";
    if (field === "image.filename") return "kruse-plot.png";
    if (field.endsWith("href") || field.startsWith("evidence")) return "https://github.com/ada/kruse-notes/pull/1";
    return "From the kruse corpus";
  };
  const seen: string[] = [];
  for (const make of [production, generation]) {
    for (const field of stringPaths(make())) {
      const body = make();
      setPath(body, field, fixed.includes(field) ? "kruse" : hostile(field));
      const res = await post(deps, body);
      assert.ok(!JSON.stringify(res.body).includes("kruse"), field);
      if (fixed.includes(field)) {
        assert.equal(res.status, 400, field);
        continue;
      }
      assert.equal(res.status, 422, field);
      assert.deepEqual(res.body?.fields, [{ field, kind: "private-corpus" }], field);
      seen.push(field);
    }
  }
  for (const field of ["id", "title", "summary", "plot_title", "discussion", "image_alt", "image.filename", "links[0].label", "links[0].href", "claim", "tool", "run_id", "score.meaning", "evidence[0]", "parent"]) {
    assert.ok(seen.includes(field), field);
  }
  const email = await post(deps, { ...generation(), claim: "Write to ada.lovelace@example.org for the run log" });
  assert.deepEqual([email.status, email.body?.fields, JSON.stringify(email.body).includes("lovelace")], [422, [{ field: "claim", kind: "email" }], false]);
  const secret = await post(deps, { ...generation(), run_id: `ghp_${"a".repeat(36)}` });
  assert.deepEqual([secret.status, JSON.stringify(secret.body).includes("ghp_")], [422, false]);
  const home = await post(deps, { ...generation(), tool: ["", "home", "ada", "run.py"].join("/") });
  assert.deepEqual(home.body?.fields, [{ field: "tool", kind: "absolute-path" }]);
  const unknown = await post(deps, { ...generation(), note: "From the kruse corpus" });
  assert.deepEqual([unknown.status, unknown.body?.field, JSON.stringify(unknown.body).includes("kruse")], [400, "note", false]);
  assert.deepEqual(await store.list("entries"), []);
});

test("lengths are checked before the leak filter, and a hostile string costs under a second", async (t) => {
  const { deps } = await bench(t);
  const { leakHits } = (await import("../src/lib/whats-new/leak-filter.mjs")) as { leakHits: (text: string) => unknown[] };
  const hostile = ["a".repeat(160_000), "A_".repeat(80_000), "a-".repeat(80_000), "a.".repeat(80_000), "a@".repeat(80_000)];
  for (const text of hostile) {
    const started = process.hrtime.bigint();
    leakHits(text);
    const ms = Number(process.hrtime.bigint() - started) / 1e6;
    assert.ok(ms < 1000, `${text.slice(0, 4)} took ${ms} ms`);
  }
  for (const field of ["title", "claim", "tool", "run_id"]) {
    const started = process.hrtime.bigint();
    const res = await post(deps, { ...generation(), [field]: "a".repeat(3_900_000) });
    const ms = Number(process.hrtime.bigint() - started) / 1e6;
    assert.deepEqual([res.status, res.body?.field], [400, field]);
    assert.ok(ms < 1000, `${field} took ${ms} ms`);
  }
  const long = await post(deps, { ...production(), links: [{ label: "PR", href: `https://github.com/a/b/blob/dev/${"a".repeat(600)}` }] });
  assert.deepEqual([long.status, long.body?.field], [400, "links[0].href"]);
  for (const [field, max] of [["title", 120], ["summary", 600], ["plot_title", 200], ["image_alt", 300], ["discussion", 1200]] as const) {
    assert.equal((await post(deps, { ...production(), [field]: "a".repeat(max + 1) })).body?.field, field);
  }
});

test("a write to an id in flight holds the lock: the second writer gets 409 and holds no reserved count", async (t) => {
  for (const second of [tokens.bob, tokens.ada]) {
    const { deps, store } = await bench(t);
    let reached: () => void = () => undefined;
    let release: () => void = () => undefined;
    const atCreate = new Promise<void>((resolve) => (reached = resolve));
    const gate = new Promise<void>((resolve) => (release = resolve));
    const held: DocStore = {
      ...store,
      create: async (name, text) => {
        if (name === "entries/gen-sibling-momentum.json") {
          reached();
          await gate;
        }
        return store.create(name, text);
      },
    };
    const first = post({ ...deps, store: held }, generation(), tokens.ada);
    await atCreate;
    const loser = await post(deps, { ...generation(), title: "Second copy" }, second);
    assert.deepEqual([loser.status, /in flight/.test(String(loser.body?.error))], [409, true]);
    release();
    assert.equal((await first).status, 201);
    const stored = (await readEntry(store, "gen-sibling-momentum")) as StoredEntry;
    assert.deepEqual([stored.poster, stored.title], ["ada", "Sibling momentum"]);
    assert.deepEqual([(await readUsage(store, "ada")).drafts, (await readUsage(store, "bob")).drafts], [1, 0]);
    assert.deepEqual([await store.list("entries"), await store.list("locks")], [["gen-sibling-momentum.json"], []]);
    assert.equal((await post(deps, { ...generation(), title: "Second copy" }, tokens.ada)).status, 200);
  }
});

test("a lock left by a dead writer is broken after its time to live", async (t) => {
  const { deps, store, now } = await bench(t);
  await store.create("locks/gen-sibling-momentum.json", JSON.stringify({ at: now.value }));
  assert.equal((await post(deps, generation())).status, 409);
  now.value += LOCK_TTL_MS + 1;
  assert.equal((await post(deps, generation())).status, 201);
  assert.deepEqual(await store.list("locks"), []);
});

test("the draft count is reserved before the entry is written and released when the write fails", async (t) => {
  const { deps, store } = await bench(t, {}, { draftsPerPoster: 1 });
  const quiet = t.mock.method(console, "error", () => undefined);
  let usageAtCreate = -1;
  const failing: DocStore = {
    ...store,
    create: async (name, text) => {
      if (!name.startsWith("entries/")) return store.create(name, text);
      usageAtCreate = (await readUsage(store, "ada")).drafts;
      throw new Error("blob store is down");
    },
  };
  assert.equal((await post({ ...deps, store: failing }, generation())).status, 503);
  assert.equal(usageAtCreate, 1);
  assert.equal((await readUsage(store, "ada")).drafts, 0);
  assert.equal(await readEntry(store, "gen-sibling-momentum"), null);

  const noCounter: DocStore = {
    ...store,
    write: async (name, text) => {
      if (name.startsWith("counters/")) throw new Error("blob store is down");
      return store.write(name, text);
    },
  };
  assert.equal((await post({ ...deps, store: noCounter }, generation())).status, 503);
  assert.equal(await readEntry(store, "gen-sibling-momentum"), null);
  assert.ok(quiet.mock.callCount() >= 2);

  assert.equal((await post(deps, generation())).status, 201);
  assert.equal((await post(deps, fixture("gen-september-step-change"))).status, 429);
  assert.equal((await readUsage(store, "ada")).drafts, 1);
});

test("a replace cannot change the kind, and machine_generated comes from the kind", async (t) => {
  const { deps, store } = await bench(t);
  assert.equal((await post(deps, generation())).status, 201);
  const flipped = await post(deps, { ...production(), id: "gen-sibling-momentum" });
  assert.equal(flipped.status, 409);
  const kept = (await readEntry(store, "gen-sibling-momentum")) as StoredEntry;
  assert.deepEqual([kept.kind, kept.machine_generated], ["generation", true]);
  assert.equal((await post(deps, { ...generation(), machine_generated: undefined })).status, 200);
  assert.equal((await readEntry(store, "gen-sibling-momentum"))?.machine_generated, true);
  assert.equal((await post(deps, { ...generation(), machine_generated: false })).status, 400);
  const sneaky = await post(deps, { ...production(), machine_generated: true });
  assert.deepEqual([sneaky.status, sneaky.body?.field], [400, "machine_generated"]);
  assert.equal((await post(deps, production())).status, 201);
  assert.equal("machine_generated" in ((await readEntry(store, "gap-score-backtest-2026-10")) as StoredEntry), false);
  assert.equal((await post(deps, { ...generation(), id: "gap-score-backtest-2026-10" })).status, 409);
});

test("an admin revokes a poster: the mark is written, the drafts go, and the token stops working", async (t) => {
  const { deps, store, root } = await bench(t);
  assert.equal((await post(deps, production())).status, 201);
  assert.equal((await post(deps, generation())).status, 201);
  assert.equal((await post(deps, fixture("gen-september-step-change"), tokens.bob)).status, 201);
  const live = (await readEntry(store, "gen-sibling-momentum")) as StoredEntry;
  await writeEntry(store, { ...live, review_state: "published" });

  for (const token of [null, "wrong", tokens.ada, tokens.bob]) {
    assert.deepEqual(await handleRevoke({ authorization: token === null ? null : `Bearer ${token}`, name: "ada" }, deps), { status: 404, body: null });
  }
  assert.equal((await handleRevoke({ authorization: `Bearer ${tokens.root}`, name: "Ada Lovelace" }, deps)).status, 400);
  assert.equal((await handleRevoke({ authorization: `Bearer ${tokens.root}`, name: "ada" }, { ...deps, store: null })).status, 503);
  assert.equal((await post(deps, generation())).status, 200);
  await writeEntry(store, { ...live, review_state: "published" });

  const res = await handleRevoke({ authorization: `Bearer ${tokens.root}`, name: "ada" }, deps);
  assert.deepEqual(res, { status: 200, body: { ok: true, revoked: "ada", deleted: ["gap-score-backtest-2026-10"] } });
  assert.deepEqual((await store.list("entries")).sort(), ["gen-september-step-change.json", "gen-sibling-momentum.json"]);
  assert.deepEqual(await readUsage(store, "ada"), { drafts: 0, image_bytes: 0 });
  assert.equal((await post(deps, generation())).status, 404);
  assert.equal((await post({ ...deps, revocationCache: new Map() }, generation())).status, 404);
  assert.equal((await post(deps, fixture("gen-september-step-change"), tokens.bob)).status, 200);
  const dir = path.join(root, "whats-new-test", "audit");
  const audit = await Promise.all((await readdir(dir)).map(async (n) => JSON.parse(await readFile(path.join(dir, n), "utf8")) as Record<string, unknown>));
  const record = audit.find((r) => r.action === "revoke");
  assert.deepEqual([record?.id, record?.poster, record?.deleted], ["token-ada", "root", ["gap-score-backtest-2026-10"]]);

  const quiet = t.mock.method(console, "error", () => undefined);
  const down: DocStore = { ...store, write: async () => Promise.reject(new Error("blob store is down")) };
  assert.equal((await handleRevoke({ authorization: `Bearer ${tokens.root}`, name: "bob" }, { ...deps, store: down })).status, 503);
  assert.equal(quiet.mock.callCount(), 1);
});

test("the file store writes files 0600 in directories 0700", { skip: process.platform === "win32" }, async (t) => {
  const { deps, root } = await bench(t);
  assert.equal((await post(deps, production())).status, 201);
  const base = path.join(root, "whats-new-test");
  for (const dir of ["entries", "audit", "counters"]) {
    assert.equal((await stat(path.join(base, dir))).mode & 0o777, 0o700, dir);
    for (const name of await readdir(path.join(base, dir))) assert.equal((await stat(path.join(base, dir, name))).mode & 0o777, 0o600, name);
  }
  assert.equal((await stat(base)).mode & 0o777, 0o700);
  assert.equal((await readdir(path.join(base, "entries"))).filter((n) => n.endsWith(".tmp")).length, 0);
});

test("the body is read as a stream and dropped at the byte cap", async () => {
  let pulled = 0;
  const endless = new ReadableStream<Uint8Array>({
    pull(controller) {
      pulled++;
      controller.enqueue(new Uint8Array(1024 * 1024));
    },
  });
  assert.equal(await readCapped(endless, 3 * 1024 * 1024), null);
  assert.ok(pulled <= 6, String(pulled));
  assert.equal((await readCapped(stream("abc"), 3))?.toString(), "abc");
  assert.equal(await readCapped(stream("abcd"), 3), null);
  assert.equal((await readCapped(null, 3))?.length, 0);
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

test("the image object is checked for type and size and stored beside the entry as WebP", async (t) => {
  const { deps, store, root } = await bench(t);
  const withImage = (image: unknown): Record<string, unknown> => ({ ...production(), image });
  assert.equal((await post(deps, production())).status, 201);
  const firstHash = (await readEntry(store, "gap-score-backtest-2026-10"))?.body_hash;
  const kept = JSON.parse(await readFile(path.join(root, "whats-new-test", "entries", `gap-score-backtest-2026-10.image.${firstHash}.json`), "utf8")) as { filename: string; content_type: string; base64: string };
  const webpBytes = Buffer.from(kept.base64, "base64");
  assert.deepEqual([kept.filename, kept.content_type, webpBytes.toString("latin1", 0, 4), webpBytes.toString("latin1", 8, 12)], ["gap-score-backtest.webp", "image/webp", "RIFF", "WEBP"]);
  assert.deepEqual((await readEntry(store, "gap-score-backtest-2026-10"))?.image, { filename: "gap-score-backtest.webp", content_type: "image/webp", bytes: webpBytes.length, width: 1, height: 1 });
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
  const signature = header.subarray(0, 8);
  const fakes = [Buffer.concat([signature, Buffer.alloc(2 * 1024 * 1024)]), header.subarray(0, header.length - 12), Buffer.concat([header, Buffer.from("tail")])];
  for (const fake of fakes) {
    const res = await post(deps, withImage({ filename: "a.png", content_type: "image/png", base64: fake.toString("base64") }));
    assert.deepEqual([res.status, res.body?.field], [400, "image.base64"]);
  }
  const huge = Buffer.from(header);
  huge.writeUInt32BE(5000, 16);
  huge.writeUInt32BE(5000, 20);
  assert.equal(imageSize(huge, "image/png"), null);
  assert.deepEqual(imageSize(header, "image/png"), { width: 1, height: 1 });
  const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 4, 0, 0, 0xff, 0xc0, 0, 11, 8, 0, 2, 0, 3, 1, 1, 0x11, 0, 0xff, 0xd9]);
  assert.deepEqual(imageSize(jpeg, "image/jpeg"), { width: 3, height: 2 });
  assert.equal(imageSize(jpeg.subarray(0, jpeg.length - 2), "image/jpeg"), null);
  assert.equal(imageSize(Buffer.from([0xff, 0xd8, 0xff, 0xd9]), "image/jpeg"), null);
  const webp = Buffer.alloc(30);
  webp.write("RIFF", 0, "latin1");
  webp.writeUInt32LE(22, 4);
  webp.write("WEBPVP8X", 8, "latin1");
  webp.writeUInt32LE(10, 16);
  webp.writeUIntLE(639, 24, 3);
  webp.writeUIntLE(479, 27, 3);
  assert.deepEqual(imageSize(webp, "image/webp"), { width: 640, height: 480 });
  assert.equal(imageSize(Buffer.concat([webp, Buffer.alloc(4)]), "image/webp"), null);
  assert.equal(imageSize(webp, "image/png"), null);

  assert.equal((await readUsage(store, "ada")).image_bytes, webpBytes.length);
  assert.equal((await post(deps, { ...production(), image: undefined })).status, 200);
  assert.equal((await readUsage(store, "ada")).image_bytes, 0);
  assert.equal((await store.list("entries")).some((n) => n.includes(".image.")), false);
  const tight = { ...deps, limits: { ...(deps.limits as Limits), imageBytesPerPoster: webpBytes.length + 10 } };
  assert.equal((await post(tight, production())).status, 200);
  const second = await post(tight, fixture("formal-conjectures-september-2026"));
  assert.deepEqual([second.status, /bytes of images/.test(String(second.body?.error))], [429, true]);
  assert.equal((await readUsage(store, "ada")).image_bytes, webpBytes.length);
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
