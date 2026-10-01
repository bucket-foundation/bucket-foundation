import test from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileMarks, type MarkStore } from "../src/lib/download/marks";
import { tokenHash } from "../src/lib/whats-new/auth";
import { handleDelete, handleList, handlePost, handlePublish, handleRevoke, type Deps, type LegacyEntry, type Result } from "../src/lib/whats-new/handler";
import { feedItems, feedItemXml, loadPublicEntries, pageSections, type PublicEntry } from "../src/lib/whats-new/public";
import { fileDocs, readEntry, readUsage, writeEntry, type AuditRecord, type DocStore } from "../src/lib/whats-new/store";
import { digestLedger, sendDailyDigest, type DigestConfig, type Recipient, type SendReport } from "../src/lib/whats-new-email/send";

const FIXTURES = path.join(__dirname, "fixtures", "whats-new-api");
const LEGACY: LegacyEntry[] = [{ id: "pr-496", date: "2026-09-30", category: "pr-merged", title: "Legacy row", summary: "A legacy row." }];
const CONFIG: DigestConfig = { apiKey: "re_test", secret: "s".repeat(40), from: "Bucket <w@bucket.foundation>", postalAddress: "1 Main St" };
const DAY = 86_400_000;

const tokens = { ada: randomBytes(24).toString("hex"), bob: randomBytes(24).toString("hex"), root: randomBytes(24).toString("hex"), chief: randomBytes(24).toString("hex") };
const TOKENS_ENV = `ada:${tokenHash(tokens.ada)}:post,bob:${tokenHash(tokens.bob)}:post,root:${tokenHash(tokens.root)}:admin,chief:${tokenHash(tokens.chief)}:admin`;

function fixture(name: string): Record<string, unknown> {
  return JSON.parse(readFileSync(path.join(FIXTURES, `${name}.json`), "utf8")) as Record<string, unknown>;
}

function production(id: string, title = `Production ${id}`): Record<string, unknown> {
  return { ...fixture("gap-score-backtest-2026-10"), id, title };
}

function generation(id: string, state = "tested"): Record<string, unknown> {
  const { parent: _parent, ...rest } = fixture("gen-sibling-momentum");
  return { ...rest, id, state, title: `Generation ${id}` };
}

interface Bench {
  deps: Deps;
  store: DocStore;
  root: string;
  now: { value: number };
}

async function bench(t: { after(fn: () => Promise<void>): void }, over: Partial<Deps> = {}): Promise<Bench> {
  const root = await mkdtemp(path.join(tmpdir(), "whats-new-publish-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const store = fileDocs(root, "whats-new-test/");
  const now = { value: Date.parse("2026-10-01T12:00:00.000Z") };
  const deps: Deps = {
    env: { WHATS_NEW_TOKENS: TOKENS_ENV },
    store,
    marks: fileMarks(path.join(root, "marks")),
    legacy: LEGACY,
    clock: () => now.value,
    limits: { ratePerMinute: 1000, draftsPerPoster: 50, draftsTotal: 100, imageBytesPerPoster: 10_000_000 },
    revocationCache: new Map(),
    ...over,
  };
  return { deps, store, root, now };
}

function post(deps: Deps, body: unknown, token: string = tokens.ada): Promise<Result> {
  const raw = JSON.stringify(body);
  const bytes = new TextEncoder().encode(raw);
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(bytes);
      controller.close();
    },
  });
  return handlePost({ authorization: `Bearer ${token}`, contentType: "application/json", contentLength: String(bytes.length), body: stream }, deps);
}

const auth = (token: string | null): string | null => (token === null ? null : `Bearer ${token}`);

function publish(deps: Deps, id: string, token: string | null = tokens.root, ifMatch: string | null = null): Promise<Result> {
  return handlePublish({ authorization: auth(token), id, ifMatch }, deps);
}

function remove(deps: Deps, id: string, token: string | null = tokens.root): Promise<Result> {
  return handleDelete({ authorization: auth(token), id }, deps);
}

async function publicIds(deps: Deps): Promise<string[]> {
  const res = await handleList({ authorization: null, kind: null, state: null }, deps);
  assert.equal(res.status, 200);
  return (res.body as { entries: { id: string }[] }).entries.map((e) => e.id);
}

async function audits(root: string): Promise<AuditRecord[]> {
  const dir = path.join(root, "whats-new-test", "audit");
  const names = readdirSync(dir).sort();
  return Promise.all(names.map(async (n) => JSON.parse(await readFile(path.join(dir, n), "utf8")) as AuditRecord));
}

function failing(store: DocStore, when: (op: string, name: string) => boolean): DocStore {
  const guard = (op: string, name: string): void => {
    if (when(op, name)) throw new Error(`store ${op} is down`);
  };
  return {
    kind: store.kind,
    prefix: store.prefix,
    read: async (name) => (guard("read", name), store.read(name)),
    write: async (name, text) => (guard("write", name), store.write(name, text)),
    create: async (name, text) => (guard("create", name), store.create(name, text)),
    remove: async (name) => (guard("remove", name), store.remove(name)),
    list: async (dir) => (guard("list", dir), store.list(dir)),
  };
}

function counting(store: DocStore): { store: DocStore; writes: string[] } {
  const writes: string[] = [];
  return {
    writes,
    store: {
      ...store,
      write: async (name, text) => (writes.push(name), store.write(name, text)),
      create: async (name, text) => (writes.push(name), store.create(name, text)),
      remove: async (name) => (writes.push(name), store.remove(name)),
    },
  };
}

function countingMarks(marks: MarkStore): { marks: MarkStore; sets: string[] } {
  const sets: string[] = [];
  return { sets, marks: { get: (k) => marks.get(k), set: async (k, v) => (sets.push(k), marks.set(k, v)), sweep: (a, b) => marks.sweep(a, b) } };
}

interface Mail {
  to: string;
  text: string;
}

function mailer(outbox: Mail[], hook?: (count: number) => Promise<void> | void): (url: string, init: RequestInit) => Promise<Response> {
  return async (_url, init) => {
    const body = JSON.parse(String(init.body)) as { to: string; text: string };
    outbox.push({ to: body.to, text: body.text });
    await hook?.(outbox.length);
    return new Response("{}", { status: 200 });
  };
}

const RECIPIENTS: Recipient[] = ["a", "b", "c", "d"].map((n) => ({ key: `${n}`.repeat(64), email: `${n}@example.org` }));

function digestRun(b: Bench, at: string, progress: MarkStore, fetcher: (url: string, init: RequestInit) => Promise<Response>, over: { deadline?: number; clock?: () => number; store?: DocStore } = {}): Promise<SendReport> {
  const store = over.store ?? b.store;
  return sendDailyDigest({
    entries: () => loadPublicEntries(LEGACY, store),
    ledger: digestLedger(store),
    recipients: async () => RECIPIENTS,
    config: CONFIG,
    now: Date.parse(at),
    fetcher,
    gapMs: 0,
    progress,
    deadline: over.deadline,
    clock: over.clock,
  });
}

function digestIds(mail: Mail): string[] {
  return Array.from(mail.text.matchAll(/whats-new#([a-z0-9-]+)/g)).map((m) => m[1]);
}

async function surfaces(b: Bench, digestAt: string): Promise<{ list: string[]; page: string[]; feed: string; digest: string[]; merged: PublicEntry[] }> {
  const merged = await loadPublicEntries(LEGACY, b.store);
  const sections = pageSections(merged);
  const outbox: Mail[] = [];
  const marks = fileMarks(path.join(b.root, `digest-${randomBytes(4).toString("hex")}`));
  const scratch = fileDocs(b.root, `ledger-${randomBytes(4).toString("hex")}/`);
  await sendDailyDigest({ entries: () => loadPublicEntries(LEGACY, b.store), ledger: digestLedger(scratch), recipients: async () => RECIPIENTS.slice(0, 1), config: CONFIG, now: Date.parse(digestAt), fetcher: mailer(outbox), gapMs: 0, progress: marks });
  return {
    list: await publicIds(b.deps),
    page: [...sections.productions, ...sections.milestones].map((e) => e.id),
    feed: feedItems(merged).map((i) => feedItemXml(i, "now")).join("\n"),
    digest: outbox.flatMap(digestIds),
    merged,
  };
}

function absentEverywhere(s: Awaited<ReturnType<typeof surfaces>>, id: string): void {
  assert.ok(!s.list.includes(id), `${id} in the public GET`);
  assert.ok(!s.page.includes(id), `${id} on the page`);
  assert.ok(!s.feed.includes(`#${id}<`), `${id} in feed.xml`);
  assert.ok(!s.digest.includes(id), `${id} in the digest`);
  assert.ok(!JSON.stringify(s.merged).includes(`"${id}"`), `${id} in the merged list`);
}

test("publish and delete answer the same bare 404 to a missing, wrong or poster token and touch nothing", async (t) => {
  const b = await bench(t);
  assert.equal((await post(b.deps, production("prod-a"))).status, 201);
  const before = await readEntry(b.store, "prod-a");
  for (const token of [null, "wrong", randomBytes(24).toString("hex"), tokens.ada, tokens.bob]) {
    assert.deepEqual(await publish(b.deps, "prod-a", token), { status: 404, body: null });
    assert.deepEqual(await remove(b.deps, "prod-a", token), { status: 404, body: null });
    assert.deepEqual(await publish(b.deps, "no such id!", token), { status: 404, body: null });
  }
  assert.deepEqual(await readEntry(b.store, "prod-a"), before);
  assert.deepEqual((await audits(b.root)).map((a) => a.action), ["create"]);
});

test("publish returns 200, 400, 404, 409, 410, 412 and 503", async (t) => {
  const b = await bench(t);
  assert.equal((await post(b.deps, production("prod-a"))).status, 201);
  assert.equal((await post(b.deps, { ...production("prod-third"), source: "third-party" })).status, 201);
  assert.equal((await post(b.deps, production("prod-gone"))).status, 201);
  const draft = await readEntry(b.store, "prod-a");
  assert.ok(draft);

  assert.deepEqual([(await publish(b.deps, "No Such Id")).status, (await publish(b.deps, "No Such Id")).body?.field], [400, "id"]);
  assert.equal((await publish(b.deps, "prod-missing")).status, 404);
  assert.notEqual((await publish(b.deps, "prod-missing")).body, null);
  assert.equal((await publish(b.deps, "prod-third")).status, 409);
  assert.equal((await readEntry(b.store, "prod-third"))?.review_state, "draft");
  await writeEntry(b.store, { ...draft, id: "pr-496" });
  assert.equal((await publish(b.deps, "pr-496")).status, 409);
  assert.equal((await publish(b.deps, "prod-a", tokens.root, "0".repeat(64))).status, 412);
  assert.equal((await readEntry(b.store, "prod-a"))?.review_state, "draft");
  assert.equal((await remove(b.deps, "prod-gone")).status, 200);
  assert.equal((await publish(b.deps, "prod-gone")).status, 410);

  assert.equal((await readUsage(b.store, "ada")).drafts, 2);
  const done = await publish(b.deps, "prod-a", tokens.root, draft.body_hash);
  assert.deepEqual([done.status, done.body?.review_state, done.body?.published_at, done.body?.date, done.body?.changed, done.publicChanged], [200, "published", "2026-10-01T12:00:00.000Z", "2026-10-01", true, true]);
  assert.equal((await readUsage(b.store, "ada")).drafts, 1);
  b.now.value += DAY;
  const again = await publish(b.deps, "prod-a");
  assert.deepEqual([again.status, again.body?.changed, again.body?.published_at, again.publicChanged], [200, false, "2026-10-01T12:00:00.000Z", undefined]);
  assert.equal((await readUsage(b.store, "ada")).drafts, 1);

  assert.equal((await publish({ ...b.deps, store: null }, "prod-a")).status, 503);
  const down = failing(b.store, (op, name) => op === "read" && name.startsWith("entries/"));
  assert.equal((await publish({ ...b.deps, store: down }, "prod-a")).status, 503);
  assert.equal((await post(b.deps, production("prod-b"))).status, 201);
  const noAudit = failing(b.store, (op, name) => op === "create" && name.startsWith("audit/"));
  assert.equal((await publish({ ...b.deps, store: noAudit }, "prod-b")).status, 503);
  assert.equal((await readEntry(b.store, "prod-b"))?.review_state, "draft");
});

test("delete returns 200, 400, 404, 410 and 503, and the tombstone retires the id", async (t) => {
  const b = await bench(t);
  assert.equal((await post(b.deps, production("prod-a"))).status, 201);
  assert.equal((await post(b.deps, production("prod-b"))).status, 201);
  assert.equal((await publish(b.deps, "prod-b")).status, 200);
  const usage = await readUsage(b.store, "ada");
  assert.equal(usage.drafts, 1);
  assert.ok(usage.image_bytes > 0);

  assert.equal((await remove(b.deps, "Bad Id")).status, 400);
  assert.equal((await remove(b.deps, "prod-missing")).status, 404);
  assert.equal((await remove(b.deps, "pr-496")).status, 404);
  assert.equal((await remove({ ...b.deps, store: null }, "prod-a")).status, 503);
  const noAudit = failing(b.store, (op, name) => op === "create" && name.startsWith("audit/"));
  assert.equal((await remove({ ...b.deps, store: noAudit }, "prod-a")).status, 503);
  assert.equal((await readEntry(b.store, "prod-a"))?.review_state, "draft");

  for (const id of ["prod-a", "prod-b"]) {
    const res = await remove(b.deps, id);
    assert.deepEqual([res.status, res.body?.review_state, res.publicChanged], [200, "deleted", true]);
    assert.equal((await remove(b.deps, id)).status, 410);
    const stone = await readEntry(b.store, id);
    assert.deepEqual(Object.keys(stone ?? {}).sort(), ["body_hash", "created_at", "deleted_at", "id", "kind", "poster", "review_state", "updated_at"]);
    assert.equal((await b.store.list("entries")).includes(`${id}.image.json`), false);
    const mine = await post(b.deps, production(id));
    assert.deepEqual([mine.status, /deleted/.test(String(mine.body?.error))], [409, true]);
    assert.equal((await post(b.deps, production(id), tokens.bob)).status, 409);
    assert.equal((await readEntry(b.store, id))?.review_state, "deleted");
  }
  assert.deepEqual(await readUsage(b.store, "ada"), { drafts: 0, image_bytes: 0 });
  assert.deepEqual(await publicIds(b.deps), ["pr-496"]);
  const drafts = await handleList({ authorization: auth(tokens.root), kind: null, state: "draft" }, b.deps);
  assert.deepEqual((drafts.body as { entries: unknown[] }).entries, []);
});

test("the revoke route refuses the caller's own name", async (t) => {
  const b = await bench(t);
  const self = await handleRevoke({ authorization: auth(tokens.root), name: "root" }, b.deps);
  assert.equal(self.status, 409);
  assert.equal((await publish(b.deps, "prod-missing")).status, 404);
  assert.notEqual((await publish(b.deps, "prod-missing")).body, null);
  assert.equal((await handleRevoke({ authorization: auth(tokens.chief), name: "root" }, b.deps)).status, 200);
  assert.deepEqual(await publish(b.deps, "prod-missing"), { status: 404, body: null });
});

test("the audit records publish, delete and revoke with the previous body hash", async (t) => {
  const b = await bench(t);
  assert.equal((await post(b.deps, production("prod-a"))).status, 201);
  assert.equal((await post(b.deps, production("prod-b"), tokens.bob)).status, 201);
  const a = (await readEntry(b.store, "prod-a"))?.body_hash;
  const bHash = (await readEntry(b.store, "prod-b"))?.body_hash;
  b.now.value += 1000;
  assert.equal((await publish(b.deps, "prod-a")).status, 200);
  b.now.value += 1000;
  assert.equal((await remove(b.deps, "prod-a", tokens.chief)).status, 200);
  b.now.value += 1000;
  assert.equal((await handleRevoke({ authorization: auth(tokens.root), name: "bob" }, b.deps)).status, 200);
  const tail = (await audits(b.root)).slice(2);
  assert.deepEqual(
    tail.map((r) => [r.action, r.id, r.poster, r.body_hash, r.previous_body_hash]),
    [
      ["publish", "prod-a", "root", a, a],
      ["delete", "prod-a", "chief", null, a],
      ["revoke", "token-bob", "root", null, null],
    ],
  );
  assert.deepEqual([tail[2].deleted, tail[2].previous_body_hashes], [["prod-b"], { "prod-b": bHash }]);
});

test("a draft, a tombstone and a replaced entry appear in none of the four public surfaces", async (t) => {
  const b = await bench(t);
  for (const body of [production("prod-live"), production("prod-draft"), production("prod-dead"), production("prod-redo"), generation("gen-refuted", "refuted"), generation("gen-draft")]) {
    assert.equal((await post(b.deps, body)).status, 201);
  }
  for (const id of ["prod-live", "prod-dead", "prod-redo", "gen-refuted"]) assert.equal((await publish(b.deps, id)).status, 200);
  const at = "2026-10-02T06:00:00.000Z";

  const first = await surfaces(b, at);
  for (const id of ["prod-live", "prod-dead", "prod-redo"]) {
    assert.ok(first.list.includes(id) && first.page.includes(id) && first.feed.includes(`#${id}<`) && first.digest.includes(id), id);
  }
  assert.ok(first.list.includes("gen-refuted") && first.feed.includes("#gen-refuted<"));
  assert.ok(!first.page.includes("gen-refuted"));
  for (const id of ["prod-draft", "gen-draft"]) absentEverywhere(first, id);

  assert.equal((await remove(b.deps, "prod-dead")).status, 200);
  const replaced = await post(b.deps, production("prod-redo", "Production redo, second take"));
  assert.deepEqual([replaced.status, replaced.body?.review_state, replaced.publicChanged], [200, "draft", true]);
  assert.equal((await readUsage(b.store, "ada")).drafts, 3);
  const second = await surfaces(b, at);
  for (const id of ["prod-draft", "gen-draft", "prod-dead", "prod-redo"]) absentEverywhere(second, id);
  assert.deepEqual(second.list, ["gen-refuted", "prod-live", "pr-496"]);
  assert.deepEqual(second.page, ["prod-live", "pr-496"]);
  assert.deepEqual(second.digest, ["prod-live"]);

  b.now.value = Date.parse("2026-10-03T09:00:00.000Z");
  assert.equal((await publish(b.deps, "prod-redo")).status, 200);
  const third = await surfaces(b, "2026-10-04T06:00:00.000Z");
  assert.ok(third.list.includes("prod-redo") && third.page.includes("prod-redo") && third.feed.includes("#prod-redo<") && third.digest.includes("prod-redo"));
  assert.equal(third.merged.find((e) => e.id === "prod-redo")?.title, "Production redo, second take");
  absentEverywhere(third, "prod-dead");
});

test("generations carry kind, state and machine_generated in the list and the feed, refuted ones labelled", async (t) => {
  const b = await bench(t);
  assert.equal((await post(b.deps, generation("gen-refuted", "refuted"))).status, 201);
  assert.equal((await post(b.deps, production("prod-live"))).status, 201);
  b.now.value = Date.parse("2026-10-05T01:00:00.000Z");
  for (const id of ["gen-refuted", "prod-live"]) assert.equal((await publish(b.deps, id)).status, 200);
  const res = await handleList({ authorization: null, kind: "generation", state: null }, b.deps);
  const [gen] = (res.body as { entries: Record<string, unknown>[] }).entries;
  assert.deepEqual([gen.id, gen.kind, gen.state, gen.machine_generated, gen.date, gen.published_at], ["gen-refuted", "generation", "refuted", true, "2026-10-05", "2026-10-05T01:00:00.000Z"]);
  for (const hidden of ["poster", "body_hash", "review_state", "image"]) assert.ok(!(hidden in gen));
  const merged = await loadPublicEntries(LEGACY, b.store);
  const live = merged.find((e) => e.id === "prod-live");
  assert.ok(live && !("image" in live) && !("poster" in live));
  const xml = feedItems(merged).map((i) => feedItemXml(i, "now")).join("\n");
  assert.match(xml, /<title>Generation, refuted: Generation gen-refuted<\/title>/);
  for (const tag of ['<category domain="kind">generation</category>', '<category domain="state">refuted</category>', '<category domain="machine_generated">true</category>']) assert.ok(xml.includes(tag), tag);
  assert.match(xml, /<title>Legacy row<\/title>/);
  const failingList = await handleList({ authorization: null, kind: null, state: null }, { ...b.deps, store: failing(b.store, (op) => op === "list") });
  assert.equal(failingList.status, 503);
  const cached = await handleList({ authorization: null, kind: null, state: null }, { ...b.deps, store: null, published: async () => [] });
  assert.deepEqual((cached.body as { entries: { id: string }[] }).entries.map((e) => e.id), ["pr-496"]);
});

test("the four surfaces read the merged list through one module", () => {
  const src = path.join(__dirname, "..", "src");
  const readers = ["app/whats-new/page.tsx", "app/feed.xml/route.ts", "app/api/whats-new/entries/route.ts", "app/api/cron/whats-new-daily/route.ts"];
  for (const file of readers) {
    const text = readFileSync(path.join(src, file), "utf8");
    assert.ok(text.includes('from "@/lib/whats-new/cached"'), file);
    assert.ok(!text.includes("data/whats-new.json"), file);
  }
  const walk = (dir: string): string[] => readdirSync(dir).flatMap((n) => (statSync(path.join(dir, n)).isDirectory() ? walk(path.join(dir, n)) : [path.join(dir, n)]));
  const importers = walk(src)
    .filter((f) => /\.(ts|tsx|mjs)$/.test(f) && readFileSync(f, "utf8").includes("data/whats-new.json"))
    .map((f) => path.relative(src, f))
    .sort();
  assert.deepEqual(importers, ["app/canon/[slug]/feed.xml/route.ts", "lib/whats-new/cached.ts"]);
  const cached = readFileSync(path.join(src, "lib/whats-new/cached.ts"), "utf8");
  for (const call of ["revalidateTag(WHATS_NEW_TAG)", 'revalidatePath("/whats-new")']) assert.ok(cached.includes(call), call);
  assert.match(readFileSync(path.join(src, "app/feed.xml/route.ts"), "utf8"), /export const dynamic = "force-dynamic";/);
  for (const route of ["app/api/whats-new/entries/route.ts", "app/api/whats-new/entries/[id]/route.ts", "app/api/whats-new/entries/[id]/publish/route.ts"]) {
    assert.ok(readFileSync(path.join(src, route), "utf8").includes("if (result.publicChanged) revalidateWhatsNew();"), route);
  }
  assert.match(readFileSync(path.join(src, "app/whats-new/page.tsx"), "utf8"), /export const revalidate = 300;/);
});

test("a failed image write rolls the new entry back, and a failed replace keeps the old image", async (t) => {
  const b = await bench(t);
  const noImage = failing(b.store, (op, name) => op === "write" && name.endsWith(".image.json"));
  assert.equal((await post({ ...b.deps, store: noImage }, production("prod-a"))).status, 503);
  assert.equal(await readEntry(b.store, "prod-a"), null);
  assert.deepEqual(await b.store.list("entries"), []);
  assert.deepEqual(await readUsage(b.store, "ada"), { drafts: 0, image_bytes: 0 });

  assert.equal((await post(b.deps, production("prod-a"))).status, 201);
  const image = await b.store.read("entries/prod-a.image.json");
  const before = await readEntry(b.store, "prod-a");
  const usage = await readUsage(b.store, "ada");
  let entryWrites = 0;
  const noEntry = failing(b.store, (op, name) => op === "write" && name === "entries/prod-a.json" && ++entryWrites > 0);
  const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 4, 0, 0, 0xff, 0xc0, 0, 11, 8, 0, 2, 0, 3, 1, 1, 0x11, 0, 0xff, 0xd9]).toString("base64");
  const swapped = { ...production("prod-a", "Second take"), image: { filename: "b.jpg", content_type: "image/jpeg", base64: jpeg } };
  assert.equal((await post({ ...b.deps, store: noEntry }, swapped)).status, 503);
  assert.equal(await b.store.read("entries/prod-a.image.json"), image);
  assert.deepEqual(await readEntry(b.store, "prod-a"), before);
  assert.deepEqual(await readUsage(b.store, "ada"), usage);
});

test("the digest freezes its ids in the first slot, drops a retraction at send time and never mails an entry twice", async (t) => {
  const b = await bench(t);
  for (const id of ["prod-a", "prod-b"]) {
    assert.equal((await post(b.deps, production(id))).status, 201);
    assert.equal((await publish(b.deps, id)).status, 200);
  }
  assert.equal((await post(b.deps, production("prod-late"))).status, 201);
  const progress = fileMarks(path.join(b.root, "progress"));
  const outbox: Mail[] = [];
  const slot = { time: 0 };

  const slot0 = await digestRun(b, "2026-10-02T06:00:00.000Z", progress, mailer(outbox, (n) => void (slot.time = n >= 2 ? 100 : 0)), { deadline: 50, clock: () => slot.time });
  assert.deepEqual([slot0.sent, slot0.pending, slot0.entries], [2, 2, 2]);
  assert.deepEqual(outbox.map(digestIds), [["prod-a", "prod-b"], ["prod-a", "prod-b"]]);
  const freeze = JSON.parse(String(await b.store.read("digest/freeze-2026-10-01.json"))) as { key: string; ids: string[] };
  assert.deepEqual(freeze, { key: "freeze:2026-10-01", ids: ["prod-a", "prod-b"] });

  b.now.value = Date.parse("2026-10-02T06:05:00.000Z");
  assert.equal((await remove(b.deps, "prod-b")).status, 200);
  assert.equal((await publish(b.deps, "prod-late")).status, 200);
  assert.equal((await loadPublicEntries(LEGACY, b.store)).find((e) => e.id === "prod-late")?.date, "2026-10-02");

  const slot1 = await digestRun(b, "2026-10-02T06:10:00.000Z", progress, mailer(outbox));
  assert.deepEqual([slot1.sent, slot1.pending, slot1.resumedAt, slot1.entries], [2, 0, 2, 1]);
  assert.deepEqual(outbox.slice(2).map(digestIds), [["prod-a"], ["prod-a"]]);
  assert.deepEqual(outbox.map((m) => m.to), RECIPIENTS.map((r) => r.email));
  assert.equal((await digestRun(b, "2026-10-02T06:20:00.000Z", progress, mailer(outbox))).skipped, "done");
  assert.equal(outbox.length, 4);

  const next = await digestRun(b, "2026-10-03T06:00:00.000Z", progress, mailer(outbox));
  assert.deepEqual([next.sent, next.entries], [4, 1]);
  assert.deepEqual(outbox.slice(4).map(digestIds), [["prod-late"], ["prod-late"], ["prod-late"], ["prod-late"]]);

  assert.equal((await post(b.deps, production("prod-a", "Production a, corrected"))).status, 200);
  b.now.value = Date.parse("2026-10-03T08:00:00.000Z");
  assert.equal((await publish(b.deps, "prod-a")).status, 200);
  assert.equal((await loadPublicEntries(LEGACY, b.store)).find((e) => e.id === "prod-a")?.date, "2026-10-03");
  const after = await digestRun(b, "2026-10-04T06:00:00.000Z", progress, mailer(outbox));
  assert.deepEqual([after.skipped, after.sent, after.entries], ["empty", 0, 0]);
  assert.equal(outbox.length, 8);

  for (const r of RECIPIENTS) {
    const got = outbox.filter((m) => m.to === r.email).flatMap(digestIds);
    assert.equal(new Set(got).size, got.length, `${r.email} got an entry twice`);
  }
  assert.ok(outbox.slice(2).every((m) => !digestIds(m).includes("prod-b")));
});

test("a digest run with no network writes nothing, and the next run sends the whole day", async (t) => {
  const b = await bench(t);
  assert.equal((await post(b.deps, production("prod-a"))).status, 201);
  assert.equal((await publish(b.deps, "prod-a")).status, 200);
  const docs = counting(b.store);
  const progress = countingMarks(fileMarks(path.join(b.root, "progress")));
  let calls = 0;
  const offline = async (): Promise<Response> => {
    calls++;
    throw new TypeError("fetch failed");
  };
  const down = await digestRun(b, "2026-10-02T06:00:00.000Z", progress.marks, offline, { store: docs.store });
  assert.deepEqual([down.skipped, down.sent, down.failed, down.pending, calls], ["offline", 0, 0, 4, 1]);
  assert.deepEqual([docs.writes, progress.sets], [[], []]);
  assert.equal(await b.store.read("digest/freeze-2026-10-01.json"), null);

  const unreadable = failing(docs.store, (op) => op === "list");
  await assert.rejects(digestRun(b, "2026-10-02T06:10:00.000Z", progress.marks, mailer([]), { store: unreadable }), /store list is down/);
  assert.deepEqual([docs.writes, progress.sets], [[], []]);

  const outbox: Mail[] = [];
  const up = await digestRun(b, "2026-10-02T06:20:00.000Z", progress.marks, mailer(outbox), { store: docs.store });
  assert.deepEqual([up.sent, up.failed, up.skipped], [4, 0, undefined]);
  assert.deepEqual(outbox.map(digestIds), [["prod-a"], ["prod-a"], ["prod-a"], ["prod-a"]]);
  assert.deepEqual(docs.writes.sort(), ["digest/freeze-2026-10-01.json", "digest/mailed-prod-a.json"]);
  assert.ok(progress.sets.includes("done:2026-10-01"));
});

test("an HTTP error from the mail API still counts as a failure and the run goes on", async (t) => {
  const b = await bench(t);
  assert.equal((await post(b.deps, production("prod-a"))).status, 201);
  assert.equal((await publish(b.deps, "prod-a")).status, 200);
  const progress = fileMarks(path.join(b.root, "progress"));
  let n = 0;
  const flaky = async (): Promise<Response> => new Response("{}", { status: ++n === 1 ? 500 : 200 });
  const report = await digestRun(b, "2026-10-02T06:00:00.000Z", progress, flaky);
  assert.deepEqual([report.sent, report.failed, report.skipped], [3, 1, undefined]);
  assert.notEqual(await b.store.read("digest/freeze-2026-10-01.json"), null);
});
