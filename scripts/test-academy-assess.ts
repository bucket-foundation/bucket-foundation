import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildRun, gradeAnswer, gradeItem, parseNumber, summarize } from "../src/lib/academy/assess";
import { withLeverage, type Atom } from "../src/lib/academy/engine";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const standalone = require("../learning/app/js/assess.js") as { gradeItem: (input: string, item: object) => { correct?: boolean } };

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

test("gradeItem grades a keyed item on its key, variants and tolerance", () => {
  const long = "Helium, because lighter molecules move faster at one temperature.";
  assert.equal(gradeItem("Helium", { answer: long, key: "helium" }).correct, true);
  assert.equal(gradeItem("He", { answer: long, key: "helium", accept: ["He"] }).correct, true);
  assert.equal(gradeItem("O2", { answer: long, key: "hydrogen", accept: ["H2"] }).correct, false);
  assert.equal(gradeItem("", { answer: long, key: "helium" }).reason, "blank");
  assert.equal(gradeItem("1.4", { answer: long, key: "1.36 kcal/mol" }).correct, false);
  assert.equal(gradeItem("1.4", { answer: long, key: "1.36 kcal/mol", tol: 0.05 }).correct, true);
  assert.equal(gradeItem("7.6 x 10^9 M^-1 s^-1", { answer: long, key: "7.6e9" }).correct, true);
  assert.equal(gradeItem("anything", { answer: "A long explanatory answer with no number in it at all." }).gradable, false);
  const atoms: Atom[] = withLeverage([{ id: "k", title: "K", requires: [], quiz: [{ level: "recall", prompt: "k?", answer: long, key: "helium", accept: ["He"] }] }]);
  const item = buildRun(atoms, () => null, { size: 3, rng: () => 0.5 }).items[0];
  assert.equal(item.key, "helium");
  assert.deepEqual(item.accept, ["He"]);
});

test("every science key has probes, accepts each right answer and rejects each wrong one", () => {
  const dir = join(__dirname, "..", "learning", "app", "corpus");
  const probes = JSON.parse(readFileSync(join(__dirname, "..", "tests", "fixtures", "answer-key-probes.json"), "utf8")) as Record<string, { right: string[]; wrong: string[] }>;
  const seen = new Set<string>();
  for (const deck of ["00-learning-to-learn", "01-mathematics", "02-physics", "03-chemistry", "04-information", "06-cosmology", "07-mind", "biophysics"]) {
    const { atoms } = JSON.parse(readFileSync(join(dir, `${deck}.json`), "utf8")) as { atoms: Atom[] };
    for (const atom of atoms)
      for (const item of atom.quiz ?? []) {
        if (item.key === undefined) continue;
        const id = `${deck}|${atom.id}`;
        const p = probes[id];
        assert.ok(p && item.key.trim().length <= 60, `${id}: no probes or key too long`);
        seen.add(id);
        for (const r of [item.key, ...p.right]) assert.equal(gradeItem(r, item).correct, true, `${id} should accept ${r}`);
        for (const w of p.wrong) assert.equal(gradeItem(w, item).correct, false, `${id} should reject ${w}`);
        for (const x of [...p.right, ...p.wrong]) assert.equal(standalone.gradeItem(x, item).correct, gradeItem(x, item).correct, `${id} standalone differs on ${x}`);
      }
  }
  assert.deepEqual(Object.keys(probes).filter((id) => !seen.has(id)), []);
});

