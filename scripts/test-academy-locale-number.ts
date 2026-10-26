import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { formatNumber, parseLocaleNumber, resolveNumber } from "../src/lib/academy/locale-number";
import { gradeQuestion, loadQuestionDeck, parseNumber, type Question } from "../src/lib/academy/question-types";
import { parseNumber as assessParse } from "../src/lib/academy/assess";

const ROOT = join(__dirname, "..");
const QDIR = join(ROOT, "learning/app/corpus/questions");
const LOCALES = ["en", "es"];

function close(a: number | null, b: number) {
  assert.ok(a != null && Math.abs(a - b) <= Math.abs(b) * 1e-12 + 1e-15, `${a} vs ${b}`);
}

for (const locale of LOCALES) {
  test(`${locale}: decimal comma and decimal point`, () => {
    close(parseNumber("3,5", locale), 3.5);
    close(parseNumber("0,25", locale), 0.25);
    close(parseNumber("3.5", locale), 3.5);
    close(parseNumber(",5", locale), 0.5);
    close(parseNumber("1,2345", locale), 1.2345);
  });

  test(`${locale}: both grouping styles`, () => {
    close(parseNumber("1.234,5", locale), 1234.5);
    close(parseNumber("1,234.5", locale), 1234.5);
    close(parseNumber("1.234.567", locale), 1234567);
    close(parseNumber("1,234,567", locale), 1234567);
    close(parseNumber("1 234,5", locale), 1234.5);
    assert.ok(Number.isNaN(parseNumber("1,23.4", locale)));
    assert.ok(Number.isNaN(parseNumber("12.34,5", locale)));
  });

  test(`${locale}: negatives, scientific notation and fractions`, () => {
    close(parseNumber("-3,5", locale), -3.5);
    close(parseNumber("−0,25", locale), -0.25);
    close(parseNumber("6,022e23", locale), 6.022e23);
    close(parseNumber("6,022 × 10^23", locale), 6.022e23);
    close(parseNumber("-1,6e-19", locale), -1.6e-19);
    close(parseNumber("1/4", locale), 0.25);
    close(parseNumber("1,5/3", locale), 0.5);
    assert.ok(Number.isNaN(parseNumber("1/0", locale)));
    close(assessParse("3,5", locale), 3.5);
    close(assessParse("1/4", locale), 0.25);
  });
}

test("a lone comma before three digits is ambiguous with a hint", () => {
  for (const [input, grouped, decimal] of [["1,234", 1234, 1.234], ["12,500", 12500, 12.5], ["-1,234", -1234, -1.234]] as const) {
    const r = parseLocaleNumber(input);
    assert.equal(r.status, "ambiguous");
    if (r.status !== "ambiguous") return;
    assert.equal(r.grouped, grouped);
    assert.equal(r.decimal, decimal);
  }
  const r = parseLocaleNumber("1,234");
  assert.equal(r.status === "ambiguous" && r.hint, "Use 1234 or 1.234 to make the decimal mark clear.");
  assert.equal(parseLocaleNumber("0,250").status, "ok");
  assert.equal(parseLocaleNumber("1,234,5").status, "invalid");
});

test("ambiguous input keeps the English grouping reading and asks other locales for a clear mark", () => {
  const q: Question = { id: "c", atom: "a", kind: "calculate", prompt: "?", answer: 1234 };
  assert.ok(gradeQuestion(q, { kind: "calculate", value: "1,234" }).correct);
  assert.ok(gradeQuestion(q, { kind: "calculate", value: "1,234" }, { locale: "en" }).correct);
  const es = gradeQuestion(q, { kind: "calculate", value: "1,234" }, { locale: "es" });
  assert.equal(es.correct, false);
  assert.equal(es.hint, "Use 1234 or 1.234 to make the decimal mark clear.");
  assert.equal(resolveNumber(parseLocaleNumber("12,500"), "es"), null);
  const dec: Question = { id: "d", atom: "a", kind: "calculate", prompt: "?", answer: 2.5 };
  assert.ok(gradeQuestion(dec, { kind: "calculate", value: "2,5" }, { locale: "es" }).correct);
  assert.equal(gradeQuestion(dec, { kind: "calculate", value: "2,5" }).hint, undefined);
});

test("every calculate key in every deck grades correct with a decimal point", () => {
  let n = 0;
  for (const f of readdirSync(QDIR).filter((x) => x.endsWith(".json"))) {
    const deck = loadQuestionDeck(JSON.parse(readFileSync(join(QDIR, f), "utf8")));
    for (const q of deck.questions.filter((x): x is Extract<Question, { kind: "calculate" }> => x.kind === "calculate")) {
      for (const locale of [undefined, ...LOCALES]) {
        for (const value of [String(q.answer), formatNumber(q.answer, "en")]) {
          assert.ok(gradeQuestion(q, { kind: "calculate", value }, { locale }).correct, `${f} ${q.id} ${value} ${locale}`);
        }
      }
      n++;
    }
  }
  assert.ok(n > 0);
});

test("formatNumber renders the locale decimal mark", () => {
  assert.equal(formatNumber(3.5, "en"), "3.5");
  assert.equal(formatNumber(3.5, "es"), "3,5");
  assert.equal(formatNumber(1234.5, "es"), "1234,5");
});
