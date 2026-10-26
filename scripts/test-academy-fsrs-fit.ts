import test from "node:test";
import assert from "node:assert/strict";
import { DAY_MS, FSRS, FSRS_DEFAULT_W, type Card, type Rating } from "../src/lib/academy/fsrs";
import { FSRS_FIT_GATE, fitFsrsWeights, logLoss, predictions, type ReviewEntry } from "../src/lib/academy/fsrs-fit";

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
