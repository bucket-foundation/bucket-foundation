/**
 * The arithmetic behind the Runtime and Model release gates, kept away
 * from the runs that collect the samples.
 *
 * The thresholds come from IMPLEMENTATION.md, "Verification and release":
 * 200 warm requests at concurrency one, 200 at concurrency two and 20 cold
 * starts; warm p95 at or under 2 s at concurrency one and 5 s at
 * concurrency two; cold p95 at or under 5 s; errors at or under 1%; an
 * eight-second hard deadline; and at least 99% of eligible requests in the
 * healthy load run on the neural path, so a run cannot pass by answering
 * every request from the keyword fallback.
 *
 * Percentiles use the nearest-rank method on the sorted sample, which
 * names an observed request rather than interpolating between two.
 * A run smaller than the sample the gate asks for reports its own size and
 * fails the size check, so a short run cannot read as a pass.
 */

export type SearchMode = "hybrid" | "lexical";
export type SearchStatus = "ok" | "no_match" | "degraded";

export interface Sample {
  /** End to end, from the request leaving to the body being read. */
  ms: number;
  status: number;
  mode?: SearchMode;
  result?: SearchStatus;
}

export interface Summary {
  count: number;
  ok: number;
  errors: number;
  errorRate: number;
  /** 429s, called out on their own: a cap reached during a load run is a
   * configuration problem, and reading it as a runtime failure hides that. */
  rateLimited: number;
  p50: number;
  p95: number;
  max: number;
  neural: number;
  neuralShare: number;
  degraded: number;
  overDeadline: number;
}

/** The value at `p` by nearest rank. An empty sample has no value, so 0. */
export function percentile(values: readonly number[], p: number): number {
  if (values.length === 0) return 0;
  if (!(p > 0 && p <= 100)) throw new RangeError(`p is above 0 and at most 100, given ${p}`);
  const sorted = [...values].sort((a, b) => a - b);
  const rank = Math.ceil((p / 100) * sorted.length);
  return sorted[Math.min(Math.max(rank, 1), sorted.length) - 1];
}

export const HARD_DEADLINE_MS = 8000;

export function summarize(samples: readonly Sample[], deadlineMs: number = HARD_DEADLINE_MS): Summary {
  const ms = samples.map((s) => s.ms);
  const ok = samples.filter((s) => s.status === 200);
  const neural = ok.filter((s) => s.mode === "hybrid").length;
  const errors = samples.length - ok.length;
  return {
    count: samples.length,
    ok: ok.length,
    errors,
    errorRate: samples.length === 0 ? 0 : errors / samples.length,
    rateLimited: samples.filter((s) => s.status === 429).length,
    p50: percentile(ms, 50),
    p95: percentile(ms, 95),
    max: ms.length === 0 ? 0 : Math.max(...ms),
    neural,
    neuralShare: ok.length === 0 ? 0 : neural / ok.length,
    degraded: ok.filter((s) => s.result === "degraded").length,
    overDeadline: ms.filter((v) => v > deadlineMs).length,
  };
}

/**
 * One worker restart, measured in three parts, because "cold start" means
 * two different waits and they differ by a factor of two hundred here.
 *
 * `down` is a request that arrives while the worker is stopped. Nobody
 * waits for the model then: the route falls back to checked keyword
 * ranking and says so, which is the contract in IMPLEMENTATION.md, "API
 * and worker contracts". This is what a person meets during a restart.
 *
 * `loadMs` is the worker process starting and loading its weights. It is
 * an operator cost paid once per restart, and no request waits inside it.
 *
 * `first` is the first search served after the worker is up, on cold
 * caches. This is the request the plan's five-second cold budget is
 * about, and the one the verdict gates on.
 */
export interface ColdStart {
  /** A request served while the worker is stopped. */
  down: Sample;
  /** Process start to the worker answering its health route. */
  loadMs: number;
  /** The first search after the worker answered. */
  first: Sample;
}

export interface ColdSummary {
  count: number;
  loadP95: number;
  loadMax: number;
  /** The first answer after the worker is up, which the verdict gates on. */
  first: Summary;
  /** Requests served while the worker was stopped. */
  down: Summary;
  /** Worker start through the first answer, the whole restart. */
  restartP95: number;
}

export function summarizeCold(starts: readonly ColdStart[]): ColdSummary {
  return {
    count: starts.length,
    loadP95: percentile(starts.map((s) => s.loadMs), 95),
    loadMax: starts.length === 0 ? 0 : Math.max(...starts.map((s) => s.loadMs)),
    first: summarize(starts.map((s) => s.first)),
    down: summarize(starts.map((s) => s.down)),
    restartP95: percentile(starts.map((s) => s.loadMs + s.first.ms), 95),
  };
}

export interface RuntimeThresholds {
  warmRequests: number;
  coldStarts: number;
  warmP95OneMs: number;
  warmP95TwoMs: number;
  coldP95Ms: number;
  maxErrorRate: number;
  minNeuralShare: number;
  deadlineMs: number;
  /** A ceiling on the worker's own start, so a broken install fails. */
  workerLoadMaxMs: number;
}

export const RUNTIME_THRESHOLDS: RuntimeThresholds = {
  warmRequests: 200,
  coldStarts: 20,
  warmP95OneMs: 2000,
  warmP95TwoMs: 5000,
  coldP95Ms: 5000,
  maxErrorRate: 0.01,
  minNeuralShare: 0.99,
  deadlineMs: HARD_DEADLINE_MS,
  workerLoadMaxMs: 60_000,
};

export interface Check {
  name: string;
  value: number;
  limit: number;
  /** `at_most` when the value has a ceiling, `at_least` when a floor. */
  rule: "at_most" | "at_least";
  pass: boolean;
}

export interface RuntimeReport {
  warmOne: Summary;
  warmTwo: Summary;
  cold: ColdSummary;
}

const atMost = (name: string, value: number, limit: number): Check => ({ name, value, limit, rule: "at_most", pass: value <= limit });
const atLeast = (name: string, value: number, limit: number): Check => ({ name, value, limit, rule: "at_least", pass: value >= limit });

/** Every runtime check, and whether the run clears all of them. */
export function runtimeVerdict(report: RuntimeReport, t: RuntimeThresholds = RUNTIME_THRESHOLDS): { pass: boolean; checks: Check[] } {
  const cold = report.cold;
  const checks: Check[] = [
    atLeast("warm requests at concurrency one", report.warmOne.count, t.warmRequests),
    atLeast("warm requests at concurrency two", report.warmTwo.count, t.warmRequests),
    atLeast("cold starts", cold.count, t.coldStarts),
    atMost("warm p95 at concurrency one, ms", report.warmOne.p95, t.warmP95OneMs),
    atMost("warm p95 at concurrency two, ms", report.warmTwo.p95, t.warmP95TwoMs),
    atMost("cold p95, the first answer after the worker is up, ms", cold.first.p95, t.coldP95Ms),
    atMost("error rate at concurrency one", report.warmOne.errorRate, t.maxErrorRate),
    atMost("error rate at concurrency two", report.warmTwo.errorRate, t.maxErrorRate),
    atMost("cold start errors", cold.first.errors, 0),
    atLeast("neural share at concurrency one", report.warmOne.neuralShare, t.minNeuralShare),
    atLeast("neural share at concurrency two", report.warmTwo.neuralShare, t.minNeuralShare),
    atLeast("cold starts on the neural path", cold.first.neural, cold.count),
    // The restart window is covered rather than waited through: a request
    // that arrives with the worker stopped is answered from checked
    // keyword ranking, inside the same deadline, and says it degraded.
    atMost("errors while the worker was stopped", cold.down.errors, 0),
    atLeast("degraded answers while the worker was stopped", cold.down.degraded, cold.count),
    atMost("p95 while the worker was stopped, ms", cold.down.p95, t.deadlineMs),
    atMost("worker start, max ms", cold.loadMax, t.workerLoadMaxMs),
    atMost("requests past the hard deadline", report.warmOne.overDeadline + report.warmTwo.overDeadline + cold.down.overDeadline, 0),
    atMost("rate limited requests", report.warmOne.rateLimited + report.warmTwo.rateLimited + cold.down.rateLimited, 0),
  ];
  return { pass: checks.every((c) => c.pass), checks };
}

export interface ParaphraseCase {
  id: string;
  query: string;
  branch: string;
  /** The slug or sourceId this query is a paraphrase of. */
  expect: string;
  why: string;
}

export interface CaseOutcome {
  id: string;
  /** 1-based rank of the expected source, or null when it is absent. */
  lexicalRank: number | null;
  hybridRank: number | null;
  /** The two card orders differ. */
  reordered: boolean;
  /** Keyword search missed it and the neural path returned it. */
  recovered: boolean;
  mode?: SearchMode;
}

export interface ModelThresholds {
  /** Cases whose card order the neural path changes. */
  minReordered: number;
  /** Cases the neural path returns and keyword search misses. */
  minRecovered: number;
}

export const MODEL_THRESHOLDS: ModelThresholds = { minReordered: 6, minRecovered: 3 };

export interface ModelEvidence {
  outcomes: readonly CaseOutcome[];
  /** The revision the route reported, against the pinned registry entry. */
  reportedModelRevision: string;
  pinnedModelRevision: string;
  /** The worker's own scored counter, before and after the run. */
  workerScoredBefore: number;
  workerScoredAfter: number;
}

/** The rank of `expect` among cards, by slug or by sourceId. */
export function rankOf(cards: readonly { slug?: string; sourceId?: string }[], expect: string): number | null {
  const at = cards.findIndex((c) => c.slug === expect || c.sourceId === expect);
  return at === -1 ? null : at + 1;
}

/**
 * The model gate. Mock results fail it: the worker's own counter has to
 * show one scored request per case, and the revision the route reports has
 * to be the pinned one.
 *
 * `checks` is what the plan asks of this gate, that the pinned weights
 * embed a query and change ranking. `signals` is retrieval usefulness,
 * measured here because the run is already set up for it and owned by the
 * Quality gate in EVALUATION.md, where the judgments are sealed and the
 * corpus is at release scale. A signal under its target is a result to
 * report rather than a gate to fail, so it stays out of `pass`.
 */
export function modelVerdict(e: ModelEvidence, t: ModelThresholds = MODEL_THRESHOLDS): { pass: boolean; checks: Check[]; signals: Check[] } {
  const cases = e.outcomes.length;
  const scored = e.workerScoredAfter - e.workerScoredBefore;
  const checks: Check[] = [
    atLeast("cases run", cases, 1),
    atLeast("cases on the neural path", e.outcomes.filter((o) => o.mode === "hybrid").length, cases),
    atLeast("worker requests scored", scored, cases),
    atLeast("model revision matches the pinned one", e.reportedModelRevision === e.pinnedModelRevision ? 1 : 0, 1),
    atLeast("cases the neural path reorders", e.outcomes.filter((o) => o.reordered).length, t.minReordered),
  ];
  const signals: Check[] = [
    atLeast("cases keyword search misses and the neural path returns", e.outcomes.filter((o) => o.recovered).length, t.minRecovered),
    atLeast("cases either path returns at all", e.outcomes.filter((o) => o.lexicalRank !== null || o.hybridRank !== null).length, cases),
  ];
  return { pass: checks.every((c) => c.pass), checks, signals };
}

const round = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(v < 1 ? 4 : 1));

/** The checks as a markdown table, for the report a person reads. */
export function checksTable(checks: readonly Check[]): string {
  const rows = checks.map((c) => `| ${c.pass ? "pass" : "FAIL"} | ${c.name} | ${round(c.value)} | ${c.rule === "at_most" ? "at most" : "at least"} ${round(c.limit)} |`);
  return ["| Result | Check | Measured | Threshold |", "|---|---|---|---|", ...rows].join("\n");
}

/**
 * One concurrency level of a saturation run.
 *
 * The worker holds one computation and four waiting requests
 * (`MAX_ACTIVE` and `MAX_WAITING` in worker.py). Past five in flight it
 * answers 503 `queue_full`, and a request that waits past its deadline
 * answers 503 `deadline`. Both are refusals the server expects: it drops
 * the dense ranking and answers from checked keyword ranking, marked
 * degraded. Nothing about that reaches the caller as an error.
 *
 * The counters come from the worker's own health route, read before and
 * after each level, so a degraded answer can be attributed to the refusal
 * that caused it.
 */
export interface SaturationPhase {
  lanes: number;
  summary: Summary;
  /** Worker counter deltas across this level. */
  scored: number;
  queueFull: number;
  deadline: number;
}

export interface SaturationThresholds {
  maxErrorRate: number;
  minNeuralShareAlone: number;
  deadlineMs: number;
}

export const SATURATION_THRESHOLDS: SaturationThresholds = {
  maxErrorRate: 0,
  minNeuralShareAlone: 0.99,
  deadlineMs: HARD_DEADLINE_MS,
};

/**
 * Whether saturation stays graceful. The check that matters is the last
 * one: a degraded answer the worker's counters cannot account for came
 * from something other than a queue refusal, and a transport failure that
 * reads as a working search is the shape this run exists to catch.
 */
export function saturationVerdict(
  phases: readonly SaturationPhase[],
  t: SaturationThresholds = SATURATION_THRESHOLDS,
): { pass: boolean; checks: Check[] } {
  const checks: Check[] = [atLeast("concurrency levels", phases.length, 2)];
  const alone = phases.find((p) => p.lanes === 1);
  if (alone) checks.push(atLeast("neural share with one request in flight", alone.summary.neuralShare, t.minNeuralShareAlone));
  for (const p of phases) {
    checks.push(atMost(`errors at concurrency ${p.lanes}`, p.summary.errorRate, t.maxErrorRate));
    checks.push(atMost(`past the hard deadline at concurrency ${p.lanes}`, p.summary.overDeadline, 0));
    // A refusal the worker counted explains a degraded answer. One it did
    // not count means the worker was never reached, or answered something
    // the client discarded, and the caller still saw a working search.
    checks.push(atMost(`degraded answers the worker cannot account for at concurrency ${p.lanes}`, Math.max(0, p.summary.degraded - (p.queueFull + p.deadline)), 0));
  }
  return { pass: checks.every((c) => c.pass), checks };
}
