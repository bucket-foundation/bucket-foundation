import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { gradeQuestion, loadQuestionDeck, parseNumber, present, questionForReview, questionsFor, rotationFor, validateQuestion, type Question, type QuestionKind } from "../src/lib/academy/question-types";

const ROOT = join(__dirname, "..");
const QDIR = join(ROOT, "learning/app/corpus/questions");
const KINDS: QuestionKind[] = ["pick", "calculate", "order", "spot-error", "match"];
const decks = readdirSync(QDIR).filter((f) => f.endsWith(".json")).map((f) => {
  const branch = f.replace(/\.json$/, "");
  const corpus = JSON.parse(readFileSync(join(ROOT, "learning/app/corpus", f), "utf8"));
  return { branch, atomIds: corpus.atoms.map((a: { id: string }) => a.id) as string[], raw: JSON.parse(readFileSync(join(QDIR, f), "utf8")) };
});

test("question decks exist for cosmology and physics", () => {
  for (const b of ["06-cosmology", "02-physics", "03-chemistry"]) assert.ok(decks.some((d) => d.branch === b), b);
});

for (const { branch, atomIds, raw } of decks) {
  test(`${branch}: deck loads and every atom has all five kinds`, () => {
    const deck = loadQuestionDeck(raw, atomIds);
    assert.equal(deck.branch, branch);
    for (const id of atomIds) {
      const all = questionsFor(deck, id);
      const extras = all.filter((q) => q.id === `${id}.applied`);
      assert.ok(extras.length <= 1 && extras.every((q) => q.applied === true), `${id}: at most one extra, marked applied`);
      for (const k of KINDS) assert.equal(all.filter((q) => q.kind === k && !extras.includes(q)).length, 1, `${id} ${k}`);
      assert.equal(all.length, 5 + extras.length, `${id}: five kinds plus one applied extra at most`);
    }
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

test("loader rejects a non-boolean applied flag", () => {
  assert.throws(() => loadQuestionDeck({ branch: "x", version: "0", questions: [{ id: "a", atom: "a", kind: "pick", prompt: "?", options: ["a", "b"], answer: 0, applied: "yes" }] }), /applied must be a boolean/);
});

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
  assert.ok(Math.abs(swap.score - 2 / 3) < 1e-9);
  assert.equal(swap.rating, 2);
  assert.equal(gradeQuestion(q, { kind: "order", order: [3, 2, 1, 0] }).rating, 1);
  assert.equal(gradeQuestion(q, { kind: "order", order: [0, 0, 1, 2] }).score, 0);
});

test("match scores right pairs above the one a guess gets", () => {
  const q: Question = { id: "m", atom: "a", kind: "match", prompt: "?", pairs: [{ term: "a", meaning: "1" }, { term: "b", meaning: "2" }, { term: "c", meaning: "3" }] };
  assert.equal(gradeQuestion(q, { kind: "match", pairs: { a: "1", b: "3", c: "2" } }).score, 0);
  assert.ok(gradeQuestion(q, { kind: "match", pairs: { a: "1", b: "2", c: "3" } }).correct);
  assert.ok(validateQuestion({ ...q, pairs: q.pairs.slice(0, 2) }).length > 0);
  assert.ok(validateQuestion({ ...q, pairs: [{ term: "a", meaning: "1" }, { term: "a", meaning: "2" }] }).length > 0);
});

test("present shuffles deterministically per learner", () => {
  const q: Question = { id: "p", atom: "a", kind: "pick", prompt: "?", options: ["w", "x", "y", "z"], answer: 0 };
  const a = present(q, "learner-1");
  assert.deepEqual(a.order, present(q, "learner-1").order);
  assert.deepEqual([...a.order].sort(), [0, 1, 2, 3]);
  assert.notDeepEqual(a.order, present(q, "learner-2").order);
});

function permutations(n: number): number[][] {
  if (n === 1) return [[0]];
  return permutations(n - 1).flatMap((p) => Array.from({ length: n }, (_, i) => [...p.slice(0, i), n - 1, ...p.slice(i)]));
}

test("order: chance-level orderings earn no credit on average", () => {
  for (const n of [3, 4, 5]) {
    const q: Question = { id: "o", atom: "a", kind: "order", prompt: "?", steps: Array.from({ length: n }, (_, i) => `s${i}`) };
    const all = permutations(n).map((order) => gradeQuestion(q, { kind: "order", order }));
    const mean = all.reduce((t, g) => t + g.score, 0) / all.length;
    assert.ok(mean < 0.2, `n=${n} mean ${mean}`);
    assert.equal(all.filter((g) => g.correct).length, 1);
    assert.ok(all.filter((g) => g.rating > 1).length / all.length < 0.25);
  }
});

test("match: chance-level pairings earn no credit on average", () => {
  for (const n of [3, 4, 5]) {
    const pairs = Array.from({ length: n }, (_, i) => ({ term: `t${i}`, meaning: `m${i}` }));
    const q: Question = { id: "m", atom: "a", kind: "match", prompt: "?", pairs };
    const all = permutations(n).map((perm) => gradeQuestion(q, { kind: "match", pairs: Object.fromEntries(perm.map((j, i) => [`t${i}`, `m${j}`])) }));
    const mean = all.reduce((t, g) => t + g.score, 0) / all.length;
    assert.ok(mean < 0.2, `n=${n} mean ${mean}`);
    assert.equal(all.filter((g) => g.correct).length, 1);
  }
});

for (const { branch, raw } of decks) {
  const picks = (raw.questions as Question[]).filter((q): q is Extract<Question, { kind: "pick" }> => q.kind === "pick");

  test(`${branch}: displayed position of the correct option is near uniform`, () => {
    const counts = [0, 0, 0, 0];
    for (let i = 0; i < 64; i++) {
      const seed = `s${i}`;
      for (const q of picks) counts[present(q, seed).order.indexOf(q.answer)]++;
    }
    const total = counts.reduce((a, b) => a + b, 0);
    for (const c of counts) assert.ok(Math.abs(c / total - 0.25) < 0.05, `${branch} positions ${counts}`);
  });

  test(`${branch}: the correct option is not systematically the longest or shortest`, () => {
    const strictly = (q: (typeof picks)[number], pick: (a: number, b: number) => boolean) =>
      q.options.every((o, i) => i === q.answer || pick(q.options[q.answer].length, o.length));
    const longest = picks.filter((q) => strictly(q, (a, b) => a > b)).length / picks.length;
    const shortest = picks.filter((q) => strictly(q, (a, b) => a < b)).length / picks.length;
    assert.ok(longest <= 0.3, `${branch} longest ${longest}`);
    assert.ok(shortest <= 0.35, `${branch} shortest ${shortest}`);
  });
}

test("review records point at questions that exist", () => {
  const dir = join(QDIR, "reviews");
  const files = readdirSync(dir).filter((f) => f.endsWith(".json"));
  assert.ok(files.includes("06-cosmology.json"));
  assert.ok(files.includes("02-physics.json"));
  assert.ok(files.includes("03-chemistry.json"));
  for (const f of files) {
    const rec = JSON.parse(readFileSync(join(dir, f), "utf8")) as { branch: string; reviews: Record<string, { reviewed_by: string; reviewed_at: string; verdict?: string; note?: string }> };
    const deck = decks.find((d) => d.branch === rec.branch);
    assert.ok(deck, `${f}: no deck for ${rec.branch}`);
    const ids = new Set((deck.raw.questions as Question[]).map((q) => q.id));
    if (rec.branch !== "06-cosmology") assert.equal(Object.keys(rec.reviews).length, ids.size, `${f}: every question needs a record`);
    for (const [id, r] of Object.entries(rec.reviews)) {
      assert.ok(ids.has(id), `${f}: unknown question ${id}`);
      assert.ok(r.reviewed_by && /^\d{4}-\d{2}-\d{2}$/.test(r.reviewed_at), `${f}: bad record ${id}`);
      if (rec.branch !== "06-cosmology") assert.ok(r.verdict, `${f}: missing verdict ${id}`);
      if (r.verdict !== undefined) assert.ok(r.verdict === "ok" || (r.verdict === "fixed" && !!r.note), `${f}: bad verdict ${id}`);
    }
  }
});

test("01-mathematics: deck exists and every question has a review verdict", () => {
  const deck = decks.find((d) => d.branch === "01-mathematics");
  assert.ok(deck);
  const rec = JSON.parse(readFileSync(join(QDIR, "reviews/01-mathematics.json"), "utf8")) as { reviews: Record<string, { verdict?: string }> };
  for (const q of deck.raw.questions as Question[]) assert.ok(rec.reviews[q.id]?.verdict, q.id);
});

function swiftRotation(qs: Question[]): Question[] {
  return [...qs.filter((q) => q.applied === true), ...qs.filter((q) => q.applied !== true)];
}

test("web rotation matches the QuestionTypes.swift rotation for reps 1 to 2n on every fixture deck", () => {
  for (const { branch, atomIds, raw } of decks) {
    const deck = loadQuestionDeck(raw, atomIds);
    for (const atom of atomIds) {
      const expected = swiftRotation(deck.questions.filter((q) => q.atom === atom));
      const n = expected.length;
      assert.deepEqual(rotationFor(deck, atom).map((q) => q.id), expected.map((q) => q.id), `${branch} ${atom}`);
      for (let reps = 1; reps <= 2 * n; reps++) assert.equal(questionForReview(deck, atom, reps)?.id, expected[(reps - 1) % n].id, `${branch} ${atom} reps ${reps}`);
    }
  }
});

test("02-physics: any n consecutive reviews show the applied task exactly once", () => {
  const d = decks.find((x) => x.branch === "02-physics")!;
  const deck = loadQuestionDeck(d.raw, d.atomIds);
  const withApplied = d.atomIds.filter((a) => questionsFor(deck, a).some((q) => q.applied === true));
  assert.equal(withApplied.length, 55);
  for (const atom of withApplied) {
    const n = rotationFor(deck, atom).length;
    assert.ok(n === 5 || n === 6, atom);
    for (let start = 1; start <= 2 * n; start++) {
      const cycle: Question[] = Array.from({ length: n }, (_, i) => questionForReview(deck, atom, start + i)!);
      assert.equal(cycle.filter((q) => q.applied === true).length, 1, `${atom} from ${start}`);
      assert.equal(new Set(cycle.map((q) => q.id)).size, n, `${atom} from ${start}`);
    }
  }
  assert.equal(questionForReview(deck, "nope", 1), undefined);
  assert.equal(questionForReview(deck, withApplied[0], 3, "pick")?.kind, "pick");
});

test("02-physics: reps = 1 shows the applied task for all 55 atoms", () => {
  const d = decks.find((x) => x.branch === "02-physics")!;
  const deck = loadQuestionDeck(d.raw, d.atomIds);
  const withApplied = d.atomIds.filter((a) => questionsFor(deck, a).some((q) => q.applied === true));
  assert.equal(withApplied.length, 55);
  for (const atom of withApplied) assert.equal(questionForReview(deck, atom, 1)?.applied, true, atom);
});
