import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { blankOverwrites, isBlankProgress, progressWeight, pushSettled } from "../src/lib/academy/progress-guard";

const studied = { cards: { "es:hola": { reps: 2 } }, prof: {}, settings: { newPerDay: 4 }, stats: { xp: 10, history: { "2026-11-14": { new: 1, reviews: 1 } } } };
const fresh = { cards: {}, prof: {}, settings: { newPerDay: 4, requestRetention: 0.9 }, stats: { xp: 0, streak: 0, lastStudyDay: null, history: {} } };
const systems = { systems: [{ id: "s1" }], removed: {} };

test("a fresh engine state and an empty systems doc count as blank", () => {
  assert.equal(isBlankProgress(fresh), true);
  assert.equal(isBlankProgress({ systems: [], removed: {} }), true);
  assert.equal(isBlankProgress(null), true);
  assert.equal(isBlankProgress({}), true);
});

test("studied state and a systems doc with entries are not blank", () => {
  assert.equal(isBlankProgress(studied), false);
  assert.equal(isBlankProgress(systems), false);
  assert.equal(isBlankProgress({ systems: [], removed: { s1: 1 } }), false);
});

test("a blank push over a non-empty branch is refused", () => {
  assert.deepEqual(blankOverwrites({ "lang-s1": fresh, "lang-systems": { systems: [], removed: {} } }, { "lang-s1": studied, "lang-systems": systems }), ["lang-s1", "lang-systems"]);
});

test("a blank push to a new or blank branch and a real push over data pass", () => {
  assert.deepEqual(blankOverwrites({ "lang-s2": fresh }, {}), []);
  assert.deepEqual(blankOverwrites({ "lang-s2": fresh }, { "lang-s2": fresh }), []);
  assert.deepEqual(blankOverwrites({ "lang-s1": studied }, { "lang-s1": studied }), []);
});

test("a 409 blank_overwrite settles the outbox entry and other failures keep it", () => {
  const err = console.error;
  console.error = () => {};
  try {
    assert.equal(pushSettled(200), true);
    assert.equal(pushSettled(409), true);
    assert.equal(pushSettled(500), false);
    assert.equal(pushSettled(401), false);
  } finally {
    console.error = err;
  }
});

test("progressWeight matches the shared fixture the SQL check reads", () => {
  const cases = JSON.parse(fs.readFileSync(path.join(__dirname, "fixtures", "progress-weight.json"), "utf8")) as { name: string; data: unknown; weight: number }[];
  for (const c of cases) assert.equal(progressWeight(c.data), c.weight, c.name);
});
