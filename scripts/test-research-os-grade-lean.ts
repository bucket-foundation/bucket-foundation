import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { FERMI_CLOSE_LOG10, FERMI_LOG10_TOLERANCE, gradeAnswer, isCorrect, log10Distance } from "../src/lib/research-os/work-quiz/grade";

const VECTORS = path.join(__dirname, "..", "lean", "vectors", "fermi-grade.txt");
const EXPECTED_CASES = 10000;
const EPSILON_BAND = 1e-9;

type Case = { want: string; got: string; correct: boolean; close: boolean };

const cases: Case[] = fs
  .readFileSync(VECTORS, "utf8")
  .split("\n")
  .slice(0, -1)
  .map((line) => {
    const [want, got, correct, close] = line.split(" ");
    return { want, got, correct: correct === "1", close: close === "1" };
  });

const question = (answer: string) => ({ answer, choices: null, tolerance: 0, log10Tolerance: FERMI_LOG10_TOLERANCE, limitSec: 60 });
const tsCorrect = (want: string, got: string) => isCorrect(question(want), got);
const tsClose = (want: string, got: string) => gradeAnswer(question(want), got, 0).rating === 4;
const micro = (digits: string) => `${digits}e-6`;

test("the Lean vectors hold 10,000 pairs with zeros, both verdicts and values past 2^53", () => {
  assert.equal(cases.length, EXPECTED_CASES);
  assert.ok(cases.filter((c) => c.correct).length > 3000);
  assert.ok(cases.filter((c) => !c.correct).length > 3000);
  assert.ok(cases.filter((c) => c.correct && !c.close).length > 1000);
  assert.ok(cases.some((c) => c.want === "0" || c.got === "0"));
  assert.ok(cases.some((c) => c.want.length > 280));
  assert.ok(cases.every((c) => Number.isFinite(Number(c.want)) && Number.isFinite(Number(c.got))));
});

test("isCorrect at tolerance 0.5 matches the Lean verdict on every pair, as integers and as millionths", () => {
  for (const c of cases) {
    assert.equal(tsCorrect(c.want, c.got), c.correct, `${c.want} ${c.got}`);
    assert.equal(tsCorrect(micro(c.want), micro(c.got)), c.correct, `${c.want} ${c.got} scaled`);
  }
});

test("the rating of 4 at log distance 0.15 matches the Lean close verdict on every pair", () => {
  for (const c of cases) {
    assert.equal(tsClose(c.want, c.got), c.close, `${c.want} ${c.got}`);
    assert.equal(tsClose(micro(c.want), micro(c.got)), c.close, `${c.want} ${c.got} scaled`);
  }
});

test("the verdict and the distance are symmetric in the two values on every pair", () => {
  for (const c of cases) {
    assert.equal(tsCorrect(c.got, c.want), tsCorrect(c.want, c.got));
    assert.equal(tsClose(c.got, c.want), tsClose(c.want, c.got));
    assert.equal(log10Distance(c.got, c.want), log10Distance(c.want, c.got));
  }
});

test("no vector sits inside the epsilon band around either tolerance", () => {
  for (const c of cases) {
    const d = log10Distance(c.want, c.got);
    if (d === null) continue;
    assert.ok(Math.abs(d - FERMI_LOG10_TOLERANCE) > 2 * EPSILON_BAND, `${c.want} ${c.got}`);
    assert.ok(Math.abs(d - FERMI_CLOSE_LOG10) > 2 * EPSILON_BAND, `${c.want} ${c.got}`);
  }
});

test("the code accepts a pair inside the epsilon band that the specification rejects", () => {
  assert.equal(27379 * 27379 - 10 * 8658 * 8658, 1);
  const d = log10Distance("8658", "27379");
  assert.ok(d !== null && d > FERMI_LOG10_TOLERANCE - EPSILON_BAND && d <= FERMI_LOG10_TOLERANCE + EPSILON_BAND);
  assert.equal(tsCorrect("8658", "27379"), true);
});

test("the code returns no distance and a wrong verdict for values the specification excludes", () => {
  const excluded: Array<[string, string | null]> = [
    ["10", "0"], ["0", "10"], ["10", "-10"], ["-10", "-10"], ["10", null], ["10", "abc"], ["10", ""],
    ["10", "Infinity"], ["Infinity", "Infinity"], ["1e400", "1e400"], ["1e-400", "1e-400"], ["10", "NaN"],
  ];
  for (const [want, got] of excluded) {
    assert.equal(log10Distance(want, got), null, `${want} ${got}`);
    assert.equal(isCorrect(question(want), got), false, `${want} ${got}`);
  }
});

test("the code grades equal values at the double range limits as correct", () => {
  assert.equal(tsCorrect("1e308", "1e308"), true);
  assert.equal(tsCorrect("5e-324", "5e-324"), true);
  assert.equal(tsCorrect("1e308", "3e307"), false);
});
