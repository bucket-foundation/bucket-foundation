import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { assembleTest, buildLexicon, marks, mulberry32, PSEUDOWORDS, pseudoword, REAL_WORDS, scoreTest, syllabify, testDue, yesNoKnown } from "../src/lib/academy/yes-no-test";

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
