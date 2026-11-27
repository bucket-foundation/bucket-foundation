import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { assembleTest, buildLexicon, formBalance, FORM_TOLERANCE, parseYesNoForms, RANK_BANDS, marks, mulberry32, PSEUDOWORDS, pseudoword, REAL_WORDS, scoreTest, syllabify, testDue, yesNoKnown } from "../src/lib/academy/yes-no-test";

const v = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "src/lib/academy/yes-no-vectors.json"), "utf8"));
const lex = buildLexicon(v.words);

test("the generator, syllables, forms and scores match the golden vectors", () => {
  const r = mulberry32(42);
  for (const x of v.rand) assert.equal(r(), x);
  for (const s of v.syllables) assert.deepEqual(syllabify(s.word), s.syllables, s.word);
  const pr = mulberry32(7);
  for (const p of v.pseudo) assert.equal(pseudoword(p.word, lex, pr), p.out, p.word);
  const lexR = buildLexicon(v.words, v.reject);
  const pr2 = mulberry32(7);
  for (const p of v.pseudoReject) assert.equal(pseudoword(p.word, lexR, pr2), p.out, p.word);
  const a = assembleTest(v.candidates, new Set(), 1001, lex);
  assert.deepEqual(a, v.formA);
  assert.deepEqual(assembleTest(v.candidates, new Set(), 1002, lex, new Set(a!.map((i) => i.word))), v.formB);
  assert.deepEqual(scoreTest(v.formA, new Set(v.yes)), v.score);
  for (const k of v.known) assert.equal(yesNoKnown(k.args[0], k.args[1], k.args[2], k.args[3]), k.known);
  for (const d of v.due) assert.equal(testDue(d.enrolledAt, d.now, d.taken), d.due);
});

test("a form has 50 real words, 20 pseudowords, and two forms share no word", () => {
  const a = v.formA as { word: string; real: boolean }[];
  const b = v.formB as { word: string; real: boolean }[];
  assert.equal(a.filter((i) => i.real).length, REAL_WORDS);
  assert.equal(a.filter((i) => !i.real).length, PSEUDOWORDS);
  assert.equal(new Set(a.map((i) => i.word)).size, a.length);
  const inA = new Set(a.map((i) => i.word));
  assert.ok(b.every((i) => !inA.has(i.word)));
});

test("pseudowords are not lexicon words, keep the reference length within one, and keep its accent count", () => {
  for (const p of v.pseudo) {
    if (!p.out) continue;
    assert.ok(!lex.words.has(p.out));
    assert.ok(Math.abs(Array.from(p.out).length - Array.from(p.word).length) <= 1);
    assert.equal(marks(p.out), marks(p.word));
  }
});

test("non-Latin words and words with no vowel are refused", () => {
  assert.equal(syllabify("学生"), null);
  assert.equal(syllabify("brr"), null);
  assert.equal(pseudoword("学生", lex, mulberry32(1)), null);
});

test("a pool too small for a band returns no form", () => {
  assert.equal(assembleTest(v.candidates.slice(0, 100), new Set(), 1, lex), null);
});

const SHIPPED = path.join(__dirname, "..", "learning/app/polingual/yesno");

test("every shipped language has two balanced, disjoint forms with no pseudoword in another form or language", () => {
  const files = fs.readdirSync(SHIPPED).filter((f) => f.endsWith(".json"));
  assert.deepEqual(files.sort(), ["de.json", "es.json", "fr.json", "it.json", "nl.json", "pt.json"]);
  const reals = new Set<string>();
  const all = files.map((f) => JSON.parse(fs.readFileSync(path.join(SHIPPED, f), "utf8")));
  for (const d of all) for (const i of [...d.forms.A, ...d.forms.B]) if (i.real) reals.add(i.word);
  for (const d of all) {
    const forms = parseYesNoForms(d);
    assert.ok(forms, d.lang);
    const b = formBalance(forms!.A, forms!.B, (w) => d.ranks[w] ?? null);
    assert.ok(b.realLength <= FORM_TOLERANCE.realLength && b.logRank <= FORM_TOLERANCE.logRank && b.pseudoLength <= FORM_TOLERANCE.pseudoLength, `${d.lang} ${JSON.stringify(b)}`);
    const inA = new Set(forms!.A.map((i) => i.word));
    assert.ok(forms!.B.every((i) => !inA.has(i.word)), d.lang);
    for (const i of [...forms!.A, ...forms!.B]) if (!i.real) assert.ok(!reals.has(i.word), `${d.lang} ${i.word}`);
    assert.equal(fs.readFileSync(path.join(__dirname, "..", "apple/Shared/Corpus/yesno", `${d.lang}.json`), "utf8"), fs.readFileSync(path.join(SHIPPED, `${d.lang}.json`), "utf8"));
  }
});

test("the score weights each band by its rank width", () => {
  const items = v.formA as { word: string; real: boolean; band: number | null }[];
  const yesSet = new Set<string>(v.yes);
  const fa = items.filter((i) => !i.real && yesSet.has(i.word)).length;
  const want = RANK_BANDS.reduce((s, [lo, hi], b) => s + yesNoKnown(v.scoreBands[b].hits, v.scoreBands[b].words, fa, 20, hi - lo + 1), 0);
  assert.ok(Math.abs(scoreTest(items, yesSet).known - want) < 1e-9);
});
