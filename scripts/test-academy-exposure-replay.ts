import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { normalizeState } from "../src/lib/academy/engine";
import { creditOnDay, EXPOSURE_ALPHA, exposureGainFor, exposureParams, groupOnDay, NO_RESOLVER, replayLangLog, type ExposureCard } from "../src/lib/academy/exposure-replay";
import type { ExposureRow, LogRow, ReviewLogRow } from "../src/lib/academy/learn-log";

const V = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "src/lib/academy/exposure-vectors.json"), "utf8"));

for (const c of V.cases) {
  test(`golden exposure: ${c.name}`, () => {
    let card: ExposureCard | undefined = c.card;
    for (const s of c.steps) {
      card = groupOnDay(card, s.tapped, s.at, s.day, s.alpha);
      assert.deepEqual({ stability: card!.stability, due: card!.due, lastReview: card!.lastReview ?? null, exposureDay: card!.exposureDay ?? null }, s.expect);
    }
  });
}

test("alpha defaults to 0 and the gain never exceeds 0.15", () => {
  assert.equal(EXPOSURE_ALPHA, 0);
  for (const a of [-1, 0, 0.3, 1, 7]) assert.ok(exposureGainFor(a) >= 0 && exposureGainFor(a) <= 0.15);
});

const T = Date.UTC(2026, 10, 10, 12);
const D = 86_400_000;
const base = (s: number, ago: number): ExposureCard => ({ state: "review", stability: s, difficulty: 5, lastReview: T - ago * D, due: T + D, reps: 2, lapses: 0 });

test("E1 to E4 hold over a sweep of cards", () => {
  for (const s of [0.5, 1, 3, 10, 50, 300]) for (const ago of [0, 1, 5, 20, 90]) for (const alpha of [0, 0.5, 1]) {
    const c = base(s, ago);
    const e = creditOnDay(c, T, "d", alpha)!;
    assert.ok(e.stability! >= c.stability! && e.stability! <= c.stability! * 1.15 + 1e-9, "E1");
    assert.ok(e.due! >= c.due! && e.lastReview === c.lastReview, "E3");
    assert.deepEqual(creditOnDay(e, T + 1000, "d", alpha), e, "E2");
    const t = groupOnDay(c, [true], T, "d", alpha)!;
    assert.equal(t.stability, c.stability, "E4");
    assert.equal(t.due, T);
    assert.deepEqual(groupOnDay(c, [true, false, false], T, "d", alpha), groupOnDay(c, [false, true, false], T, "d", alpha), "E5");
  }
});

const row = (id: string, at: number, extra: Partial<ExposureRow>): ExposureRow => ({ kind: "exposure", review_id: id, reviewed_at: at, device_id: "d", tz: "UTC", system_id: "s", lang: "es", item: "i", unit: "u", lemmas_seen: [], taps: [], seconds: 10, coverage_pred: 0.9, completed: true, ...extra });
const rev = (id: string, at: number, rating: 1 | 2 | 3 | 4): ReviewLogRow => ({ kind: "review", review_id: id, reviewed_at: at, device_id: "d", tz: "UTC", system_id: "s", card_id: "es:casa", rating, level: "recall", atoms_version: "lang" });

const resolveLemma = (lang: string, lemma: string) => (lang === "es" && lemma.toLowerCase() === "casa" ? "es:casa" : null);

test("replay applies exposures and taps from the log and keeps review rows intact", () => {
  const log: LogRow[] = [rev("r1", T, 3), rev("r2", T + 3 * D, 3), row("e1", T + 4 * D, { lemmas_seen: ["casa"] }), row("e2", T + 4 * D, { lemmas_seen: ["casa"], taps: ["casa"] })];
  const plain = replayLangLog(null, log.filter((r) => r.kind === "review"), exposureParams(resolveLemma));
  const zero = replayLangLog(null, log, exposureParams(resolveLemma));
  assert.equal(zero.cards["es:casa"].stability, plain.cards["es:casa"].stability, "alpha 0 leaves S alone");
  assert.equal(zero.cards["es:casa"].lastReview, plain.cards["es:casa"].lastReview);
  assert.equal(zero.cards["es:casa"].due, T + 4 * D, "the tap sets due to now");
  const shuffled = replayLangLog(null, [log[3], log[2], log[1], log[0]], exposureParams(resolveLemma));
  assert.equal(replayLangLog(null, log, exposureParams(NO_RESOLVER)).cards["es:casa"].due, plain.cards["es:casa"].due, "no resolver, no exposure effect");
  assert.deepEqual(shuffled, zero, "E5 over the whole log");
  const fitted = replayLangLog(null, log.slice(0, 3), { alpha: 1, resolve: (l, x) => `${l}:${x}` });
  assert.ok(fitted.cards["es:casa"].stability! > plain.cards["es:casa"].stability!);
  assert.deepEqual(replayLangLog(null, []), normalizeState(null));
});

test("an unmapped lemma touches no card, and a regrade keeps the exposure day", () => {
  const p = { alpha: 1, resolve: resolveLemma };
  const log: LogRow[] = [rev("r1", T, 3), rev("r2", T + 3 * D, 3), row("e1", T + 4 * D, { lemmas_seen: ["casa"] }), rev("r3", T + 4 * D + 1000, 3), row("e2", T + 4 * D + 2000, { lemmas_seen: ["casa"] })];
  const once = replayLangLog(null, log.slice(0, 4), p);
  const twice = replayLangLog(null, log, p);
  assert.equal((once.cards["es:casa"] as ExposureCard).exposureDay, (twice.cards["es:casa"] as ExposureCard).exposureDay);
  assert.equal(twice.cards["es:casa"].stability, once.cards["es:casa"].stability, "no second credit the same day after a regrade");
});
