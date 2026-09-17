/**
 * Pure tests for the Academy engine port: FSRS scheduling, leverage, the
 * daily route, grading with proficiency and streaks, level rotation, and
 * the cross-device merge. node:test, no network.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { FSRS, DAY_MS } from "../src/lib/academy/fsrs";
import { buildEncompassingMap, emptyState, grade, mergeState, pickLevel, route, summary, withLeverage, type Atom } from "../src/lib/academy/engine";

const atoms: Atom[] = withLeverage([
  { id: "a", title: "A", shell: "prereq", requires: [], quiz: [{ level: "recall", prompt: "?", answer: "!" }, { level: "apply", prompt: "?", answer: "!" }] },
  { id: "b", title: "B", shell: "nucleus", requires: ["a"], quiz: [{ level: "recall", prompt: "?", answer: "!" }] },
  { id: "c", title: "C", shell: "nucleus", requires: ["b"], quiz: [{ level: "recall", prompt: "?", answer: "!" }] },
  { id: "d", title: "D", shell: "frontier", requires: ["a"], quiz: [{ level: "recall", prompt: "?", answer: "!" }] },
]);
const enc = buildEncompassingMap(atoms);
const NOW = Date.UTC(2026, 8, 16, 12);

test("FSRS: a first Good sets stability from w[2] and schedules days ahead", () => {
  const f = new FSRS();
  const c = f.review(null, 3, NOW);
  assert.equal(c.stability, 3.173);
  assert.equal(c.state, "review");
  assert.ok((c.due as number) > NOW + DAY_MS);
  const again = f.review(c, 1, c.due as number);
  assert.equal(again.state, "relearning");
  assert.equal(again.lapses, 1);
  assert.ok((again.stability as number) <= (c.stability as number));
});

test("leverage: the root unlocks the most and ranks first", () => {
  const a = atoms.find((x) => x.id === "a")!;
  assert.equal(a.leverage, 1);
  assert.deepEqual(a.unlocks?.sort(), ["b", "d"]);
  assert.deepEqual(enc.c.map((e) => e.id), ["b", "a"]);
});

test("route: new atoms only when unlocked, within the daily budget, prereq shell first", () => {
  const s = emptyState();
  s.settings.newPerDay = 2;
  const r = route(s, atoms, NOW);
  assert.deepEqual(r.map((x) => x.id), ["a"]);
  const s2 = grade(s, atoms, enc, "a", 3, "recall", NOW);
  const r2 = route(s2, atoms, NOW);
  assert.deepEqual(r2.map((x) => `${x.kind}:${x.id}`), ["new:b"]);
});

test("grade: xp, history, streak, proficiency, and a due review the next day", () => {
  let s = grade(emptyState(), atoms, enc, "a", 3, "recall", NOW);
  assert.equal(s.stats.xp, 5);
  assert.equal(s.stats.streak, 1);
  assert.equal(s.prof.a.n, 1);
  s = grade(s, atoms, enc, "b", 4, "apply", NOW + DAY_MS);
  assert.equal(s.stats.xp, 13);
  assert.equal(s.stats.streak, 2);
  const later = (s.cards.a.due as number) + 1;
  assert.deepEqual(route(s, atoms, later).filter((x) => x.kind === "review").map((x) => x.id), ["a"]);
  const sum = summary(s, atoms, NOW + DAY_MS);
  assert.equal(sum.introduced, 2);
  assert.equal(sum.total, 4);
});

test("pickLevel rotates by mastery and falls back to a depth the atom has", () => {
  const s = emptyState();
  assert.equal(pickLevel(s, atoms[0]), "recall");
  s.cards.a = { state: "review", stability: 400, difficulty: 3, due: NOW, lastReview: NOW, reps: 9, lapses: 0 };
  s.prof.a = { theta: 4, n: 9 };
  assert.equal(pickLevel(s, atoms[0]), "apply");
});

test("mergeState keeps the most recent card, the max stats, and the union of history", () => {
  const a = grade(emptyState(), atoms, enc, "a", 3, "recall", NOW);
  const b = grade(emptyState(), atoms, enc, "a", 4, "recall", NOW + 1000);
  b.stats.xp = 50;
  const m = mergeState(a, b);
  assert.equal(m.cards.a.lastReview, NOW + 1000);
  assert.equal(m.stats.xp, 50);
  assert.deepEqual(mergeState(a, b).cards, mergeState(b, a).cards);
  assert.equal(Object.keys(m.stats.history).length, 1);
});
