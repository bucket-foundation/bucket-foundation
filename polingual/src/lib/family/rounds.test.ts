import { test } from "node:test";
import assert from "node:assert/strict";
import { screenRole, teachError, tvPlayable } from "./rounds";

test("a screen seat is the TV, a host with no screen shares their own, others are phones", () => {
  assert.equal(screenRole("tv1", "h", ["tv1"]), "tv");
  assert.equal(screenRole("h", "h", []), "shared");
  assert.equal(screenRole("h", "h", ["tv1"]), "phone");
  assert.equal(screenRole("p", "h", []), "phone");
});

test("the TV refuses clips without a public licence; family clips play only in their room", () => {
  assert.ok(tvPlayable({ licence: "cc-by" }, false));
  assert.ok(!tvPlayable({ licence: "personal" }, true));
  assert.ok(!tvPlayable({}, true));
  assert.ok(!tvPlayable(null, true));
  assert.ok(tvPlayable({ licence: "family-room" }, true));
  assert.ok(!tvPlayable({ licence: "family-room" }, false));
});

test("teach refusals read as plain sentences", () => {
  assert.match(teachError("not_adult"), /adults/);
  assert.match(teachError("weird"), /Try again/);
});
