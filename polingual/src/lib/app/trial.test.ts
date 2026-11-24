import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_PLAN, perWeek, trialDays, trialTimeline } from "./trial";

test("only the yearly plan carries the 7-day trial", () => {
  assert.equal(trialDays("yearly"), 7);
  assert.equal(trialDays("monthly"), 0);
  assert.equal(DEFAULT_PLAN, "yearly");
});

test("the yearly price reads as $1.15 a week", () => {
  assert.equal(perWeek(59.99), "$1.15 a week");
});

test("the timeline reminds 2 days before billing on day 7", () => {
  const start = new Date("2026-12-01T12:00:00Z");
  const steps = trialTimeline(start, "$59.99 a year");
  assert.deepEqual(steps.map((s) => s.day), [0, 5, 7]);
  assert.equal(steps[1].at.toISOString(), "2026-12-06T12:00:00.000Z");
  assert.match(steps[0].body, /No payment now/);
  assert.match(steps[2].body, /\$59\.99 a year/);
});
