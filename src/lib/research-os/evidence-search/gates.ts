export type SearchMode = "hybrid" | "lexical";
export type SearchStatus = "ok" | "no_match" | "degraded";

export interface Sample {
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
  rateLimited: number;
  p50: number;
  p95: number;
  max: number;
  neural: number;
  neuralShare: number;
  degraded: number;
  overDeadline: number;
}

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

export interface ColdStart {
  down: Sample;
  loadMs: number;
  first: Sample;
}

export interface ColdSummary {
  count: number;
  loadP95: number;
  loadMax: number;
  first: Summary;
  down: Summary;
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
  expect: string;
  why: string;
}

export interface CaseOutcome {
  id: string;
  lexicalRank: number | null;
  hybridRank: number | null;
  reordered: boolean;
  recovered: boolean;
  mode?: SearchMode;
}

export interface ModelThresholds {
  minReordered: number;
  minRecovered: number;
}

export const MODEL_THRESHOLDS: ModelThresholds = { minReordered: 6, minRecovered: 3 };

export interface ModelEvidence {
  outcomes: readonly CaseOutcome[];
  reportedModelRevision: string;
  pinnedModelRevision: string;
  workerScoredBefore: number;
  workerScoredAfter: number;
}

export function rankOf(cards: readonly { slug?: string; sourceId?: string }[], expect: string): number | null {
  const at = cards.findIndex((c) => c.slug === expect || c.sourceId === expect);
  return at === -1 ? null : at + 1;
}

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

export function checksTable(checks: readonly Check[]): string {
  const rows = checks.map((c) => `| ${c.pass ? "pass" : "FAIL"} | ${c.name} | ${round(c.value)} | ${c.rule === "at_most" ? "at most" : "at least"} ${round(c.limit)} |`);
  return ["| Result | Check | Measured | Threshold |", "|---|---|---|---|", ...rows].join("\n");
}

export interface SaturationPhase {
  lanes: number;
  summary: Summary;
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
    checks.push(atMost(`degraded answers the worker cannot account for at concurrency ${p.lanes}`, Math.max(0, p.summary.degraded - (p.queueFull + p.deadline)), 0));
  }
  return { pass: checks.every((c) => c.pass), checks };
}
