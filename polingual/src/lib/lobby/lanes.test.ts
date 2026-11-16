import assert from "node:assert/strict";
import { test } from "node:test";
import { tileSchedule } from "@academy/lobby-tiles";
import { LANE_KEYS, laneTarget } from "./lanes";
import { MUTE_KEY, readMuted, writeMuted } from "./sound";

test("a lane tap takes the lowest live tile in that lane", () => {
  const choices = ["es:gato", "fr:chat", "de:Katze", "it:gatto", "pt:gato", "nl:kat"];
  const schedule = [
    { index: 0, lane: 0, spawnMs: 0, fallMs: 2000 },
    { index: 1, lane: 0, spawnMs: 500, fallMs: 2000 },
    { index: 2, lane: 1, spawnMs: 3000, fallMs: 2000 },
  ];
  assert.equal(laneTarget(choices, schedule, 0, 1000, new Set()), 0);
  assert.equal(laneTarget(choices, schedule, 0, 1000, new Set([0])), 1);
  assert.equal(laneTarget(choices, schedule, 1, 1000, new Set()), null);
  assert.equal(laneTarget(choices, schedule, 0, 2600, new Set()), null);
  assert.equal(laneTarget(choices.slice(0, 1), schedule, 0, 1000, new Set([0])), null);
  assert.equal(laneTarget(choices, tileSchedule(6, 0, 8, 6), 0, 0, new Set()), 0);
});

test("keys map to the four lanes", () => {
  assert.deepEqual(["d", "f", "j", "k"].map((k) => LANE_KEYS[k]), [0, 1, 2, 3]);
  assert.deepEqual(["arrowleft", "arrowdown", "arrowup", "arrowright"].map((k) => LANE_KEYS[k]), [0, 1, 2, 3]);
});

test("mute persists and survives a broken storage", () => {
  const data = new Map<string, string>();
  const store = { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v) } as unknown as Storage;
  assert.equal(readMuted(() => store), false);
  writeMuted(() => store, true);
  assert.equal(data.get(MUTE_KEY), "1");
  assert.equal(readMuted(() => store), true);
  const broken = { getItem: () => { throw new Error("denied"); }, setItem: () => { throw new Error("denied"); } } as unknown as Storage;
  assert.equal(readMuted(() => broken), false);
  writeMuted(() => broken, true);
  assert.equal(readMuted(() => null), false);
});
