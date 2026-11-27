import test from "node:test";
import assert from "node:assert/strict";
import { heardOf, parseHeard, settle } from "./player";

const base = { stationId: "st", lang: "es", startedAt: 1_000, since: null as number | null, ms: 0 };

test("settling adds the open span once and leaves a paused span alone", () => {
  const open = { ...base, since: 5_000, ms: 2_000 };
  const s = settle(open, 65_000)!;
  assert.equal(s.ms, 62_000);
  assert.equal(s.since, null);
  assert.equal(settle(s, 99_000), s);
  assert.equal(settle(null, 1), null);
});

test("a clock that runs backwards adds nothing", () => {
  assert.equal(settle({ ...base, since: 9_000, ms: 10 }, 8_000)!.ms, 10);
});

test("under a second of listening is not reported", () => {
  assert.equal(heardOf({ ...base, ms: 999 }), null);
  assert.deepEqual(heardOf({ ...base, ms: 1_000 }), { stationId: "st", lang: "es", startedAt: 1_000, ms: 1_000 });
});

test("stored spans survive a reload and bad rows are dropped", () => {
  const good = { stationId: "st", lang: "es", startedAt: 5, ms: 61_000 };
  assert.deepEqual(parseHeard(JSON.stringify([good, { stationId: 1 }, { ...good, ms: 10 }, null])), [good]);
  assert.deepEqual(parseHeard("not json"), []);
  assert.deepEqual(parseHeard(null), []);
  assert.deepEqual(parseHeard(JSON.stringify({ a: 1 })), []);
  assert.equal(parseHeard(JSON.stringify(Array.from({ length: 250 }, (_, i) => ({ ...good, startedAt: i })))).length, 200);
});
