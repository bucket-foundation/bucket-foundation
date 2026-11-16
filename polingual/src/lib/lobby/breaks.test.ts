import assert from "node:assert/strict";
import { test } from "node:test";
import { BREAKS_KEY, readBreaks, writeBreaks } from "./breaks";

test("ad break counters survive a round trip and fail closed", () => {
  const box = new Map<string, string>();
  const store = { getItem: (k: string) => box.get(k) ?? null, setItem: (k: string, v: string) => void box.set(k, v) };
  assert.deepEqual(readBreaks(() => store), { games: 0, lastInterstitial: null });
  writeBreaks(() => store, { games: 2, lastInterstitial: 5 });
  assert.deepEqual(readBreaks(() => store), { games: 2, lastInterstitial: 5 });
  box.set(BREAKS_KEY, "{bad");
  assert.deepEqual(readBreaks(() => store), { games: 0, lastInterstitial: null });
  assert.deepEqual(readBreaks(() => { throw new Error("blocked"); }), { games: 0, lastInterstitial: null });
});
