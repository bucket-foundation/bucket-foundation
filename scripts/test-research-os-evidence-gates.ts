/**
 * The Runtime and Model gate arithmetic (ros-ai-find): percentiles by
 * nearest rank, the summaries a load run produces, and the two verdicts,
 * including the runs that have to fail. node:test, no network, no stack.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  checksTable,
  HARD_DEADLINE_MS,
  modelVerdict,
  MODEL_THRESHOLDS,
  percentile,
  rankOf,
  RUNTIME_THRESHOLDS,
  runtimeVerdict,
  saturationVerdict,
  summarize,
  summarizeCold,
  type ColdStart,
  type ModelEvidence,
  type Sample,
  type SaturationPhase,
} from "../src/lib/research-os/evidence-search/gates";

test("percentile: nearest rank names an observed value", () => {
  const ten = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  assert.equal(percentile(ten, 50), 5);
  assert.equal(percentile(ten, 95), 10);
  assert.equal(percentile(ten, 100), 10);
  assert.equal(percentile([7], 95), 7);
  assert.equal(percentile([], 95), 0);
  assert.equal(percentile([5, 1, 3], 50), 3, "the input order does not matter");
  const twenty = Array.from({ length: 20 }, (_, i) => i + 1);
  assert.equal(percentile(twenty, 95), 19, "19 of 20 at or below, so the 19th value");
  assert.throws(() => percentile([1], 0), RangeError);
  assert.throws(() => percentile([1], 101), RangeError);
});

const ok = (ms: number): Sample => ({ ms, status: 200, mode: "hybrid", result: "ok" });

test("summarize: errors, the neural share among answers, and the hard deadline", () => {
  const s = summarize([
    ok(100),
    ok(200),
    { ms: 300, status: 200, mode: "lexical", result: "degraded" },
    { ms: 400, status: 503 },
    { ms: 9000, status: 200, mode: "hybrid", result: "ok" },
  ]);
  assert.equal(s.count, 5);
  assert.equal(s.ok, 4);
  assert.equal(s.errors, 1);
  assert.equal(s.errorRate, 0.2);
  assert.equal(s.neural, 3);
  assert.equal(s.neuralShare, 0.75, "the share is of answered requests, not of every request");
  assert.equal(s.degraded, 1);
  assert.equal(s.overDeadline, 1);
  assert.equal(s.max, 9000);
});

test("summarize: a 429 counts as an error and is also reported on its own", () => {
  const s = summarize([ok(10), { ms: 5, status: 429 }]);
  assert.equal(s.rateLimited, 1);
  assert.equal(s.errors, 1);
});

test("summarize: an empty run reports zeros rather than dividing by zero", () => {
  const s = summarize([]);
  assert.equal(s.errorRate, 0);
  assert.equal(s.neuralShare, 0);
  assert.equal(s.p95, 0);
});

const restart = (loadMs: number, firstMs: number, downMs = 90): ColdStart => ({
  down: { ms: downMs, status: 200, mode: "lexical", result: "degraded" },
  loadMs,
  first: { ms: firstMs, status: 200, mode: "hybrid", result: "ok" },
});

test("summarizeCold: the three waits a restart contains are reported apart", () => {
  const c = summarizeCold([restart(4000, 200), restart(4200, 300)]);
  assert.equal(c.count, 2);
  assert.equal(c.first.p95, 300, "the gated number is the first answer after the worker is up");
  assert.equal(c.loadP95, 4200);
  assert.equal(c.loadMax, 4200);
  assert.equal(c.restartP95, 4500, "worker start through the first answer");
  assert.equal(c.down.degraded, 2, "a request during the restart is answered from keyword ranking");
  assert.equal(c.down.p95, 90);
  assert.equal(c.first.errors, 0);
  assert.equal(c.first.neural, 2);
  assert.equal(c.first.degraded, 0, "the first answer after start is a neural one");
});

const goodRun = () => ({
  warmOne: summarize(Array.from({ length: 200 }, (_, i) => ok(500 + (i % 100) * 10))),
  warmTwo: summarize(Array.from({ length: 200 }, (_, i) => ok(1000 + (i % 100) * 20))),
  cold: summarizeCold(Array.from({ length: 20 }, () => restart(4000, 300))),
});

test("runtimeVerdict: a run inside every threshold passes", () => {
  const v = runtimeVerdict(goodRun());
  assert.equal(v.pass, true, checksTable(v.checks));
  assert.equal(
    v.checks.filter((c) => !c.pass).length,
    0,
  );
});

test("runtimeVerdict: a run answered by the keyword fallback cannot pass", () => {
  const lexical = Array.from({ length: 200 }, (_, i) => ({ ms: 100 + i, status: 200, mode: "lexical" as const, result: "degraded" as const }));
  const v = runtimeVerdict({ ...goodRun(), warmOne: summarize(lexical) });
  assert.equal(v.pass, false);
  const failed = v.checks.filter((c) => !c.pass).map((c) => c.name);
  assert.deepEqual(failed, ["neural share at concurrency one"]);
});

test("runtimeVerdict: a short run fails on its own size", () => {
  const v = runtimeVerdict({ ...goodRun(), warmOne: summarize([ok(10), ok(20)]) });
  assert.equal(v.pass, false);
  assert.ok(v.checks.some((c) => c.name === "warm requests at concurrency one" && !c.pass));
});

test("runtimeVerdict: slow warm requests, a slow cold start and a reached cap each fail", () => {
  const slow = runtimeVerdict({ ...goodRun(), warmOne: summarize(Array.from({ length: 200 }, () => ok(2500))) });
  assert.ok(slow.checks.some((c) => c.name === "warm p95 at concurrency one, ms" && !c.pass));

  const cold = runtimeVerdict({
    ...goodRun(),
    cold: summarizeCold(Array.from({ length: 20 }, () => restart(4000, 6000))),
  });
  assert.ok(cold.checks.some((c) => c.name.startsWith("cold p95") && !c.pass));

  const capped = runtimeVerdict({ ...goodRun(), warmTwo: summarize([...Array.from({ length: 199 }, () => ok(100)), { ms: 5, status: 429 }]) });
  assert.ok(capped.checks.some((c) => c.name === "rate limited requests" && !c.pass));
});

test("runtimeVerdict: one request past the hard deadline fails the run", () => {
  const over = [...Array.from({ length: 199 }, () => ok(100)), ok(HARD_DEADLINE_MS + 1)];
  const v = runtimeVerdict({ ...goodRun(), warmOne: summarize(over) });
  assert.ok(v.checks.some((c) => c.name === "requests past the hard deadline" && !c.pass));
});

test("runtimeVerdict: a restart window nobody can use fails, however fast the first answer is", () => {
  const stalled = summarizeCold(
    Array.from({ length: 20 }, () => ({
      down: { ms: 120, status: 503 },
      loadMs: 4000,
      first: { ms: 300, status: 200, mode: "hybrid" as const, result: "ok" as const },
    })),
  );
  const v = runtimeVerdict({ ...goodRun(), cold: stalled });
  assert.equal(v.pass, false);
  const failed = v.checks.filter((c) => !c.pass).map((c) => c.name);
  assert.deepEqual(failed, ["errors while the worker was stopped", "degraded answers while the worker was stopped"]);
});

test("runtimeVerdict: a worker that takes a minute to start fails on its own ceiling", () => {
  const v = runtimeVerdict({ ...goodRun(), cold: summarizeCold(Array.from({ length: 20 }, () => restart(61_000, 300))) });
  assert.equal(v.pass, false);
  assert.ok(v.checks.some((c) => c.name === "worker start, max ms" && !c.pass));
});

test("runtimeVerdict: a 24-second worker start passes while the fallback covers the window", () => {
  const v = runtimeVerdict({ ...goodRun(), cold: summarizeCold(Array.from({ length: 20 }, () => restart(24_000, 112))) });
  assert.equal(v.pass, true, checksTable(v.checks));
});

test("runtimeVerdict: the thresholds are the ones the plan states", () => {
  assert.deepEqual(RUNTIME_THRESHOLDS, {
    warmRequests: 200,
    coldStarts: 20,
    warmP95OneMs: 2000,
    warmP95TwoMs: 5000,
    coldP95Ms: 5000,
    maxErrorRate: 0.01,
    minNeuralShare: 0.99,
    deadlineMs: 8000,
    workerLoadMaxMs: 60_000,
  });
});

test("rankOf: by slug, by source id, and absent", () => {
  const cards = [{ slug: "a", sourceId: "graph:1" }, { slug: "b", sourceId: "graph:2" }];
  assert.equal(rankOf(cards, "a"), 1);
  assert.equal(rankOf(cards, "graph:2"), 2);
  assert.equal(rankOf(cards, "c"), null);
  assert.equal(rankOf([], "a"), null);
});

const REV = "1110a243fdf4706b3f48f1d95db1a4f5529b4d41";
const outcome = (id: string, over: Partial<ModelEvidence["outcomes"][number]> = {}) => ({
  id,
  lexicalRank: 3,
  hybridRank: 1,
  reordered: true,
  recovered: false,
  mode: "hybrid" as const,
  ...over,
});
const evidence = (over: Partial<ModelEvidence> = {}): ModelEvidence => {
  const outcomes = over.outcomes ?? [
    outcome("a", { recovered: true, lexicalRank: null }),
    outcome("b", { recovered: true, lexicalRank: null }),
    outcome("c", { recovered: true, lexicalRank: null }),
    outcome("d"),
    outcome("e"),
    outcome("f"),
  ];
  return {
    outcomes,
    reportedModelRevision: REV,
    pinnedModelRevision: REV,
    workerScoredBefore: 10,
    workerScoredAfter: 10 + outcomes.length,
    ...over,
  };
};

test("modelVerdict: reordering plus recovery on the pinned model passes", () => {
  const v = modelVerdict(evidence());
  assert.equal(v.pass, true, checksTable(v.checks));
});

test("modelVerdict: a worker that scored nothing fails, so mock results cannot pass", () => {
  const v = modelVerdict(evidence({ workerScoredAfter: 10 }));
  assert.equal(v.pass, false);
  assert.ok(v.checks.some((c) => c.name === "worker requests scored" && !c.pass));
});

test("modelVerdict: a model revision other than the pinned one fails", () => {
  const v = modelVerdict(evidence({ reportedModelRevision: "f".repeat(40) }));
  assert.equal(v.pass, false);
  assert.ok(v.checks.some((c) => c.name.startsWith("model revision") && !c.pass));
});

test("modelVerdict: a case the keyword path answered fails the run", () => {
  const outcomes = [outcome("a", { mode: "lexical" }), outcome("b"), outcome("c"), outcome("d"), outcome("e"), outcome("f")];
  const v = modelVerdict(evidence({ outcomes, workerScoredAfter: 10 + outcomes.length }));
  assert.equal(v.pass, false);
  assert.ok(v.checks.some((c) => c.name === "cases on the neural path" && !c.pass));
});

test("modelVerdict: ranking that never changes fails whatever else is true", () => {
  const outcomes = Array.from({ length: 6 }, (_, i) => outcome(`c${i}`, { reordered: false, recovered: false }));
  const v = modelVerdict(evidence({ outcomes, workerScoredAfter: 10 + outcomes.length }));
  assert.equal(v.pass, false);
  const failed = v.checks.filter((c) => !c.pass).map((c) => c.name);
  assert.deepEqual(failed, ["cases the neural path reorders"]);
});

test("modelVerdict: retrieval usefulness is a signal, so it cannot fail the gate on its own", () => {
  const outcomes = Array.from({ length: 6 }, (_, i) => outcome(`c${i}`, { recovered: false, lexicalRank: 2, hybridRank: 1 }));
  const v = modelVerdict(evidence({ outcomes, workerScoredAfter: 10 + outcomes.length }));
  assert.equal(v.pass, true, "the plan asks for changed ranking on the pinned weights, and it changed");
  const short = v.signals.filter((s) => !s.pass).map((s) => s.name);
  assert.deepEqual(short, ["cases keyword search misses and the neural path returns"]);
});

test("modelVerdict: a case neither path returns shows up as a signal", () => {
  const outcomes = [outcome("a", { lexicalRank: null, hybridRank: null }), ...Array.from({ length: 6 }, (_, i) => outcome(`c${i}`, { lexicalRank: null, recovered: true }))];
  const v = modelVerdict(evidence({ outcomes, workerScoredAfter: 10 + outcomes.length }));
  const missing = v.signals.find((s) => s.name === "cases either path returns at all");
  assert.equal(missing?.pass, false);
  assert.equal(missing?.value, outcomes.length - 1);
});

test("the fixtures are well formed, and each query avoids its target's own words", () => {
  const file = path.join(process.cwd(), "learning", "research-os", "ai", "model-gate-fixtures.json");
  const raw = JSON.parse(readFileSync(file, "utf8")) as {
    thresholds: { minReordered: number; minRecovered: number };
    cases: { id: string; query: string; branch: string; expect: string; why: string }[];
  };
  assert.ok(raw.cases.length >= MODEL_THRESHOLDS.minReordered, "at least as many cases as the reordering threshold");
  const ids = new Set<string>();
  for (const c of raw.cases) {
    assert.ok(c.id && c.query && c.branch && c.expect && c.why, `case ${c.id} has every field`);
    assert.equal(ids.has(c.id), false, `case ${c.id} appears once`);
    ids.add(c.id);
    assert.match(c.branch, /^\d{2}-[a-z][a-z-]*$/, `case ${c.id} names a branch`);
    assert.ok(c.query.length <= 512, `case ${c.id} is inside the query bound`);
    // The slug's own words are what keyword search would match on.
    const words = new Set(c.query.toLowerCase().match(/[a-z]+/g) ?? []);
    const shared = c.expect
      .split("-")
      .filter((w) => w.length > 3 && !["academy", "mathematics", "information", "biophysics", "physics", "chemistry"].includes(w))
      .filter((w) => words.has(w));
    assert.deepEqual(shared, [], `case ${c.id} shares ${shared.join(", ")} with its target's slug`);
  }
  assert.ok(raw.thresholds.minReordered > 0 && raw.thresholds.minRecovered > 0);
  assert.ok(raw.thresholds.minReordered <= raw.cases.length && raw.thresholds.minRecovered <= raw.cases.length);
});

test("checksTable: a failing row reads as FAIL", () => {
  const table = checksTable(runtimeVerdict({ ...goodRun(), warmOne: summarize([ok(10)]) }).checks);
  assert.match(table, /\| FAIL \| warm requests at concurrency one \|/);
  assert.match(table, /at least 200/);
});

const lane = (lanes: number, over: Partial<SaturationPhase> = {}): SaturationPhase => ({
  lanes,
  summary: summarize(Array.from({ length: 40 }, () => ok(200))),
  scored: 40,
  queueFull: 0,
  deadline: 0,
  ...over,
});

test("saturationVerdict: queue refusals that become degraded answers pass", () => {
  const degraded = [
    ...Array.from({ length: 23 }, () => ok(300)),
    ...Array.from({ length: 17 }, () => ({ ms: 300, status: 200, mode: "lexical" as const, result: "degraded" as const })),
  ];
  const v = saturationVerdict([lane(1), lane(16, { summary: summarize(degraded), scored: 23, queueFull: 17 })]);
  assert.equal(v.pass, true, checksTable(v.checks));
});

test("saturationVerdict: a degraded answer no counter explains fails", () => {
  // The worker refused nothing, so the dense ranking was lost somewhere
  // the worker never saw, and the caller still read a working search.
  const degraded = [
    ...Array.from({ length: 30 }, () => ok(300)),
    ...Array.from({ length: 10 }, () => ({ ms: 300, status: 200, mode: "lexical" as const, result: "degraded" as const })),
  ];
  const v = saturationVerdict([lane(1), lane(8, { summary: summarize(degraded), scored: 30, queueFull: 0 })]);
  assert.equal(v.pass, false);
  assert.deepEqual(
    v.checks.filter((c) => !c.pass).map((c) => c.name),
    ["degraded answers the worker cannot account for at concurrency 8"],
  );
});

test("saturationVerdict: a deadline refusal explains a degraded answer as well as a full queue", () => {
  const degraded = [...Array.from({ length: 36 }, () => ok(300)), ...Array.from({ length: 4 }, () => ({ ms: 300, status: 200, mode: "lexical" as const, result: "degraded" as const }))];
  const v = saturationVerdict([lane(1), lane(8, { summary: summarize(degraded), scored: 36, queueFull: 1, deadline: 3 })]);
  assert.equal(v.pass, true, checksTable(v.checks));
});

test("saturationVerdict: an error reaching the caller fails, whatever the queue did", () => {
  const withError = [...Array.from({ length: 39 }, () => ok(300)), { ms: 300, status: 503 }];
  const v = saturationVerdict([lane(1), lane(8, { summary: summarize(withError), scored: 39, queueFull: 1 })]);
  assert.equal(v.pass, false);
  assert.ok(v.checks.some((c) => c.name === "errors at concurrency 8" && !c.pass));
});

test("saturationVerdict: a request past the hard deadline fails even with no error", () => {
  const slow = [...Array.from({ length: 39 }, () => ok(300)), ok(HARD_DEADLINE_MS + 1)];
  const v = saturationVerdict([lane(1), lane(8, { summary: summarize(slow) })]);
  assert.equal(v.pass, false);
  assert.ok(v.checks.some((c) => c.name === "past the hard deadline at concurrency 8" && !c.pass));
});

test("saturationVerdict: a run answered from the fallback at one request in flight fails", () => {
  const allLexical = Array.from({ length: 40 }, () => ({ ms: 100, status: 200, mode: "lexical" as const, result: "degraded" as const }));
  const v = saturationVerdict([lane(1, { summary: summarize(allLexical), scored: 0, queueFull: 40 }), lane(8)]);
  assert.equal(v.pass, false);
  assert.ok(v.checks.some((c) => c.name === "neural share with one request in flight" && !c.pass));
});

test("saturationVerdict: one concurrency level is not a saturation run", () => {
  const v = saturationVerdict([lane(1)]);
  assert.equal(v.pass, false);
  assert.ok(v.checks.some((c) => c.name === "concurrency levels" && !c.pass));
});
