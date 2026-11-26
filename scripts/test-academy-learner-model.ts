import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { FSRS } from "../src/lib/academy/fsrs";
import { freqFromRow, frequencyPrior, inputEvidence, known, knownCount, retrievability, type LemmaEvidence } from "../src/lib/academy/learner-model";

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
