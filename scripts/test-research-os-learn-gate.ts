import test from "node:test";
import assert from "node:assert/strict";
import { bandChangeAllowed, decideLearnWrite } from "../src/lib/research-os/learn-gate";

test("adults and teens write Learn progress", () => {
  assert.deepEqual(decideLearnWrite("18plus"), { allowed: true });
  assert.deepEqual(decideLearnWrite("13to17"), { allowed: true });
});

test("under 13 writes only with parent consent", () => {
  const child = decideLearnWrite("under13");
  assert.equal(!child.allowed && child.reason, "needs_parent");
  assert.equal(!child.allowed && /parent's email/.test(child.message), true);
  assert.equal(decideLearnWrite("under13", "none").allowed, false);
  assert.equal(decideLearnWrite("under13", "school").allowed, false);
  assert.deepEqual(decideLearnWrite("under13", "parent"), { allowed: true });
  const none = decideLearnWrite(null, "parent");
  assert.equal(!none.allowed && none.reason, "no_profile");
});

test("a minor band cannot be raised and under 13 cannot change", () => {
  assert.equal(bandChangeAllowed(null, "18plus"), true);
  assert.equal(bandChangeAllowed("18plus", "13to17"), true);
  assert.equal(bandChangeAllowed("13to17", "18plus"), false);
  assert.equal(bandChangeAllowed("13to17", "under13"), true);
  assert.equal(bandChangeAllowed("under13", "13to17"), false);
  assert.equal(bandChangeAllowed("under13", "under13"), true);
});
