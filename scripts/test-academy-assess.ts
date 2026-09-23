import test from "node:test";
import assert from "node:assert/strict";
import { buildRun, gradeAnswer, parseNumber, summarize } from "../src/lib/academy/assess";
import { withLeverage, type Atom } from "../src/lib/academy/engine";

test("parseNumber reads plain, scientific, fraction, and unicode forms", () => {
  assert.equal(parseNumber("6.022e23"), 6.022e23);
  assert.equal(parseNumber("6.022 × 10²³"), 6.022e23);
  assert.equal(parseNumber("1/4"), 0.25);
  assert.equal(parseNumber("−3"), -3);
  assert.equal(parseNumber("abc"), null);
});

test("gradeAnswer: numeric with tolerance and units, symbolic, open", () => {
  const v = gradeAnswer("6.02e23 molecules", "18 g ÷ 18 g/mol = 1 mol, so 6.022×10²³ molecules.");
  assert.equal(v.gradable, true);
  assert.equal(v.correct, true);
  assert.equal(gradeAnswer("5 m/s", "v = 10 m/s").correct, false);
  assert.equal(gradeAnswer("", "v = 10 m/s").reason, "blank");
  assert.equal(gradeAnswer("no idea", "v = 10 m/s").gradable, false);
  assert.equal(gradeAnswer("F = ma", "F=ma").correct, true);
  assert.equal(gradeAnswer("ma", "F = ma").correct, true);
  assert.equal(gradeAnswer("anything", "A long explanatory answer with no number in it at all.").gradable, false);
});

test("buildRun spreads levels, prefers due atoms, and seals one item per atom first", () => {
  const atoms: Atom[] = withLeverage([
    { id: "a", title: "A", requires: [], quiz: [{ level: "recall", prompt: "a?", answer: "1" }, { level: "apply", prompt: "a2?", answer: "2" }] },
    { id: "b", title: "B", requires: ["a"], quiz: [{ level: "recall", prompt: "b?", answer: "3" }] },
    { id: "c", title: "C", requires: ["a"], quiz: [{ level: "derive", prompt: "c?", answer: "4" }] },
  ]);
  const now = 1_000_000;
  const cards: Record<string, { due: number }> = { a: { due: now + 10 }, b: { due: now - 10 } };
  const run = buildRun(atoms, (id) => cards[id] ?? null, { size: 3, rng: () => 0.5, now });
  assert.equal(run.items.length, 3);
  assert.equal(run.items[0].atomId, "b");
  assert.equal(run.conceptCount, 2);
  const fresh = buildRun(atoms, () => null, { size: 3, rng: () => 0.5, now });
  assert.equal(fresh.conceptCount, 3);
});

test("summarize scores, splits trust, and names weak concepts once", () => {
  const s = summarize([
    { atomId: "a", level: "recall", correct: true, autoGraded: true },
    { atomId: "b", level: "apply", correct: false, autoGraded: true },
    { atomId: "b", level: "derive", correct: false, autoGraded: false },
  ]);
  assert.equal(s.total, 3);
  assert.equal(s.correct, 1);
  assert.equal(s.trust, "mixed");
  assert.deepEqual(s.weakConcepts, ["b"]);
  assert.equal(s.byLevel.apply.total, 1);
});
