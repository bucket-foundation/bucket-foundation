import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { FSRS } from "../src/lib/academy/fsrs";
import { boundedPriors, UNSTUDIED_PRIORS, firstReviewObservations, fitPriors, freqFromRow, frequencyPrior, inputEvidence, KNOWN_R, known, knownCount, MIN_FIT_OBSERVATIONS, placementObservations, PRIOR_BOUNDS, retrievability, type FrequencyPriors, type LemmaEvidence, type PriorObservation } from "../src/lib/academy/learner-model";

const V = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "src/lib/academy/learner-model-vectors.json"), "utf8"));
const close = (a: number, b: number, m: string) => assert.ok(Math.abs(a - b) < 1e-8, `${m}: ${a} vs ${b}`);

for (const c of V.known) {
  test(`golden known: ${c.name}`, () => {
    const k = known(c.evidence, V.now, c.tier, c.lambda);
    close(k.p, c.expect.p, c.name);
    assert.equal(k.known, c.expect.known);
    assert.equal(k.source, c.expect.source);
  });
}

test("golden knownCount, frequency rows and priors", () => {
  for (const c of V.knownCount) close(knownCount(c.lemmas, V.now, c.tier, c.lambda), c.expect, c.name);
  for (const r of V.freqRows) assert.deepEqual(freqFromRow(r.row), r.expect);
  for (const p of V.prior) close(frequencyPrior({ rank: p.rank, derived: p.derived }, p.tier), p.expect, `tier ${p.tier}`);
});

test("retrievability matches the FSRS engine", () => {
  const f = new FSRS();
  for (const [t, s] of [[0, 1], [1, 3], [10, 10], [40, 2.5]]) close(retrievability(t, s), f.retrievability(t, s), `${t}/${s}`);
});

test("knownCount stays in [0, n] and never drops when a card gains stability", () => {
  const now = V.now;
  const base: Record<string, LemmaEvidence> = { a: { stability: 2, lastReview: now - 5 * 86_400_000 }, b: { freq: { rank: 900, derived: false } }, c: {} };
  const n = knownCount(base, now, 0);
  assert.ok(n >= 0 && n <= 3);
  assert.ok(knownCount({ ...base, a: { stability: 20, lastReview: now - 5 * 86_400_000 } }, now, 0) >= n);
});

test("input evidence counts exposures once per row and keeps the latest tap", () => {
  const ev = inputEvidence([
    { kind: "exposure", reviewed_at: 10, lemmas_seen: ["casa", "casa", "perro"], taps: ["perro"] },
    { kind: "exposure", reviewed_at: 30, lemmas_seen: ["casa"], taps: ["casa"] },
    { kind: "review", reviewed_at: 40, lemmas_seen: ["casa"] },
  ]);
  assert.deepEqual(ev, { casa: { exposures: 2, lastTap: 30 }, perro: { exposures: 1, lastTap: 10 } });
});

test("golden priors match the defaults", () => {
  assert.deepEqual(V.priors, UNSTUDIED_PRIORS);
});

test("no unseen word counts as known from the prior alone, at any rank or tier", () => {
  for (const rank of [1, 2, 10, 100]) for (const tier of [0, 5, 50]) for (const derived of [false, true]) {
    const k = known({ freq: { rank, derived } }, V.now, tier);
    assert.ok(k.p <= UNSTUDIED_PRIORS.cap && !k.known, `${rank}/${tier}`);
  }
  assert.ok(UNSTUDIED_PRIORS.cap < KNOWN_R && PRIOR_BOUNDS.cap[1] < KNOWN_R);
  assert.ok(boundedPriors({ cap: 0.99 }).cap < KNOWN_R);
});

test("priors are clamped to their bounds and non-finite values fall back", () => {
  const b = boundedPriors({ halfRank: 1, slope: 99, derivedRankFactor: Number.NaN });
  assert.deepEqual([b.halfRank, b.slope, b.derivedRankFactor], [PRIOR_BOUNDS.halfRank[0], PRIOR_BOUNDS.slope[1], UNSTUDIED_PRIORS.derivedRankFactor]);
});

function synthetic(truth: FrequencyPriors, n: number): PriorObservation[] {
  let seed = 7;
  const rand = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
  const out: PriorObservation[] = [];
  for (let i = 0; i < n; i++) {
    const rank = Math.round(Math.exp(rand() * Math.log(20_000))) + 1;
    const derived = rand() < 0.25;
    const tier = Math.floor(rand() * 3);
    const eff = derived ? rank * truth.derivedRankFactor : rank;
    const q = 1 / (1 + Math.pow(eff / (truth.halfRank * (1 + tier)), truth.slope));
    out.push({ source: i % 2 ? "placement" : "review", freq: { rank, derived }, tier, knew: rand() < q });
  }
  return out;
}

test("the fit hook recovers the half rank, slope and derived factor from answers", () => {
  const truth = { ...UNSTUDIED_PRIORS, halfRank: 1500, slope: 1.4, derivedRankFactor: 3.5 };
  const fit = fitPriors(synthetic(truth, 6000));
  assert.equal(fit.fitted, true);
  assert.ok(Math.abs(Math.log(fit.priors.halfRank / truth.halfRank)) < 0.25, `halfRank ${fit.priors.halfRank}`);
  assert.ok(Math.abs(fit.priors.slope - truth.slope) < 0.3, `slope ${fit.priors.slope}`);
  assert.ok(Math.abs(fit.priors.derivedRankFactor - truth.derivedRankFactor) < 1.2, `derived ${fit.priors.derivedRankFactor}`);
  assert.equal(fit.priors.cap, UNSTUDIED_PRIORS.cap);
});

test("the fit hook keeps the defaults below the observation floor", () => {
  const fit = fitPriors(synthetic(UNSTUDIED_PRIORS, MIN_FIT_OBSERVATIONS - 1));
  assert.equal(fit.fitted, false);
  assert.deepEqual(fit.priors, UNSTUDIED_PRIORS);
});

test("placement answers and first reviews become observations", () => {
  const f = { rank: 10, derived: false };
  assert.deepEqual(placementObservations([{ freq: f, tier: 1, correct: true }, { freq: null, tier: 1, correct: false }]), [{ source: "placement", freq: f, tier: 1, knew: true }]);
  assert.deepEqual(firstReviewObservations([{ freq: f, tier: 0, rating: 1, firstSeen: true }, { freq: f, tier: 0, rating: 4, firstSeen: false }]), [{ source: "review", freq: f, tier: 0, knew: false }]);
});
