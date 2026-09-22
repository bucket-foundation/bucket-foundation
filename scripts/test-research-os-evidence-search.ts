/**
 * Evidence search on the server side (ros-ai-worker): the pinned keyword
 * ranking against scores computed by hand, eligibility applied before
 * scoring, rank fusion, every check on a worker response, and the search's
 * modes and deadlines with a scripted worker. node:test, no network.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { eligibleKey, fuse, LexicalIndex, RRF_K, tokenize, type Ranked } from "../src/lib/research-os/evidence-search/lexical";
import { checkResponse, loopbackUrl, scoreWithWorker, type WorkerRequest } from "../src/lib/research-os/evidence-search/worker-client";
import { evidenceSearch, FUSE_DEPTH, REQUEST_DEADLINE_MS, RESPONSE_RESERVE_MS, SearchInputError, WORKER_BUDGET_MS } from "../src/lib/research-os/evidence-search/search";

const SECRET = "s".repeat(40);
const REV = "e".repeat(64);
const doc = (id: string, text: string) => ({ sourceId: id, sourceRevision: `rev-${id}`, text });
const TINY = [doc("doc:a", "Red light scatters."), doc("doc:b", "Blue light scatters more."), doc("doc:c", "Blue, blue sky.")];
const all = (docs: { sourceId: string; sourceRevision: string }[]) => new Set(docs.map((d) => eligibleKey(d.sourceId, d.sourceRevision)));

test("tokenize: NFC, lower case, letter and digit runs, the pinned stop list", () => {
  assert.deepEqual(tokenize("The Sky's COLOUR is Ampère 42"), ["sky", "s", "colour", "ampère", "42"]);
  assert.deepEqual(tokenize("of the and a"), []);
  assert.deepEqual(tokenize("λ-law"), ["λ", "law"]);
});

test("BM25 matches scores computed by hand in Python for the same fixture", () => {
  const idx = LexicalIndex.build(TINY);
  const { results } = idx.search("blue light", all(TINY), 10);
  // Lucene IDF, k1 1.2, b 0.75, distinct query terms; computed independently.
  const want: Record<string, number> = { "doc:a": 0.4900511774126154, "doc:b": 0.8689142725551416, "doc:c": 0.664956903112938 };
  assert.deepEqual(results.map((r) => r.sourceId), ["doc:b", "doc:c", "doc:a"]);
  for (const r of results) assert.ok(Math.abs(r.score - want[r.sourceId]) < 1e-12, `${r.sourceId} ${r.score}`);
  assert.equal(idx.search("blue blue light light", all(TINY), 10).results[0].score, results[0].score, "a repeated query term counts once");
});

test("the eligible set applies before scoring: an ineligible document is never scored", () => {
  const idx = LexicalIndex.build(TINY);
  const only = new Set([eligibleKey("doc:a", "rev-doc:a"), eligibleKey("doc:c", "rev-doc:c")]);
  const { results, scored } = idx.search("blue light", only, 10);
  assert.deepEqual(results.map((r) => r.sourceId), ["doc:c", "doc:a"]);
  assert.equal(scored, 2);
  const stale = new Set([eligibleKey("doc:b", "an-older-revision")]);
  assert.deepEqual(idx.search("blue light", stale, 10), { results: [], scored: 0 }, "a revision mismatch is ineligible");
});

test("equal scores fall back to source id order", () => {
  const idx = LexicalIndex.build([doc("doc:z", "prism light"), doc("doc:m", "prism light"), doc("doc:q", "prism light")]);
  assert.deepEqual(idx.search("prism", all(idx.docs), 10).results.map((r) => r.sourceId), ["doc:m", "doc:q", "doc:z"]);
});

test("the paraphrase fixtures' keyword ranking is the one the Python model test compares against", () => {
  const f = JSON.parse(readFileSync(path.join(__dirname, "..", "tools", "evidence-search", "tests", "paraphrase-fixtures.json"), "utf8")) as {
    docs: { id: string; text: string }[];
    queries: { query: string; relevant: string[]; lexicalTop: string }[];
  };
  const idx = LexicalIndex.build(f.docs.map((d) => ({ sourceId: d.id, sourceRevision: "r", text: d.text })));
  for (const q of f.queries) assert.equal(idx.search(q.query, all(idx.docs), 1).results[0]?.sourceId, q.lexicalTop, q.query);
  assert.ok(f.queries.some((q) => !q.relevant.includes(q.lexicalTop)), "at least one query keyword search gets wrong");
});

test("fusion adds 1/(60 + rank) per list, and breaks ties by the better single rank", () => {
  const r = (id: string): Ranked => ({ sourceId: id, sourceRevision: "r", score: 1 });
  const out = fuse([r("x"), r("y"), r("z")], [r("y"), r("w")], 10);
  assert.deepEqual(out.map((f) => f.sourceId), ["y", "x", "w", "z"]);
  assert.ok(Math.abs(out[0].score - (1 / (RRF_K + 2) + 1 / (RRF_K + 1))) < 1e-15);
  assert.deepEqual([out[0].lexicalRank, out[0].denseRank], [2, 1]);
  assert.deepEqual([out[2].lexicalRank, out[2].denseRank], [null, 2]);
  assert.equal(fuse([r("x")], [r("x"), r("x")], 10)[0].score, 2 / (RRF_K + 1), "a duplicate in one list counts once");
});

const REQ: WorkerRequest = { requestId: "req-1", query: "q", corpusRevision: REV, eligible: [["doc:a", "rev-doc:a"], ["doc:b", "rev-doc:b"]], limit: 2, deadlineMs: 1000 };
const good = { requestId: "req-1", corpusRevision: REV, modelRevision: "m".repeat(40), results: [{ sourceId: "doc:b", sourceRevision: "rev-doc:b", score: 0.7 }] };

test("a worker response is trusted only after every check passes", () => {
  assert.deepEqual(checkResponse(good, REQ), { ok: true, results: good.results, modelRevision: good.modelRevision });
  const bad = (over: object, why: RegExp) => {
    const out = checkResponse({ ...good, ...over }, REQ);
    assert.equal(out.ok, false);
    assert.match(out.ok ? "" : out.detail, why);
  };
  bad({ requestId: "other" }, /request id/);
  bad({ corpusRevision: "f".repeat(64) }, /corpus revision/);
  bad({ modelRevision: "" }, /model revision/);
  bad({ results: [good.results[0], good.results[0], good.results[0]] }, /exceed the limit/);
  bad({ results: [{ sourceId: "doc:x", sourceRevision: "rev-doc:x", score: 1 }] }, /not in the eligible set/);
  bad({ results: [{ sourceId: "doc:a", sourceRevision: "an-older-revision", score: 1 }] }, /not in the eligible set/);
  bad({ results: [good.results[0], good.results[0]] }, /appears twice/);
  bad({ results: [{ sourceId: "doc:b", sourceRevision: "rev-doc:b", score: "0.7" }] }, /finite number/);
  bad({ results: [{ sourceId: "doc:b", sourceRevision: "rev-doc:b", score: null }] }, /finite number/);
  bad({ results: [{ sourceId: "doc:b", score: 1 }] }, /lacks its ids/);
});

test("the client refuses a worker off this machine, and a short secret, before any request", async () => {
  assert.equal(loopbackUrl("http://127.0.0.1:8431")?.href, "http://127.0.0.1:8431/");
  assert.equal(loopbackUrl("http://[::1]:8431")?.hostname, "[::1]");
  for (const url of ["http://10.0.0.5:8431", "https://127.0.0.1:8431", "http://127.0.0.1.example:8431", "not a url"]) assert.equal(loopbackUrl(url), null, url);
  let called = 0;
  const spy = (async () => {
    called++;
    return new Response("{}");
  }) as unknown as typeof fetch;
  assert.equal((await scoreWithWorker({ url: "http://10.0.0.5:8431", secret: SECRET }, REQ, spy)).ok, false);
  assert.equal((await scoreWithWorker({ url: "http://127.0.0.1:8431", secret: "short" }, REQ, spy)).ok, false);
  assert.equal(called, 0);
});

test("the client sends the secret, and maps timeouts, refusals and bad bodies to failures", async () => {
  let seen: { url: string; key: string | null; body: unknown } | null = null;
  const ok = (async (url: URL, init: RequestInit) => {
    seen = { url: String(url), key: new Headers(init.headers).get("x-evidence-worker-key"), body: JSON.parse(String(init.body)) };
    return new Response(JSON.stringify(good), { status: 200 });
  }) as unknown as typeof fetch;
  const out = await scoreWithWorker({ url: "http://127.0.0.1:8431", secret: SECRET }, REQ, ok);
  assert.equal(out.ok, true);
  assert.deepEqual(seen, { url: "http://127.0.0.1:8431/score", key: SECRET, body: REQ });

  const reply = (status: number, body: string) => (async () => new Response(body, { status })) as unknown as typeof fetch;
  const cfg = { url: "http://127.0.0.1:8431", secret: SECRET };
  assert.deepEqual(await scoreWithWorker(cfg, REQ, reply(503, '{"error":"queue_full"}')), { ok: false, reason: "http", detail: "HTTP 503 queue_full" });
  assert.equal((await scoreWithWorker(cfg, REQ, reply(200, "not json"))).ok, false);
  // AbortSignal.timeout's timer does not hold the event loop open; a real
  // socket does, so the stand-in holds a timer until the abort arrives.
  const slow = (async (_u: URL, init: RequestInit) =>
    new Promise((_, reject) => {
      const hold = setTimeout(() => undefined, 5000);
      init.signal!.addEventListener("abort", () => {
        clearTimeout(hold);
        reject(Object.assign(new Error("aborted"), { name: "TimeoutError" }));
      });
    })) as unknown as typeof fetch;
  const timed = await scoreWithWorker(cfg, { ...REQ, deadlineMs: 50 }, slow);
  assert.deepEqual(timed.ok ? null : timed.reason, "timeout");
  const refused = (async () => {
    throw new TypeError("fetch failed");
  }) as unknown as typeof fetch;
  const down = await scoreWithWorker(cfg, REQ, refused);
  assert.deepEqual(down.ok ? null : down.reason, "unreachable");
});

const SEARCH = { requestId: "req-1", query: "blue light", corpusRevision: REV, eligible: TINY.map((d) => ({ sourceId: d.sourceId, sourceRevision: d.sourceRevision })), limit: 5, lexical: LexicalIndex.build(TINY) };

test("with a worker answering, the search fuses both rankings", async () => {
  const res = await evidenceSearch(
    { ...SEARCH, worker: { url: "http://127.0.0.1:8431", secret: SECRET } },
    { score: async () => ({ ok: true, results: [{ sourceId: "doc:a", sourceRevision: "rev-doc:a", score: 0.9 }], modelRevision: "m1" }) },
  );
  assert.equal(res.mode, "hybrid");
  assert.equal(res.status, "ok");
  assert.equal(res.worker.modelRevision, "m1");
  assert.deepEqual(res.results.map((r) => [r.sourceId, r.lexicalRank, r.denseRank]), [["doc:a", 3, 1], ["doc:b", 1, null], ["doc:c", 2, null]]);
});

test("a failed, absent or late worker leaves keyword ranking, marked degraded", async () => {
  const failing = await evidenceSearch(
    { ...SEARCH, worker: { url: "http://127.0.0.1:8431", secret: SECRET } },
    { score: async () => ({ ok: false, reason: "unreachable", detail: "connection refused" }) },
  );
  assert.deepEqual([failing.mode, failing.status, failing.worker.failure], ["lexical", "degraded", "unreachable: connection refused"]);
  assert.deepEqual(failing.results.map((r) => r.sourceId), ["doc:b", "doc:c", "doc:a"]);

  const absent = await evidenceSearch({ ...SEARCH, worker: null });
  assert.deepEqual([absent.mode, absent.status, absent.worker.failure], ["lexical", "degraded", "no worker configured"]);

  let called = false;
  const late = await evidenceSearch(
    { ...SEARCH, worker: { url: "http://127.0.0.1:8431", secret: SECRET }, startedAt: 0 },
    { now: () => 7800, score: async () => ((called = true), { ok: false, reason: "timeout", detail: "" }) },
  );
  assert.equal(called, false, "no worker call once the reserve is all that is left");
  assert.deepEqual([late.status, late.worker.failure], ["degraded", "no time left for the worker"]);
});

test("the worker's deadline is the six-second budget or what the request has left, whichever is less", async () => {
  const deadlines: number[] = [];
  const limits: number[] = [];
  const score = async (_c: unknown, req: WorkerRequest) => (deadlines.push(req.deadlineMs), limits.push(req.limit), { ok: false as const, reason: "timeout" as const, detail: "" });
  const worker = { url: "http://127.0.0.1:8431", secret: SECRET };
  await evidenceSearch({ ...SEARCH, worker, startedAt: 1000 }, { now: () => 1000, score });
  await evidenceSearch({ ...SEARCH, worker, startedAt: 1000 }, { now: () => 3500, score });
  assert.deepEqual(deadlines, [WORKER_BUDGET_MS, REQUEST_DEADLINE_MS - 2500 - RESPONSE_RESERVE_MS]);
  assert.deepEqual(limits, [FUSE_DEPTH, FUSE_DEPTH], "the worker is asked for the fusion depth");
});

test("an empty eligible set is an ordinary empty answer with no worker call, and bad input is refused", async () => {
  let called = false;
  const res = await evidenceSearch({ ...SEARCH, eligible: [], worker: { url: "http://127.0.0.1:8431", secret: SECRET } }, { score: async () => ((called = true), { ok: false, reason: "timeout", detail: "" }) });
  assert.deepEqual([res.status, res.results.length, called], ["no_match", 0, false]);
  const hybridNone = await evidenceSearch(
    { ...SEARCH, query: "zebra", worker: { url: "http://127.0.0.1:8431", secret: SECRET } },
    { score: async () => ({ ok: true, results: [], modelRevision: "m1" }) },
  );
  assert.equal(hybridNone.status, "no_match");
  await assert.rejects(evidenceSearch({ ...SEARCH, query: "   ", worker: null }), SearchInputError);
  await assert.rejects(evidenceSearch({ ...SEARCH, query: "x".repeat(513), worker: null }), SearchInputError);
  await assert.rejects(evidenceSearch({ ...SEARCH, limit: 0, worker: null }), SearchInputError);
});
