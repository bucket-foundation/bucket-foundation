import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { laterCard, type MergeableCard } from "../src/lib/academy/card-merge";
import { mergeState, normalizeState, type EngineState } from "../src/lib/academy/engine";

type Case = { a: MergeableCard; b: MergeableCard; winner: "a" | "b" };
const cases = JSON.parse(readFileSync(join(__dirname, "fixtures", "card-merge-cases.json"), "utf8")) as Case[];

test("the shared card rule picks the fixture winner in either order", () => {
  for (const c of cases) {
    const want = c[c.winner];
    assert.deepEqual(laterCard(c.a, c.b), want);
    assert.deepEqual(laterCard(c.b, c.a), want);
  }
});

test("web and Android edits of one card settle on the same card in one round", () => {
  const web = { reps: 2, lastReview: 9000, lapses: 0, due: 9500, stability: 4 };
  const android = { reps: 3, lastReview: 2000, lapses: 0, due: 5000, stability: 9.5 };
  const state = (card: object) => normalizeState({ cards: { "fr:chat": card } } as unknown as EngineState);
  const onWeb = mergeState(state(web), state(android)).cards["fr:chat"];
  const onAndroid = mergeState(state(android), state(web)).cards["fr:chat"];
  assert.deepEqual(onWeb, android);
  assert.deepEqual(onAndroid, android);
  assert.deepEqual(mergeState(state(onWeb), state(onAndroid)).cards["fr:chat"], onWeb);
});
