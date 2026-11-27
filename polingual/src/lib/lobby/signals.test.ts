import { test } from "node:test";
import assert from "node:assert/strict";
import { addFloat, FLOAT_MAX, FLOAT_MS, readSignal, tally } from "./signals";

test("readSignal keeps only the fixed reactions and well-formed votes", () => {
  assert.deepEqual(readSignal({ kind: "react", emoji: "🔥", from: "a" }), { kind: "react", emoji: "🔥", from: "a" });
  assert.equal(readSignal({ kind: "react", emoji: "💩" }), null);
  assert.deepEqual(readSignal({ kind: "vote", round: 1, choice: "es:gato", from: "a" }), { kind: "vote", round: 1, choice: "es:gato", from: "a" });
  assert.equal(readSignal({ kind: "vote", round: 1, choice: "x" }), null);
  assert.equal(readSignal("nope"), null);
});

test("floats expire and stay capped", () => {
  let f = addFloat([], "🔥", 0, 1, () => 0.5);
  assert.equal(f[0].x, 50);
  f = addFloat(f, "🎉", FLOAT_MS + 1, 2, () => 0);
  assert.deepEqual(f.map((x) => x.id), [2]);
  for (let i = 0; i < 40; i++) f = addFloat(f, "👏", FLOAT_MS + 2, 3 + i, () => 0.1);
  assert.equal(f.length, FLOAT_MAX);
});

test("tally counts one vote per voter, the last one wins", () => {
  const votes = new Map([["a", "es:gato"], ["b", "fr:chat"], ["c", "es:gato"]]);
  assert.deepEqual(tally(votes), [{ choice: "es:gato", votes: 2 }, { choice: "fr:chat", votes: 1 }]);
  votes.set("b", "es:gato");
  assert.deepEqual(tally(votes), [{ choice: "es:gato", votes: 3 }]);
});
