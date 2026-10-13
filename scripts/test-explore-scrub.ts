import test from "node:test";
import assert from "node:assert/strict";
import { PAGE_STEP, WHEEL_GESTURE_GAP_MS, clampIndex, describeItem, fractionOfIndex, indexFromFraction, keyStep, wheelShouldStep, yearSteps } from "../src/lib/explore/scrub";

test("indices clamp to the item range", () => {
  assert.equal(clampIndex(-3, 5), 0);
  assert.equal(clampIndex(9, 5), 4);
  assert.equal(clampIndex(2.6, 5), 3);
  assert.equal(clampIndex(3, 0), 0);
});

test("a drag fraction maps to an index and back", () => {
  assert.equal(indexFromFraction(0, 260), 0);
  assert.equal(indexFromFraction(1, 260), 259);
  assert.equal(indexFromFraction(-2, 260), 0);
  assert.equal(indexFromFraction(5, 260), 259);
  assert.equal(indexFromFraction(0.5, 11), 5);
  assert.equal(indexFromFraction(0.7, 1), 0);
  for (const i of [0, 1, 57, 259]) assert.equal(indexFromFraction(fractionOfIndex(i, 260), 260), i);
  assert.equal(fractionOfIndex(0, 1), 0);
});

test("arrow, page, home and end keys step the scrubber", () => {
  assert.equal(keyStep("ArrowRight", 3, 10), 4);
  assert.equal(keyStep("ArrowDown", 3, 10), 4);
  assert.equal(keyStep("ArrowLeft", 3, 10), 2);
  assert.equal(keyStep("ArrowUp", 0, 10), 0);
  assert.equal(keyStep("ArrowRight", 9, 10), 9);
  assert.equal(keyStep("PageDown", 2, 30), 2 + PAGE_STEP);
  assert.equal(keyStep("PageUp", 4, 30), 0);
  assert.equal(keyStep("Home", 7, 30), 0);
  assert.equal(keyStep("End", 7, 30), 29);
  assert.equal(keyStep("a", 7, 30), null);
});

test("wheel events inside one gesture step once", () => {
  assert.equal(wheelShouldStep(0, 1000), true);
  assert.equal(wheelShouldStep(1000, 1000 + WHEEL_GESTURE_GAP_MS - 1), false);
  assert.equal(wheelShouldStep(1000, 1000 + WHEEL_GESTURE_GAP_MS), true);
  let last = 0;
  let steps = 0;
  for (let t = 1000; t < 1000 + 60 * 16; t += 16) {
    if (wheelShouldStep(last, t)) steps++;
    last = t;
  }
  assert.equal(steps, 1);
});

test("the label shows the item, its index and its meta", () => {
  assert.equal(describeItem("Lascaux cave paintings", 0, 260, ["event", "deep-history"]), "Lascaux cave paintings · 1 / 260 · event · deep-history");
  assert.equal(describeItem("x", 4, 10), "x · 5 / 10");
  assert.equal(describeItem("x", 0, 0), "x");
  assert.equal(describeItem("x", 0, 2, ["", "a"]), "x · 1 / 2 · a");
});

test("year steps are the sorted distinct observation years", () => {
  assert.deepEqual(yearSteps([{ t: 1950 }, { t: null }, { t: 1900 }, { t: 1950 }, {}]), [1900, 1950]);
  assert.deepEqual(yearSteps([]), []);
});
