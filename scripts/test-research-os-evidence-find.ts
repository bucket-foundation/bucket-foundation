/**
 * Evidence search as the route serves it (ros-ai-find): the request and
 * response contract, the pilot gate, the profile read, and the server's
 * eligibility, its second look before hydration, and its cards. node:test,
 * no database and no network: the graph client is a stand-in.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type { SupabaseClient } from "@supabase/supabase-js";
import { decideGate, flagOn, pilotIds, ProfileUnavailable, readBirthYearBucket } from "../src/lib/research-os/evidence-search/gate";
import { isSearchResponse, parseSearchRequest, SCHEMA_VERSION } from "../src/lib/research-os/evidence-search/types";
import {
  cardFor,
  CorpusUnavailable,
  EligibilityUnavailable,
  eligibleSources,
  newestCorpusDir,
  readCorpus,
  runEvidenceSearch,
  workerFromEnv,
  type Corpus,
} from "../src/lib/research-os/evidence-search/server";
import { LexicalIndex } from "../src/lib/research-os/evidence-search/lexical";
import type { PassageRecord, SourceRecord } from "../src/lib/research-os/evidence/corpus";

const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const rev = (c: string) => c.repeat(64);

const body = (over: Record<string, unknown> = {}) => ({ schemaVersion: SCHEMA_VERSION, query: "why is the sky blue", branch: "02-physics", ...over });

test("the request contract takes what it names and refuses the rest", () => {
  const ok = parseSearchRequest(body());
  assert.deepEqual(ok.ok && ok.value, { schemaVersion: 1, query: "why is the sky blue", branch: "02-physics", targetNodeId: null, limit: 5 });
  const spaced = parseSearchRequest(body({ query: "  spaced  " }));
  assert.equal(spaced.ok && spaced.value.query, "spaced");
  const refused: [unknown, RegExp][] = [
    [body({ model: "other" }), /unsupported fields: model/],
    [body({ schemaVersion: 2 }), /schemaVersion 1/],
    [body({ query: "   " }), /query is 1 to 512/],
    [body({ query: "x".repeat(513) }), /query is 1 to 512/],
    [body({ branch: "physics" }), /branch is a canon branch/],
    [body({ targetNodeId: "not-a-uuid" }), /targetNodeId is a node id/],
    [body({ limit: 0 }), /limit is 1 to 5/],
    [body({ limit: 6 }), /limit is 1 to 5/],
    [body({ limit: 2.5 }), /limit is 1 to 5/],
    ["a string", /the body is a JSON object/],
    [[body()], /the body is a JSON object/],
  ];
  for (const [input, why] of refused) {
    const out = parseSearchRequest(input);
    assert.equal(out.ok, false, JSON.stringify(input).slice(0, 60));
    assert.match(out.ok ? "" : out.message, why);
  }
  assert.equal(parseSearchRequest(body({ targetNodeId: uuid(1), limit: 3 })).ok, true);
});

test("a client trusts a response only in the shape it knows", () => {
  const card = { nodeId: uuid(1), slug: "s", sourceId: "graph:x", sourceRevision: rev("a"), title: "T", citation: "C", kind: "summary", excerpt: "E", locator: null, sourceUrl: null, quoteAvailable: false };
  const res = { schemaVersion: 1, requestId: "r", mode: "hybrid", status: "ok", corpusRevision: rev("e"), modelRevision: "m", cards: [card] };
  assert.equal(isSearchResponse(res), true);
  assert.equal(isSearchResponse({ ...res, schemaVersion: 2 }), false);
  assert.equal(isSearchResponse({ ...res, mode: "neural" }), false);
  assert.equal(isSearchResponse({ ...res, cards: [{ ...card, locator: "p. 3" }] }), false, "a summary carries no locator");
  assert.equal(isSearchResponse({ ...res, cards: [{ ...card, quoteAvailable: true }] }), false, "a summary is never quotable");
  assert.equal(isSearchResponse({ ...res, cards: [{ ...card, kind: "passage", locator: "p. 3", quoteAvailable: true }] }), true);
  assert.equal(isSearchResponse(null), false);
});

test("the gate takes an adult on the pilot list, and names every other refusal", () => {
  const base = { flagOn: true, pilotIds: [uuid(1)], learnerId: uuid(1), consentAllowed: true, birthYearBucket: "18plus" as const };
  assert.deepEqual(decideGate(base), { ok: true });
  const refusal = (over: object) => {
    const d = decideGate({ ...base, ...over });
    return d.ok ? null : [d.status, d.error];
  };
  assert.deepEqual(refusal({ flagOn: false }), [404, "feature_off"]);
  assert.deepEqual(refusal({ learnerId: null }), [401, "no_session"]);
  assert.deepEqual(refusal({ consentAllowed: false }), [403, "consent_required"]);
  assert.deepEqual(refusal({ birthYearBucket: "13to17" }), [403, "adults_only"]);
  assert.deepEqual(refusal({ birthYearBucket: null }), [403, "adults_only"]);
  assert.deepEqual(refusal({ pilotIds: [uuid(2)] }), [403, "not_in_pilot"]);
  assert.deepEqual(refusal({ pilotIds: [] }), [403, "not_in_pilot"]);
  assert.deepEqual(pilotIds(" a, b\nc  "), ["a", "b", "c"]);
  assert.deepEqual(pilotIds(undefined), []);
  assert.deepEqual([flagOn("1"), flagOn("true"), flagOn("0"), flagOn(undefined)], [true, true, false, false]);
});

/** A stand-in for the few PostgREST calls the server makes. */
function fakeDb(opts: { eligible?: { source_id: string; source_revision: string; node_id: string | null }[][]; quotes?: string[]; failEligible?: boolean; profile?: { row?: unknown; error?: string } }) {
  const pages = opts.eligible ?? [];
  let call = 0;
  const result = (data: unknown, error: { message: string } | null = null) => {
    const q: Record<string, unknown> = {};
    for (const k of ["select", "in", "eq", "order", "limit"]) q[k] = () => q;
    q.range = () => Promise.resolve({ data, error });
    q.maybeSingle = () => Promise.resolve({ data, error });
    q.then = (resolve: (v: unknown) => void) => resolve({ data, error });
    return q;
  };
  return {
    rpc: () => (opts.failEligible ? result(null, { message: "graph is down" }) : result(pages[Math.min(call++, pages.length - 1)] ?? [])),
    from: (table: string) => {
      if (table === "learner_profiles") return result(opts.profile?.row ?? null, opts.profile?.error ? { message: opts.profile.error } : null);
      return result((opts.quotes ?? []).map((source_revision) => ({ source_id: "x", source_revision })));
    },
  } as unknown as SupabaseClient;
}

test("the profile read answers a band, no band, or an outage", async () => {
  assert.equal(await readBirthYearBucket(fakeDb({ profile: { row: { birth_year_bucket: "18plus" } } }), uuid(1)), "18plus");
  assert.equal(await readBirthYearBucket(fakeDb({ profile: { row: null } }), uuid(1)), null);
  assert.equal(await readBirthYearBucket(fakeDb({ profile: { row: { birth_year_bucket: "other" } } }), uuid(1)), null);
  await assert.rejects(readBirthYearBucket(fakeDb({ profile: { error: "connection reset" } }), uuid(1)), ProfileUnavailable);
});

const record = (n: number, over: Partial<SourceRecord> = {}): SourceRecord => ({
  schemaVersion: 1,
  sourceId: `graph:${uuid(n)}`,
  sourceRevision: rev(String(n)),
  nodeId: uuid(n),
  slug: `node-${n}`,
  title: `Node ${n}`,
  branch: "02-physics",
  kind: "concept",
  aliases: [],
  citation: { label: `Author (200${n}). Title ${n}.`, title: `Title ${n}`, url: `https://example.org/${n}` },
  text: `Node ${n}\n\nBlue light scatters more than red in branch ${n}.`,
  bodyHash: rev("b"),
  originalHash: rev("c"),
  normalization: "nfc-lf/1",
  extraction: "graph-node/1",
  rights: { rule: "sky-blue-seed", permission: "project-authored", rightsRevision: 1 },
  passageIds: [],
  ...over,
});

const passage = (n: number): PassageRecord => ({
  schemaVersion: 1,
  sourceId: `graph:${uuid(n)}`,
  passageId: `graph:${uuid(n)}#locator`,
  quoteRevision: rev("9"),
  start: 0,
  end: 4,
  original: "Blue light is scattered in all directions.",
  originalHash: rev("d"),
  textHash: rev("e"),
  locator: "NASA Space Place, body text",
  url: "https://spaceplace.nasa.gov/blue-sky/en/",
  rights: { rule: "nasa-space-place", permission: "attributed-quotation", rightsRevision: 1 },
});

function corpusOf(records: SourceRecord[], passages: PassageRecord[] = []): Corpus {
  return {
    revision: rev("e"),
    directory: "/tmp/corpus",
    records: new Map(records.map((r) => [r.sourceId, r])),
    passages: new Map(passages.map((p) => [p.sourceId, [p]])),
    lexical: LexicalIndex.build(records.map((r) => ({ sourceId: r.sourceId, sourceRevision: r.sourceRevision, text: r.text }))),
  };
}

const eligibleRow = (r: SourceRecord) => ({ source_id: r.sourceId, source_revision: r.sourceRevision, node_id: r.nodeId });
const ask = { schemaVersion: 1 as const, query: "blue light scatters", branch: "02-physics", targetNodeId: null, limit: 5 };

test("a search returns cards for the admitted sources of its branch", async () => {
  const [a, b] = [record(1), record(2)];
  const svc = fakeDb({ eligible: [[eligibleRow(a), eligibleRow(b)]] });
  const res = await runEvidenceSearch({ corpus: corpusOf([a, b]), svc, worker: null, requestId: "r1" }, ask);
  assert.deepEqual([res.mode, res.status, res.schemaVersion], ["lexical", "degraded", 1]);
  assert.deepEqual(res.cards.map((c) => c.slug).sort(), ["node-1", "node-2"]);
  assert.equal(res.cards[0].kind, "summary");
  assert.equal(res.cards[0].locator, null);
  assert.equal(res.cards[0].quoteAvailable, false);
  assert.equal(res.corpusRevision, rev("e"));
});

test("a stale revision, another branch and an unadmitted source stay out", async () => {
  const mine = record(1);
  const otherBranch = record(2, { branch: "03-chemistry" });
  const unadmitted = record(3);
  const stale = { source_id: mine.sourceId, source_revision: rev("f"), node_id: mine.nodeId };
  const svc = fakeDb({ eligible: [[stale, eligibleRow(otherBranch)]] });
  const res = await runEvidenceSearch({ corpus: corpusOf([mine, otherBranch, unadmitted]), svc, worker: null, requestId: "r2" }, ask);
  assert.deepEqual(res.cards, []);
  assert.equal(res.status, "no_match", "nothing admitted in this branch is an ordinary empty answer");
});

test("a source withdrawn while the search ran never reaches the response", async () => {
  const [a, b] = [record(1), record(2)];
  // The first read admits both; the second, after ranking, admits one.
  const svc = fakeDb({ eligible: [[eligibleRow(a), eligibleRow(b)], [eligibleRow(a)]] });
  const res = await runEvidenceSearch({ corpus: corpusOf([a, b]), svc, worker: null, requestId: "r3" }, ask);
  assert.deepEqual(res.cards.map((c) => c.slug), ["node-1"]);
});

test("a passage is quoted only while its own revision is admitted", async () => {
  const a = record(1, { passageIds: [`graph:${uuid(1)}#locator`] });
  const p = passage(1);
  const admitted = fakeDb({ eligible: [[eligibleRow(a)]], quotes: [p.quoteRevision] });
  const withCard = await runEvidenceSearch({ corpus: corpusOf([a], [p]), svc: admitted, worker: null, requestId: "r4" }, ask);
  assert.deepEqual(
    [withCard.cards[0].kind, withCard.cards[0].quoteAvailable, withCard.cards[0].locator, withCard.cards[0].excerpt],
    ["passage", true, p.locator, p.original],
  );
  const withdrawn = fakeDb({ eligible: [[eligibleRow(a)]], quotes: [] });
  const summaryOnly = await runEvidenceSearch({ corpus: corpusOf([a], [p]), svc: withdrawn, worker: null, requestId: "r5" }, ask);
  assert.deepEqual([summaryOnly.cards[0].kind, summaryOnly.cards[0].quoteAvailable, summaryOnly.cards[0].locator], ["summary", false, null]);
  assert.match(summaryOnly.cards[0].excerpt, /^Blue light scatters/);
});

test("an eligibility read that fails stops the search", async () => {
  await assert.rejects(
    runEvidenceSearch({ corpus: corpusOf([record(1)]), svc: fakeDb({ failEligible: true }), worker: null, requestId: "r6" }, ask),
    EligibilityUnavailable,
  );
  assert.equal(await eligibleSources(fakeDb({ eligible: [[]] })).then((r) => r.length), 0);
});

test("a card takes the node's own text when no passage is admitted", () => {
  const r = record(1);
  const summary = cardFor(r, null, false);
  assert.deepEqual([summary.kind, summary.locator, summary.quoteAvailable, summary.sourceUrl], ["summary", null, false, "https://example.org/1"]);
  assert.equal(summary.excerpt, "Blue light scatters more than red in branch 1.");
  const quoted = cardFor(r, passage(1), true);
  assert.deepEqual([quoted.kind, quoted.quoteAvailable, quoted.sourceUrl], ["passage", true, "https://spaceplace.nasa.gov/blue-sky/en/"]);
});

test("a corpus directory is read only when it matches its manifest", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "find-corpus-"));
  try {
    const one = path.join(dir, "one");
    mkdirSync(one);
    writeFileSync(path.join(one, "manifest.json"), JSON.stringify({ corpusRevision: rev("a") }));
    assert.equal(newestCorpusDir(dir), one);
    assert.equal(newestCorpusDir(path.join(dir, "missing")), null);
    assert.throws(() => readCorpus(one, { version: 1, status: "draft", reviewedAt: "2026-09-22", reviewer: "x", index: [], quote: [] }, rev("f")), CorpusUnavailable);
    assert.throws(() => readCorpus(path.join(dir, "missing"), { version: 1, status: "draft", reviewedAt: "2026-09-22", reviewer: "x", index: [], quote: [] }, rev("f")), CorpusUnavailable);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a worker is configured only when both its address and its secret are set", () => {
  assert.equal(workerFromEnv({}), null);
  assert.equal(workerFromEnv({ EVIDENCE_WORKER_URL: "http://127.0.0.1:8431" }), null);
  assert.deepEqual(workerFromEnv({ EVIDENCE_WORKER_URL: "http://127.0.0.1:8431", EVIDENCE_WORKER_SECRET: "s".repeat(40) }), {
    url: "http://127.0.0.1:8431",
    secret: "s".repeat(40),
  });
});
