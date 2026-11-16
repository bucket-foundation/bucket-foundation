import assert from "node:assert/strict";
import { test } from "node:test";
import { boardRows, laneState, readBest, START, step, writeBest } from "./flag-run";

test("a run scores right lanes, stops on the first miss and continues once", () => {
  let s = step(START, { kind: "start" });
  s = step(s, { kind: "tap", lane: 2, answer: 2 });
  assert.deepEqual([s.phase, s.index, s.score], ["running", 1, 1]);
  s = step(s, { kind: "tap", lane: 0, answer: 3 });
  assert.deepEqual([s.phase, s.missed, s.picked], ["missed", 1, 0]);
  s = step(s, { kind: "continue" });
  assert.deepEqual([s.phase, s.index, s.continued], ["running", 2, true]);
  s = step(s, { kind: "timeout" });
  assert.equal(s.phase, "missed");
  assert.equal(step(s, { kind: "continue" }).phase, "missed");
  assert.equal(step(s, { kind: "end" }).phase, "over");
});

test("best score keeps today's maximum and survives blocked storage", () => {
  const box = new Map<string, string>();
  const store = () => ({ getItem: (k: string) => box.get(k) ?? null, setItem: (k: string, v: string) => void box.set(k, v) }) as unknown as Storage;
  assert.equal(readBest(store, "d"), 0);
  assert.equal(writeBest(store, "d", 5), 5);
  assert.equal(writeBest(store, "d", 3), 5);
  assert.equal(readBest(store, "d"), 5);
  assert.equal(readBest(() => { throw new Error("blocked"); }, "d"), 0);
});

test("laneState lights the answer and the wrong pick only after a miss", () => {
  assert.equal(laneState(START, 0, 0), undefined);
  const missed = { ...START, phase: "missed" as const, picked: 2 };
  assert.equal(laneState(missed, 1, 1), "right");
  assert.equal(laneState(missed, 2, 1), "wrong");
  assert.equal(laneState(missed, 3, 1), "dim");
});

test("boardRows ranks you among the ghosts by score", () => {
  const rows = boardRows([{ name: "Ana", flag: "es", skill: "fast", score: 9 }, { name: "Bo", flag: "se", skill: "slow", score: 2 }], 5);
  assert.deepEqual(rows.map((r) => [r.name, r.me]), [["Ana", false], ["You", true], ["Bo", false]]);
});
