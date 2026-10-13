import test from "node:test";
import assert from "node:assert/strict";
import { ZOOM_STEPS, nextZoom } from "../src/components/research-os/views/ZoomPane";

test("zoom steps walk the ladder and stop at both ends", () => {
  assert.equal(nextZoom(1, 1), 1.5);
  assert.equal(nextZoom(1.5, 1), 2);
  assert.equal(nextZoom(6, 1), 6);
  assert.equal(nextZoom(1, -1), 1);
  assert.equal(nextZoom(2, -1), 1.5);
  assert.equal(nextZoom(2.2, 1), ZOOM_STEPS[1]);
});
