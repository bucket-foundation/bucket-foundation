import assert from "node:assert/strict";
import { test } from "node:test";
import { classifyTilt, settled } from "./tilt";

test("screen to the floor scores, screen to the ceiling passes, upright waits", () => {
  assert.equal(classifyTilt(-8), "score");
  assert.equal(classifyTilt(8), "pass");
  assert.equal(classifyTilt(1), null);
  assert.equal(classifyTilt(null), null);
  assert.equal(settled(2), true);
  assert.equal(settled(5), false);
  assert.equal(settled(null), false);
});
