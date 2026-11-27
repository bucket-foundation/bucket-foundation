import { test } from "node:test";
import assert from "node:assert/strict";
import { addFloat, audienceTally, FLOAT_MAX, FLOAT_MS, readSignal } from "./signals";

test("readSignal keeps only the fixed reactions and drops broadcast votes", () => {
  assert.deepEqual(readSignal({ kind: "react", emoji: "🔥", from: "a" }), { kind: "react", emoji: "🔥", from: "a" });
  assert.equal(readSignal({ kind: "react", emoji: "💩" }), null);
  assert.equal(readSignal({ kind: "vote", round: 1, choice: "es:gato", from: "a" }), null);
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

test("the TV reads the audience tally the server reported for the round", () => {
  const tallies = [{ round: 4, choices: [{ choice: "es:gato", votes: 2 }], total: 2 }, { round: 3, choices: [], total: 0 }];
  assert.deepEqual(audienceTally(tallies, 4)?.choices[0], { choice: "es:gato", votes: 2 });
  assert.equal(audienceTally(tallies, 3), null);
  assert.equal(audienceTally(undefined, 4), null);
});
