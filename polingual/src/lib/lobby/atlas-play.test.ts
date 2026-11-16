import assert from "node:assert/strict";
import { test } from "node:test";
import { atlasPoints, ATLAS_MAX } from "@academy/voice-atlas";
import { addStamp, guessPoints, mapPoint, stamped } from "./atlas-play";

test("guessPoints halves the score after a peek", () => {
  assert.equal(guessPoints(500, false), Math.round(atlasPoints(500)));
  assert.equal(guessPoints(500, true), Math.round(atlasPoints(500) / 2));
});

test("stamped needs half the maximum", () => {
  assert.equal(stamped(ATLAS_MAX / 2), true);
  assert.equal(stamped(ATLAS_MAX / 2 - 1), false);
});

test("addStamp adds a language once", () => {
  assert.deepEqual(addStamp(["es"], "fr"), ["es", "fr"]);
  assert.deepEqual(addStamp(["es"], "es"), ["es"]);
});

test("mapPoint scales a pointer inside the box to map units", () => {
  assert.deepEqual(mapPoint(150, 70, { left: 100, top: 20, width: 100, height: 100 }, 1000, 500), [500, 250]);
});
