import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { gradeQuestion, loadQuestionDeck, parseNumber, present, questionsFor, validateQuestion, type Question, type QuestionKind } from "../src/lib/academy/question-types";

const ROOT = join(__dirname, "..");
const QDIR = join(ROOT, "learning/app/corpus/questions");
const KINDS: QuestionKind[] = ["pick", "calculate", "order", "spot-error", "match"];
const decks = readdirSync(QDIR).filter((f) => f.endsWith(".json")).map((f) => {
  const branch = f.replace(/\.json$/, "");
  const corpus = JSON.parse(readFileSync(join(ROOT, "learning/app/corpus", f), "utf8"));
  return { branch, atomIds: corpus.atoms.map((a: { id: string }) => a.id) as string[], raw: JSON.parse(readFileSync(join(QDIR, f), "utf8")) };
});

test("question decks exist for the cosmology pilot", () => {
  assert.ok(decks.some((d) => d.branch === "06-cosmology"));
});

for (const { branch, atomIds, raw } of decks) {
  test(`${branch}: deck loads and every atom has all five kinds`, () => {
    const deck = loadQuestionDeck(raw, atomIds);
    assert.equal(deck.branch, branch);
    assert.equal(deck.questions.length, atomIds.length * 5);
    for (const id of atomIds) for (const k of KINDS) assert.equal(questionsFor(deck, id, k).length, 1, `${id} ${k}`);
  });

  test(`${branch}: every question grades its own key as correct`, () => {
    const deck = loadQuestionDeck(raw, atomIds);
    for (const q of deck.questions) {
      const r =
        q.kind === "pick" ? { kind: q.kind, choice: q.answer } :
        q.kind === "calculate" ? { kind: q.kind, value: q.answer } :
        q.kind === "order" ? { kind: q.kind, order: q.steps.map((_, i) => i) } :
        q.kind === "spot-error" ? { kind: q.kind, step: q.error } :
        { kind: q.kind, pairs: Object.fromEntries(q.pairs.map((p) => [p.term, p.meaning])) };
      const g = gradeQuestion(q, r as never);
      assert.ok(g.correct, q.id);
      assert.equal(g.rating, 3);
    }
  });
}

test("loader rejects unknown atoms, bad indices and duplicate ids", () => {
  const bad = { branch: "x", version: "0", questions: [
    { id: "a", atom: "nope", kind: "pick", prompt: "?", options: ["a", "b"], answer: 2 },
    { id: "a", atom: "nope", kind: "order", prompt: "?", steps: ["a", "b"] },
  ] };
  assert.throws(() => loadQuestionDeck(bad, ["real"]), /unknown atom.*answer out of range.*order needs 3\+.*duplicate id/);
});

test("loader works for any branch without atom ids", () => {
  const deck = loadQuestionDeck({ branch: "02-physics", version: "0", questions: [{ id: "k", atom: "kinematics", kind: "calculate", prompt: "v?", answer: 9.8, relTol: 0.01, unit: "m/s" }] });
  assert.equal(deck.branch, "02-physics");
});

test("pick and spot-error grade exact choices", () => {
  const q: Question = { id: "p", atom: "a", kind: "pick", prompt: "?", options: ["x", "y", "z"], answer: 1 };
  assert.equal(gradeQuestion(q, { kind: "pick", choice: 0 }).rating, 1);
  const s: Question = { id: "s", atom: "a", kind: "spot-error", prompt: "?", steps: ["a", "b", "c"], error: 2, fix: "f" };
  assert.ok(gradeQuestion(s, { kind: "spot-error", step: 2 }).correct);
  assert.equal(gradeQuestion(s, { kind: "pick", choice: 2 }).score, 0);
});

test("calculate accepts tolerance, relative tolerance and written forms", () => {
  const q: Question = { id: "c", atom: "a", kind: "calculate", prompt: "?", answer: 3e8, relTol: 0.01 };
  assert.ok(gradeQuestion(q, { kind: "calculate", value: "2.99 x 10^8" }).correct);
  assert.ok(gradeQuestion(q, { kind: "calculate", value: "300,000,000" }).correct);
  assert.ok(!gradeQuestion(q, { kind: "calculate", value: "2.9e8" }).correct);
  assert.ok(!gradeQuestion(q, { kind: "calculate", value: "abc" }).correct);
  assert.equal(parseNumber("45%"), 45);
  const exact: Question = { id: "e", atom: "a", kind: "calculate", prompt: "?", answer: 31 };
  assert.ok(!gradeQuestion(exact, { kind: "calculate", value: 32 }).correct);
});

test("order gives partial credit by pairwise agreement and rejects bad permutations", () => {
  const q: Question = { id: "o", atom: "a", kind: "order", prompt: "?", steps: ["1", "2", "3", "4"] };
  const swap = gradeQuestion(q, { kind: "order", order: [0, 1, 3, 2] });
  assert.equal(swap.score, 5 / 6);
  assert.equal(swap.rating, 2);
  assert.equal(gradeQuestion(q, { kind: "order", order: [3, 2, 1, 0] }).rating, 1);
  assert.equal(gradeQuestion(q, { kind: "order", order: [0, 0, 1, 2] }).score, 0);
});

test("match scores the share of right pairs", () => {
  const q: Question = { id: "m", atom: "a", kind: "match", prompt: "?", pairs: [{ term: "a", meaning: "1" }, { term: "b", meaning: "2" }] };
  assert.equal(gradeQuestion(q, { kind: "match", pairs: { a: "1", b: "1" } }).score, 0.5);
  assert.ok(validateQuestion({ ...q, pairs: [{ term: "a", meaning: "1" }, { term: "a", meaning: "2" }] }).length > 0);
});

test("present shuffles deterministically and never leaves the key in place", () => {
  const q: Question = { id: "p", atom: "a", kind: "pick", prompt: "?", options: ["w", "x", "y", "z"], answer: 0 };
  const a = present(q, "learner-1");
  assert.deepEqual(a.order, present(q, "learner-1").order);
  assert.deepEqual([...a.order].sort(), [0, 1, 2, 3]);
  assert.notDeepEqual(a.order, [0, 1, 2, 3]);
});
