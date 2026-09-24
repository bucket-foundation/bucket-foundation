import test from "node:test";
import assert from "node:assert/strict";
import { bandChangeAllowed, decideLearnWrite } from "../src/lib/research-os/learn-gate";

test("only adults write Learn progress at launch", () => {
  assert.deepEqual(decideLearnWrite("18plus"), { allowed: true });
  const minor = decideLearnWrite("13to17");
  assert.equal(minor.allowed, false);
  assert.equal(!minor.allowed && minor.reason, "minor_read_only");
  const child = decideLearnWrite("under13");
  assert.equal(!child.allowed && child.reason, "under_13");
  const none = decideLearnWrite(null);
  assert.equal(!none.allowed && none.reason, "no_profile");
});

test("a minor band cannot be raised and under 13 cannot change", () => {
  assert.equal(bandChangeAllowed(null, "18plus"), true);
  assert.equal(bandChangeAllowed("18plus", "13to17"), true);
  assert.equal(bandChangeAllowed("13to17", "18plus"), false);
  assert.equal(bandChangeAllowed("13to17", "under13"), true);
  assert.equal(bandChangeAllowed("under13", "13to17"), false);
  assert.equal(bandChangeAllowed("under13", "18plus"), false);
  assert.equal(bandChangeAllowed("under13", "under13"), true);
});
