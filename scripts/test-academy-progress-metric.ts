import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { epochDay, INPUT_COVERAGE, inputDays, inputSeconds, langMetrics, STREAK_INPUT_SECONDS, streakFromDays } from "../src/lib/academy/progress-metric";

const V = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "src/lib/academy/progress-metric-vectors.json"), "utf8"));

for (const c of V.rows) {
  test(`golden rows: ${c.name}`, () => {
    assert.equal(inputSeconds(c.rows, c.lang), c.expect.inputSeconds);
    assert.deepEqual(inputDays(c.rows, c.lang), c.expect.inputDays);
  });
}

for (const c of V.streak) test(`golden streak: ${c.name}`, () => assert.deepEqual(streakFromDays(c.days, c.today), c.expect));

for (const c of V.metrics) test(`golden metrics: ${c.name}`, () => assert.deepEqual(langMetrics(c.lang, c.cards, c.rows, V.now), c.expect));

test("thresholds match the plan", () => {
  assert.equal(INPUT_COVERAGE, 0.9);
  assert.equal(STREAK_INPUT_SECONDS, 300);
});

test("epoch days are consecutive across a leap day", () => {
  assert.equal(epochDay("2028-3-1") - epochDay("2028-2-28"), 2);
  assert.equal(epochDay("1970-1-1"), 0);
});
