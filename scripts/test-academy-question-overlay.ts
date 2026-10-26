import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { loadQuestionDeck, type QuestionDeck } from "../src/lib/academy/question-types";
import { checkOverlay, localizeDeck, type QuestionOverlay } from "../src/lib/academy/question-overlay";

const ROOT = join(__dirname, "..");
const QDIR = join(ROOT, "learning/app/corpus/questions");
const english = (branch: string): QuestionDeck => loadQuestionDeck(JSON.parse(readFileSync(join(QDIR, `${branch}.json`), "utf8")));
const locales = readdirSync(QDIR, { withFileTypes: true }).filter((d) => d.isDirectory() && d.name !== "reviews").map((d) => d.name);
const physics = english("02-physics");
const REVIEW = { reviewed_by: "reviewer", reviewed_at: "2026-10-26" };

function overlay(questions: QuestionOverlay["questions"]): QuestionOverlay {
  return { locale: "es", branch: "02-physics", questions };
}

for (const locale of locales) {
  for (const f of readdirSync(join(QDIR, locale)).filter((x) => x.endsWith(".json"))) {
    test(`${locale}/${f}: overlay aligns with the English deck`, () => {
      const branch = f.replace(/\.json$/, "");
      assert.ok(existsSync(join(QDIR, f)), `${locale}/${f}: no English deck`);
      const raw = JSON.parse(readFileSync(join(QDIR, locale, f), "utf8"));
      assert.equal(raw.locale, locale);
      assert.deepEqual(checkOverlay(english(branch), raw), []);
    });
  }
}

test("the es fixture holds two reviewed physics questions", () => {
  const raw = JSON.parse(readFileSync(join(QDIR, "es/02-physics.json"), "utf8")) as QuestionOverlay;
  assert.equal(Object.keys(raw.questions).length, 2);
  const { deck, fallbacks } = localizeDeck(physics, raw, "es");
  const pick = deck.questions.find((q) => q.id === "kinematics.pick")!;
  assert.match(pick.prompt, /^Un auto/);
  assert.equal(pick.kind === "pick" && pick.answer, 2);
  assert.ok(!fallbacks.some((x) => x.id === "kinematics.pick" || x.id === "kinematics.order"));
  assert.ok(fallbacks.some((x) => x.id === "kinematics.calculate" && x.reason === "missing"));
});

test("reviewed text shows and unreviewed text falls back to English", () => {
  const en = physics.questions.find((q) => q.id === "kinematics.order")!;
  const steps = ["Anota v0, a y t", "Usa v = v0 + a t", "Usa x = v0 t + (1/2) a t^2", "Comprueba m/s y m"];
  const shown = localizeDeck(physics, overlay({ "kinematics.order": { prompt: "Ordena los pasos.", steps, review: REVIEW } }), "es");
  assert.equal(shown.deck.questions.find((q) => q.id === en.id)!.prompt, "Ordena los pasos.");
  const hidden = localizeDeck(physics, overlay({ "kinematics.order": { prompt: "Ordena los pasos.", steps } }), "es");
  assert.equal(hidden.deck.questions.find((q) => q.id === en.id)!.prompt, en.prompt);
  assert.ok(hidden.fallbacks.some((x) => x.id === en.id && x.field === "prompt" && x.reason === "unreviewed"));
  const half = localizeDeck(physics, overlay({ "kinematics.order": { prompt: "Ordena los pasos.", review: REVIEW } }), "es");
  const q = half.deck.questions.find((x) => x.id === en.id)!;
  assert.equal(q.prompt, "Ordena los pasos.");
  assert.deepEqual(q.kind === "order" && q.steps, en.kind === "order" && en.steps);
  assert.equal(localizeDeck(physics, overlay({ "kinematics.order": { prompt: "x", review: REVIEW } }), "en").deck, physics);
});

test("a broken overlay fails each alignment check", () => {
  const cases: [QuestionOverlay["questions"], RegExp][] = [
    [{ "kinematics.nope": { prompt: "x" } }, /no English question with this id/],
    [{ "kinematics.pick": { options: ["a", "b", "c"] } }, /options count 3 differs from English 4/],
    [{ "kinematics.order": { steps: ["a", "b"] } }, /steps count 2 differs from English 4/],
    [{ "kinematics.match": { pairs: [{ term: "Posición", meaning: "Metros" }] } }, /pairs count 1 differs from English 4/],
    [{ "kinematics.pick": { prompt: "Un auto mantiene 30 m/s en una curva." } }, /numerals \[20\] in English, \[30\] in translation/],
    [{ "kinematics.spot-error": { fix: "Desde el reposo la distancia crece como t al cuadrado." } }, /math spans missing from translation: t\^2/],
    [{ "kinematics.pick": { answer: 1 } as never }, /field answer is outside the allowed set/],
    [{ "kinematics.pick": { prompt: "x", review: { reviewed_by: "", reviewed_at: "ayer" } } }, /review needs reviewed_by/],
  ];
  for (const [questions, re] of cases) {
    const errs = checkOverlay(physics, overlay(questions));
    assert.ok(errs.some((e) => re.test(e)), `${re}: ${errs.join("; ")}`);
  }
  assert.match(checkOverlay(physics, { ...overlay({}), branch: "03-chemistry" })[0], /branch 03-chemistry differs/);
  const unaligned = localizeDeck(physics, overlay({ "kinematics.pick": { options: ["a"], review: REVIEW } }), "es");
  assert.ok(unaligned.fallbacks.some((x) => x.id === "kinematics.pick" && x.field === "options" && x.reason === "unaligned"));
});

test("the es glossary keeps its documented shape", () => {
  const g = JSON.parse(readFileSync(join(ROOT, "learning/app/corpus/glossary/es.json"), "utf8"));
  assert.equal(g.locale, "es");
  assert.ok(g.shape && Object.keys(g.terms).length > 0);
  for (const [term, e] of Object.entries(g.terms as Record<string, { es: string; polingual: unknown; note?: string }>)) {
    assert.equal(term, term.toLowerCase());
    assert.ok(typeof e.es === "string" && e.es.trim(), term);
    assert.ok(e.polingual === null || typeof e.polingual === "string", term);
    for (const k of Object.keys(e)) assert.ok(["es", "polingual", "note"].includes(k), `${term}: ${k}`);
  }
});
