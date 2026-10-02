import test from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { readdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileMarks, type MarkStore } from "../src/lib/download/marks";
import { parseTokens, tokenHash } from "../src/lib/whats-new/auth";
import { DEFAULT_LIMITS, handleDelete, handleList, handlePost, handlePublish, handleRetract, type Deps, type Result } from "../src/lib/whats-new/handler";
import { loadPublicEntries } from "../src/lib/whats-new/public";
import { parseEntryBody, validAt } from "../src/lib/whats-new/schema";
import { fileDocs, readEntry, readUsage, type AuditRecord, type DocStore } from "../src/lib/whats-new/store";
import { INSTANT_MARK, queueInstant, queuedInstant, sendInstant } from "../src/lib/whats-new-email/instant";
import { digestLedger, mailedInstantly, sendDailyDigest, type DigestConfig, type Recipient } from "../src/lib/whats-new-email/send";
import { mailWiring } from "../src/lib/whats-new-email/wiring";

const API = path.join(__dirname, "fixtures", "whats-new-api");
const OUTBOX = path.join(__dirname, "fixtures", "whats-new-outbox");
const CONFIG: DigestConfig = { apiKey: "re_test", secret: "s".repeat(40), from: "Bucket <w@bucket.foundation>", postalAddress: "1 Main St" };
const RECIPIENTS: Recipient[] = ["a", "b", "c"].map((n) => ({ key: n.repeat(64), email: `${n}@example.org` }));

const tokens = { ada: randomBytes(24).toString("hex"), bot: randomBytes(24).toString("hex"), bob: randomBytes(24).toString("hex"), root: randomBytes(24).toString("hex") };
const TOKENS_ENV = `ada:${tokenHash(tokens.ada)}:post,bot:${tokenHash(tokens.bot)}:autopublish:generation,bob:${tokenHash(tokens.bob)}:post,root:${tokenHash(tokens.root)}:admin`;

function json(dir: string, name: string): Record<string, unknown> {
  return JSON.parse(readFileSync(path.join(dir, `${name}.json`), "utf8")) as Record<string, unknown>;
}

function firstSentence(row: Record<string, unknown>): Record<string, unknown> {
  const claim = String(row.claim);
  return { ...row, claim: claim.slice(0, claim.search(/[.!?]\s/) + 1) };
}

const generation = (id: string, over: Record<string, unknown> = {}): Record<string, unknown> => ({ ...firstSentence(json(OUTBOX, "fc-solved-ame-11-10-open-1fba4c")), id, ...over });
const production = (id: string, over: Record<string, unknown> = {}): Record<string, unknown> => ({ ...json(API, "gap-score-backtest-2026-10"), id, ...over });

interface Bench {
  deps: Deps;
  store: DocStore;
  root: string;
  now: { value: number };
}

async function bench(t: { after(fn: () => Promise<void>): void }, limits = { ratePerMinute: 1000, draftsPerPoster: 50, draftsTotal: 500, imageBytesPerPoster: 10_000_000 }): Promise<Bench> {
  const root = await mkdtemp(path.join(tmpdir(), "whats-new-timeline-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const store = fileDocs(root, "whats-new-test/");
  const now = { value: Date.parse("2026-10-02T12:00:00.000Z") };
  const deps: Deps = { env: { WHATS_NEW_TOKENS: TOKENS_ENV }, store, marks: fileMarks(path.join(root, "marks")), legacy: [], clock: () => now.value, limits, revocationCache: new Map() };
  return { deps, store, root, now };
}

function post(deps: Deps, body: unknown, token: string = tokens.ada): Promise<Result> {
  const bytes = new TextEncoder().encode(JSON.stringify(body));
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(bytes);
      controller.close();
    },
  });
  return handlePost({ authorization: `Bearer ${token}`, contentType: "application/json", contentLength: String(bytes.length), body: stream }, deps);
}

const bearer = (token: string | null): string | null => (token === null ? null : `Bearer ${token}`);
const retract = (deps: Deps, id: string, token: string | null): Promise<Result> => handleRetract({ authorization: bearer(token), id }, deps);

async function publish(deps: Deps, store: DocStore, id: string): Promise<Result> {
  return handlePublish({ authorization: bearer(tokens.root), id, ifMatch: (await readEntry(store, id))?.body_hash ?? "" }, deps);
}

async function publicIds(deps: Deps): Promise<string[]> {
  return ((await handleList({ authorization: null, kind: null, state: null }, deps)).body as { entries: { id: string }[] }).entries.map((e) => e.id);
}

async function audits(root: string): Promise<AuditRecord[]> {
  const dir = path.join(root, "whats-new-test", "audit");
  return Promise.all(readdirSync(dir).sort().map(async (n) => JSON.parse(await readFile(path.join(dir, n), "utf8")) as AuditRecord));
}

test("at takes ISO 8601 with a zone, is stored in UTC, and defaults to the first post time", async (t) => {
  assert.equal(validAt("2026-09-23T17:40:00Z"), "2026-09-23T17:40:00.000Z");
  assert.equal(validAt("2026-09-23T19:40+02:00"), "2026-09-23T17:40:00.000Z");
  assert.equal(validAt("2026-09-23T17:40:00.123456-05:00"), "2026-09-23T22:40:00.123Z");
  for (const bad of ["2026-09-23", "2026-09-23T17:40:00", "2026-02-30T10:00:00Z", "2026-13-01T10:00:00Z", "2026-09-23 17:40:00Z", "yesterday", 1727000000, null]) {
    const res = parseEntryBody(generation("gen-a", { at: bad }));
    assert.deepEqual([res.ok, !res.ok && res.field], [false, "at"], String(bad));
  }
  const ok = parseEntryBody(production("prod-a", { at: "2026-10-01T08:00:00+01:00" }));
  assert.ok(ok.ok && ok.entry.at === "2026-10-01T07:00:00.000Z");

  const b = await bench(t);
  assert.equal((await post(b.deps, generation("gen-a"))).status, 201);
  assert.equal((await readEntry(b.store, "gen-a"))?.at, "2026-10-02T12:00:00.000Z");
  b.now.value += 3_600_000;
  assert.equal((await post(b.deps, generation("gen-a", { title: "Second take" }))).status, 200);
  assert.equal((await readEntry(b.store, "gen-a"))?.at, "2026-10-02T12:00:00.000Z");
  assert.equal((await post(b.deps, generation("gen-a", { at: "2026-09-23T17:40:00Z" }))).status, 200);
  assert.equal((await readEntry(b.store, "gen-a"))?.at, "2026-09-23T17:40:00.000Z");
  assert.equal((await publish(b.deps, b.store, "gen-a")).status, 200);
  const [view] = await loadPublicEntries([], b.store);
  assert.deepEqual([view.at, view.date], ["2026-09-23T17:40:00.000Z", "2026-10-02"]);
});

test("the autopublish scope publishes own generations at once and leaves everything else a draft", async (t) => {
  assert.deepEqual(parseTokens(TOKENS_ENV).map((r) => r.scope), ["post", "autopublish:generation", "post", "admin"]);
  assert.deepEqual(parseTokens(`x:${tokenHash("y")}:autopublish:production`), []);
  const b = await bench(t);
  const auto = await post(b.deps, generation("gen-auto"), tokens.bot);
  assert.deepEqual([auto.status, auto.body?.review_state, auto.publicChanged], [201, "published", true]);
  const stored = await readEntry(b.store, "gen-auto");
  assert.deepEqual([stored?.review_state, stored?.autopublished, stored?.published_at], ["published", true, "2026-10-02T12:00:00.000Z"]);
  assert.deepEqual(await publicIds(b.deps), ["gen-auto"]);
  assert.equal((await readUsage(b.store, "bot")).drafts, 0);
  assert.deepEqual((await audits(b.root)).map((a) => a.action), ["autopublish"]);

  const prod = await post(b.deps, production("prod-bot"), tokens.bot);
  assert.deepEqual([prod.status, prod.body?.review_state, prod.publicChanged], [201, "draft", false]);
  const third = await post(b.deps, generation("gen-third", { source: "third-party" }), tokens.bot);
  assert.deepEqual([third.status, third.body?.review_state], [201, "draft"]);
  const leak = await post(b.deps, generation("gen-leak", { claim: `Read ${["", "home", "someone", "notes.txt"].join("/")} for the result.` }), tokens.bot);
  assert.equal(leak.status, 422);
  const link = await post(b.deps, generation("gen-link", { evidence: ["https://example.com/x"] }), tokens.bot);
  assert.deepEqual([link.status, link.body?.field], [400, "evidence[0]"]);
  assert.equal(await readEntry(b.store, "gen-leak"), null);
  assert.equal(await readEntry(b.store, "gen-link"), null);
  assert.deepEqual(await publicIds(b.deps), ["gen-auto"]);

  assert.equal((await post(b.deps, generation("gen-later"), tokens.ada)).status, 201);
  assert.deepEqual(await publicIds(b.deps), ["gen-auto"]);
  assert.deepEqual(await handlePublish({ authorization: bearer(tokens.bot), id: "prod-bot", ifMatch: "x" }, b.deps), { status: 404, body: null });
  assert.deepEqual(await handleDelete({ authorization: bearer(tokens.bot), id: "gen-auto" }, b.deps), { status: 404, body: null });
  assert.equal((await handleList({ authorization: bearer(tokens.bot), kind: null, state: "draft" }, b.deps)).status, 404);

  const before = (await readUsage(b.store, "bot")).drafts;
  assert.equal((await post(b.deps, generation("gen-third", { source: "own" }), tokens.bot)).body?.review_state, "published");
  assert.equal((await readUsage(b.store, "bot")).drafts, before - 1);
});

test("one call retracts a published entry: the owner or an admin, every status code", async (t) => {
  const b = await bench(t);
  assert.equal((await post(b.deps, generation("gen-auto"), tokens.bot)).status, 201);
  assert.equal((await post(b.deps, generation("gen-bob"), tokens.bob)).status, 201);
  for (const token of [null, "wrong", randomBytes(24).toString("hex")]) assert.deepEqual(await retract(b.deps, "gen-auto", token), { status: 404, body: null });
  assert.deepEqual([(await retract(b.deps, "Bad Id", tokens.bot)).status, (await retract(b.deps, "Bad Id", tokens.bot)).body?.field], [400, "id"]);
  const other = await retract(b.deps, "gen-auto", tokens.bob);
  assert.deepEqual([other.status, other.body?.error], [404, "No stored entry has this id."]);
  assert.equal((await retract(b.deps, "gen-missing", tokens.bot)).status, 404);
  assert.equal((await retract({ ...b.deps, store: null }, "gen-auto", tokens.bot)).status, 503);

  const done = await retract(b.deps, "gen-auto", tokens.bot);
  assert.deepEqual([done.status, done.body?.review_state, done.body?.changed, done.publicChanged], [200, "draft", true, true]);
  assert.deepEqual(await publicIds(b.deps), []);
  const entry = await readEntry(b.store, "gen-auto");
  assert.deepEqual([entry?.review_state, entry?.published_at, entry?.autopublished], ["draft", undefined, undefined]);
  assert.equal((await readUsage(b.store, "bot")).drafts, 1);
  const again = await retract(b.deps, "gen-auto", tokens.bot);
  assert.deepEqual([again.status, again.body?.changed, again.publicChanged], [200, false, undefined]);

  assert.equal((await publish(b.deps, b.store, "gen-bob")).status, 200);
  assert.equal((await retract(b.deps, "gen-bob", tokens.root)).status, 200);
  assert.equal((await handleDelete({ authorization: bearer(tokens.root), id: "gen-bob" }, b.deps)).status, 200);
  assert.equal((await retract(b.deps, "gen-bob", tokens.bob)).status, 410);
  const actions = (await audits(b.root)).map((a) => [a.action, a.id, a.poster]);
  assert.deepEqual(actions.filter((a) => a[0] === "retract"), [["retract", "gen-auto", "bot"], ["retract", "gen-bob", "root"]]);
  assert.equal((await post(b.deps, generation("gen-auto"), tokens.bot)).body?.review_state, "published");
});

test("the caps fit the research outbox: drafts count against the poster, published rows do not", async (t) => {
  assert.deepEqual(DEFAULT_LIMITS, { ratePerMinute: 120, draftsPerPoster: 1000, draftsTotal: 20000, imageBytesPerPoster: 50 * 1024 * 1024 });
  const b = await bench(t, { ...DEFAULT_LIMITS, draftsPerPoster: 200 });
  for (let i = 0; i < 200; i++) {
    b.now.value += 1000;
    assert.equal((await post(b.deps, generation(`gen-${i}`))).status, 201, `row ${i}`);
  }
  const full = await post(b.deps, generation("gen-over"));
  assert.deepEqual([full.status, /maximum number of drafts/.test(String(full.body?.error))], [429, true]);
  for (let i = 0; i < 20; i++) assert.equal((await publish(b.deps, b.store, `gen-${i}`)).status, 200);
  assert.equal((await readUsage(b.store, "ada")).drafts, 180);
  for (let i = 0; i < 20; i++) {
    b.now.value += 1000;
    assert.equal((await post(b.deps, generation(`gen-more-${i}`))).status, 201);
  }
  for (let i = 0; i < 40; i++) assert.equal((await post(b.deps, generation(`gen-bot-${i}`), tokens.bot)).status, 201);
  assert.equal((await readUsage(b.store, "bot")).drafts, 0);
  const burst = await bench(t, DEFAULT_LIMITS);
  const codes: number[] = [];
  for (let i = 0; i < 121; i++) codes.push((await post(burst.deps, generation(`gen-burst-${i}`))).status);
  assert.deepEqual([codes.filter((c) => c === 201).length, codes[120]], [120, 429]);
});

test("outbox rows: the research entries post as they are, and the upstream rows need a one-sentence claim", async (t) => {
  const b = await bench(t);
  const atlas = await post(b.deps, json(OUTBOX, "atlas-score-backtest-2026-10"));
  assert.equal(atlas.status, 201);
  assert.equal((await readEntry(b.store, "atlas-score-backtest-2026-10"))?.image && true, true);
  for (const name of ["fc-solved-ame-11-10-open-1fba4c", "fc-solved-bounded-burnside-problem-84533c", "fc-solved-conjecture-02a3f8"]) {
    const verbatim = await post(b.deps, json(OUTBOX, name), tokens.bot);
    assert.deepEqual([verbatim.status, verbatim.body?.error], [400, "claim must be one sentence"], name);
    const trimmed = await post(b.deps, firstSentence(json(OUTBOX, name)), tokens.bot);
    assert.deepEqual([trimmed.status, trimmed.body?.review_state], [201, "published"], name);
  }
  assert.equal((await publicIds(b.deps)).length, 3);
});

interface Mail {
  to: string;
  subject: string;
  text: string;
  key: string;
}

function mailer(outbox: Mail[], hook?: (n: number) => void): (url: string, init: RequestInit) => Promise<Response> {
  return async (_url, init) => {
    const body = JSON.parse(String(init.body)) as { to: string; subject: string; text: string };
    outbox.push({ to: body.to, subject: body.subject, text: body.text, key: String((init.headers as Record<string, string>)["idempotency-key"]) });
    hook?.(outbox.length);
    return new Response("{}", { status: 200 });
  };
}

function counting(marks: MarkStore): { marks: MarkStore; sets: string[] } {
  const sets: string[] = [];
  return { sets, marks: { get: (k) => marks.get(k), set: async (k, v) => (sets.push(k), marks.set(k, v)), sweep: (a, c) => marks.sweep(a, c) } };
}

const ids = (m: Mail): string[] => Array.from(m.text.matchAll(/whats-new#([a-z0-9-]+)/g)).map((x) => x[1]);

test("a published production is mailed at once, once, and leaves the daily digest to the small rows", async (t) => {
  const b = await bench(t);
  assert.equal((await post(b.deps, production("prod-a", { title: "Gap score backtest" }))).status, 201);
  assert.equal((await post(b.deps, generation("gen-a"), tokens.bot)).status, 201);
  assert.equal((await publish(b.deps, b.store, "prod-a")).status, 200);
  const progress = fileMarks(path.join(b.root, "progress"));
  const ledger = digestLedger(b.store);
  const entries = () => loadPublicEntries([], b.store);
  await queueInstant(b.store, "prod-a", b.now.value);
  assert.deepEqual(await queuedInstant(b.store), ["prod-a"]);

  const outbox: Mail[] = [];
  const clock = { value: 0 };
  const first = await sendInstant({ id: "prod-a", entries, store: b.store, ledger, recipients: async () => RECIPIENTS, config: CONFIG, progress, now: b.now.value, fetcher: mailer(outbox, (n) => void (clock.value = n >= 2 ? 100 : 0)), gapMs: 0, deadline: 50, clock: () => clock.value });
  assert.deepEqual([first.sent, first.pending], [2, 1]);
  assert.deepEqual(outbox.map((m) => [m.subject, ids(m), m.key.startsWith("whats-new/instant-prod-a/")]), [
    ["New on Bucket: Gap score backtest", ["prod-a"], true],
    ["New on Bucket: Gap score backtest", ["prod-a"], true],
  ]);
  assert.equal(await ledger.mailedOn("prod-a"), INSTANT_MARK);
  assert.deepEqual(await queuedInstant(b.store), ["prod-a"]);
  const rest = await sendInstant({ id: "prod-a", entries, store: b.store, ledger, recipients: async () => RECIPIENTS, config: CONFIG, progress, now: b.now.value, fetcher: mailer(outbox), gapMs: 0 });
  assert.deepEqual([rest.sent, rest.pending], [1, 0]);
  assert.deepEqual(outbox.map((m) => m.to), RECIPIENTS.map((r) => r.email));
  assert.deepEqual(await queuedInstant(b.store), []);
  assert.equal((await sendInstant({ id: "prod-a", entries, store: b.store, ledger, recipients: async () => RECIPIENTS, config: CONFIG, progress, now: b.now.value, fetcher: mailer(outbox), gapMs: 0 })).skipped, "done");

  const digestOut: Mail[] = [];
  const daily = await sendDailyDigest({ entries, ledger, recipients: async () => RECIPIENTS, config: CONFIG, now: Date.parse("2026-10-03T06:00:00Z"), fetcher: mailer(digestOut), gapMs: 0, progress, instant: mailedInstantly });
  assert.equal(daily.sent, 3);
  assert.deepEqual(digestOut.map(ids), [["gen-a"], ["gen-a"], ["gen-a"]]);
  assert.ok(digestOut[0].text.includes("MACHINE-MADE CLAIMS") && digestOut[0].text.includes("candidate"));
  for (const r of RECIPIENTS) {
    const got = [...outbox, ...digestOut].filter((m) => m.to === r.email).flatMap(ids);
    assert.equal(new Set(got).size, got.length, r.email);
  }
});

test("an instant email with no network writes nothing but its queue entry, and a retraction drops it", async (t) => {
  const b = await bench(t);
  assert.equal((await post(b.deps, production("prod-a"))).status, 201);
  assert.equal((await publish(b.deps, b.store, "prod-a")).status, 200);
  const progress = counting(fileMarks(path.join(b.root, "progress")));
  const ledger = digestLedger(b.store);
  const entries = () => loadPublicEntries([], b.store);
  await queueInstant(b.store, "prod-a", b.now.value);
  const quiet = t.mock.method(console, "error", () => undefined);
  const offline = await sendInstant({ id: "prod-a", entries, store: b.store, ledger, recipients: async () => RECIPIENTS, config: CONFIG, progress: progress.marks, now: b.now.value, fetcher: async () => Promise.reject(new TypeError("fetch failed")), gapMs: 0 });
  assert.deepEqual([offline.skipped, offline.sent, offline.pending], ["offline", 0, 3]);
  assert.deepEqual(progress.sets, []);
  assert.equal(await ledger.mailedOn("prod-a"), null);
  assert.deepEqual(await queuedInstant(b.store), ["prod-a"]);
  assert.equal(quiet.mock.callCount(), 1);

  assert.equal((await retract(b.deps, "prod-a", tokens.root)).status, 200);
  const outbox: Mail[] = [];
  const dropped = await sendInstant({ id: "prod-a", entries, store: b.store, ledger, recipients: async () => RECIPIENTS, config: CONFIG, progress: progress.marks, now: b.now.value, fetcher: mailer(outbox), gapMs: 0 });
  assert.deepEqual([dropped.skipped, outbox.length], ["retracted", 0]);
  assert.deepEqual(await queuedInstant(b.store), []);

  assert.equal((await post(b.deps, generation("gen-a"), tokens.bot)).status, 201);
  await queueInstant(b.store, "gen-a", b.now.value);
  assert.equal((await sendInstant({ id: "gen-a", entries, store: b.store, ledger, recipients: async () => RECIPIENTS, config: CONFIG, progress: progress.marks, now: b.now.value, fetcher: mailer(outbox), gapMs: 0 })).skipped, "retracted");
  assert.equal(outbox.length, 0);
});

test("the publish route mails productions alone, and the cron resumes the instant queue before the digest", () => {
  const src = path.join(__dirname, "..", "src", "app", "api");
  const route = readFileSync(path.join(src, "whats-new", "entries", "[id]", "publish", "route.ts"), "utf8");
  assert.ok(route.includes('result.body.changed === true && result.body.kind === "production" ? await mailNow(params.id) : undefined'));
  assert.ok(route.includes("await queueInstant(store, id, Date.now());"));
  const cron = readFileSync(path.join(src, "cron", "whats-new-daily", "route.ts"), "utf8");
  assert.ok(cron.indexOf("queuedInstant(store)") < cron.indexOf("sendDailyDigest("));
  assert.ok(cron.includes("instant: mailedInstantly"));
  const retractRoute = readFileSync(path.join(src, "whats-new", "entries", "[id]", "retract", "route.ts"), "utf8");
  assert.ok(retractRoute.includes("if (result.publicChanged) revalidateWhatsNew();"));
  assert.deepEqual(mailWiring({}), { status: 503, error: "Digest email is not configured.", missing: ["RESEND_API_KEY", "WHATS_NEW_UNSUBSCRIBE_SECRET", "INVITE_POSTAL_ADDRESS"] });
});
