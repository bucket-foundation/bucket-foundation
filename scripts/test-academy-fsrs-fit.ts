import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { Worker } from "node:worker_threads";
import { DAY_MS, FSRS, FSRS_DEFAULT_W, type Card, type Rating } from "../src/lib/academy/fsrs";
import { FSRS_FIT_GATE, MAX_WEIGHT_RATIO, weightCap, fitFsrsWeights, fitInWorker, type FitWorker, splitByCard, logLoss, predictions, type ReviewEntry } from "../src/lib/academy/fsrs-fit";

const T0 = 1_800_000_000_000;
const TRUE_W = FSRS_DEFAULT_W.map((v, i) => (i < 4 ? v * 0.2 : i === 8 ? v * 0.6 : i === 10 ? v * 1.3 : v));

function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function synthLog(w: number[], cards: number, reviewsPerCard: number, seed: number): ReviewEntry[] {
  const rand = rng(seed);
  const truth = new FSRS(w);
  const log: ReviewEntry[] = [];
  for (let c = 0; c < cards; c++) {
    let card: Card | null = null;
    let ts = T0 + c * 3_600_000;
    for (let k = 0; k < reviewsPerCard; k++) {
      let rating: Rating;
      if (!card) {
        rating = (1 + Math.floor(rand() * 4)) as Rating;
      } else {
        const ivl = (card.scheduledDays ?? 1) * (0.5 + rand() * 1.5);
        ts = (card.lastReview as number) + ivl * DAY_MS;
        const r = truth.retrievability(ivl, card.stability as number);
        if (rand() >= r) rating = 1;
        else rating = rand() < 0.15 ? 2 : rand() < 0.2 ? 4 : 3;
      }
      log.push({ cardId: `c${String(c).padStart(4, "0")}`, ts, rating });
      card = truth.review(card, rating, ts);
    }
  }
  return log;
}

const train = synthLog(TRUE_W, 300, 8, 7);
const holdout = synthLog(TRUE_W, 300, 8, 99);
const fit = fitFsrsWeights(train);

function calibrationError(w: number[]): number {
  const truth = predictions(TRUE_W, holdout);
  const est = predictions(w, holdout);
  return est.reduce((s, p, i) => s + Math.abs(p.r - truth[i].r), 0) / est.length;
}

test("fit lowers log-loss below defaults on train and holdout", () => {
  assert.equal(fit.fitted, true);
  assert.ok(fit.lossAfter < fit.lossBefore, `${fit.lossAfter} < ${fit.lossBefore}`);
  assert.ok(logLoss(fit.w, holdout) < logLoss(FSRS_DEFAULT_W, holdout));
});

test("fit moves predicted recall and initial stability toward the true weights", () => {
  assert.ok(calibrationError(fit.w) < calibrationError(FSRS_DEFAULT_W) * 0.6);
  const dist = (w: number[]) => [0, 1, 2, 3].reduce((s, i) => s + Math.abs(Math.log(w[i] / TRUE_W[i])), 0);
  assert.ok(dist(fit.w) < dist(FSRS_DEFAULT_W));
});

test("fitted weights stay inside the bounds and keep length", () => {
  assert.equal(fit.w.length, FSRS_DEFAULT_W.length);
  assert.ok(fit.w.every((v) => Number.isFinite(v)));
});

test("gate returns defaults below the review threshold", () => {
  const small = synthLog(TRUE_W, 40, 5, 3);
  const res = fitFsrsWeights(small);
  assert.ok(res.scoredReviews < FSRS_FIT_GATE.minReviews);
  assert.equal(res.fitted, false);
  assert.equal(res.reason, "too-few-reviews");
  assert.deepEqual(res.w, FSRS_DEFAULT_W);
});

test("gate returns defaults when reviews cover too few cards", () => {
  const narrow = synthLog(TRUE_W, 10, 60, 5);
  const res = fitFsrsWeights(narrow);
  assert.ok(res.scoredReviews >= FSRS_FIT_GATE.minReviews);
  assert.equal(res.reason, "too-few-cards");
  assert.deepEqual(res.w, FSRS_DEFAULT_W);
});

test("fit is deterministic and ignores log order", () => {
  const again = fitFsrsWeights([...train].reverse());
  assert.deepEqual(again.w, fit.w);
});

function powerLawLog(cards: number, reviewsPerCard: number, seed: number): ReviewEntry[] {
  const rand = rng(seed);
  const log: ReviewEntry[] = [];
  for (let c = 0; c < cards; c++) {
    let ts = T0 + c * 3_600_000;
    let h = 0.3 + rand() * 1.5;
    log.push({ cardId: `p${String(c).padStart(4, "0")}`, ts, rating: 3 });
    for (let k = 1; k < reviewsPerCard; k++) {
      const t = h * (0.3 + rand() * 3);
      ts += t * DAY_MS;
      const r = Math.pow(1 + t / (4 * h), -1.6);
      const ok = rand() < r;
      log.push({ cardId: `p${String(c).padStart(4, "0")}`, ts, rating: ok ? (rand() < 0.2 ? 4 : 3) : 1 });
      h = ok ? h * (1.6 + rand()) : Math.max(0.1, h * 0.3);
    }
  }
  return log;
}

test("held-out log-loss is reported on a card split and beats defaults", () => {
  const { train: tr, test: te } = splitByCard(train);
  assert.ok(te.length > 0 && tr.length > te.length * 3);
  assert.ok(!te.some((r) => tr.some((x) => x.cardId === r.cardId)));
  assert.ok(fit.heldOutAfter < fit.heldOutBefore, `${fit.heldOutAfter} < ${fit.heldOutBefore}`);
});

test("fit beats defaults on held-out cards from a power-law forgetting simulator", () => {
  const res = fitFsrsWeights(powerLawLog(300, 8, 11));
  assert.equal(res.fitted, true);
  assert.ok(res.heldOutAfter < res.heldOutBefore, `${res.heldOutAfter} < ${res.heldOutBefore}`);
});

function nodeFitWorker(): FitWorker {
  const file = path.join(__dirname, "..", "src", "lib", "academy", "fsrs-fit.worker.ts");
  const boot = [
    "const { parentPort } = require('node:worker_threads');",
    "require('ts-node').register({ transpileOnly: true, compilerOptions: { module: 'commonjs', moduleResolution: 'node' } });",
    "globalThis.self = globalThis;",
    "globalThis.postMessage = (m) => parentPort.postMessage(m);",
    "parentPort.on('message', (data) => globalThis.onmessage({ data }));",
    `require(${JSON.stringify(file)});`,
  ].join("\n");
  const w = new Worker(boot, { eval: true });
  const adapter: FitWorker = {
    postMessage: (req) => w.postMessage(req),
    onmessage: null,
    onerror: null,
    terminate: () => void w.terminate(),
  };
  w.on("message", (data) => adapter.onmessage?.({ data }));
  w.on("error", (e) => adapter.onerror?.(e));
  return adapter;
}

test("worker body runs off the main thread and returns the sync weights", async () => {
  let ticks = 0;
  const timer = setInterval(() => ticks++, 1);
  const res = await fitInWorker(nodeFitWorker, train);
  clearInterval(timer);
  assert.ok(ticks > 5, `ticks ${ticks}`);
  assert.deepEqual(res.w, fit.w);
  assert.equal(res.heldOutAfter, fit.heldOutAfter);
});

test("a pathological log drives the fit to the cap and no further", () => {
  const log: ReviewEntry[] = [];
  for (let c = 0; c < 80; c++) {
    for (let k = 0; k < 6; k++) log.push({ cardId: `x${String(c).padStart(3, "0")}`, ts: T0 + k * k * 500 * DAY_MS, rating: 3 });
  }
  const res = fitFsrsWeights(log);
  assert.equal(MAX_WEIGHT_RATIO, 3);
  assert.equal(res.fitted, true, res.reason);
  assert.notDeepEqual(res.w, FSRS_DEFAULT_W);
  const atCap = res.w.filter((v, i) => {
    const [lo, hi] = weightCap(i);
    assert.ok(v >= lo - 1e-12 && v <= hi + 1e-12, `w${i}=${v} outside [${lo}, ${hi}]`);
    return Math.abs(v - lo) < 1e-9 || Math.abs(v - hi) < 1e-9;
  });
  assert.ok(atCap.length >= 1, "no weight reached the cap");
});
