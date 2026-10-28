import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { formatNumber, parseLocaleNumber, resolveNumber } from "../src/lib/academy/locale-number";
import { gradeQuestion, loadQuestionDeck, parseNumber, type Question } from "../src/lib/academy/question-types";
import { parseNumber as assessParse } from "../src/lib/academy/assess";
import { legacyAssessParse, legacyQuestionParse } from "./academy-legacy-number";

const ROOT = join(__dirname, "..");
const QDIR = join(ROOT, "learning/app/corpus/questions");

const ES = ["es-ES", "es-AR", "es-CL", "es-CO"];

function close(a: number | null, b: number) {
  assert.ok(a != null && Math.abs(a - b) <= Math.abs(b) * 1e-12 + 1e-15, `${a} vs ${b}`);
}

function fuzzCorpus(): string[] {
  let seed = 20261026;
  const rnd = (n: number) => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed % n;
  };
  const parts = ["0", "1", "2", "3", "5", "9", "12", "123", "1234", "00", ",", ",", ".", ".", "-", "+", "e", "e-", "E+", "/", " ", "%", "x10^", "×10^", "'", "−"];
  const out = new Set<string>(["1,00,000", "10,00,000", "1,2,3", "0,5", "3,5", "1,234", "1.234", "12,500", "1,234.5", "1.234,5", "6,022e23", "1'234", "6'3", "1,000/4", ".5", "5.", "-,5", "1,,2", ",", "."]);
  for (let i = 0; i < 40000; i++) {
    let t = "";
    const len = 1 + rnd(7);
    for (let j = 0; j < len; j++) t += parts[rnd(parts.length)];
    out.add(t);
  }
  return Array.from(out);
}

const same = (a: number | null, b: number | null) => (a == null || Number.isNaN(a) ? b == null || Number.isNaN(b) : a === b);

test("English parsing matches the pre-locale parsers on every fuzz input", () => {
  const diffs: string[] = [];
  for (const t of fuzzCorpus()) {
    const legacy = legacyQuestionParse(t);
    for (const locale of [undefined, "en", "en-US"]) if (!same(parseNumber(t, locale), legacy)) diffs.push(`question ${locale} ${JSON.stringify(t)}`);
    const la = legacyAssessParse(t);
    for (const locale of [undefined, "en"]) if (!same(assessParse(t, locale), la)) diffs.push(`assess ${locale} ${JSON.stringify(t)}`);
  }
  assert.deepEqual(diffs.slice(0, 20), []);
  assert.equal(parseNumber("1,00,000"), 100000);
  assert.equal(parseNumber("1,2,3"), 123);
  assert.equal(parseNumber("0,5"), 5);
});

for (const locale of ["es", ...ES]) {
  test(`${locale}: decimal comma and decimal point`, () => {
    close(parseNumber("3,5", locale), 3.5);
    close(parseNumber("0,25", locale), 0.25);
    close(parseNumber("3.5", locale), 3.5);
    close(parseNumber("0.375", locale), 0.375);
    close(parseNumber("0,375", locale), 0.375);
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

  test(`${locale}: negatives, scientific notation, fractions and apostrophes`, () => {
    close(parseNumber("-3,5", locale), -3.5);
    close(parseNumber("−0,25", locale), -0.25);
    close(parseNumber("6,022e23", locale), 6.022e23);
    close(parseNumber("6,022 × 10^23", locale), 6.022e23);
    close(parseNumber("-1,6e-19", locale), -1.6e-19);
    close(parseNumber("1/4", locale), 0.25);
    close(parseNumber("1,5/3", locale), 0.5);
    assert.ok(Number.isNaN(parseNumber("1/0", locale)));
    assert.ok(Number.isNaN(parseNumber("1'234", locale)));
    assert.ok(Number.isNaN(parseNumber("6'3", locale)));
    close(assessParse("3,5", locale), 3.5);
    close(assessParse("1/4", locale), 0.25);
  });
}

test("a lone comma or point before three digits is ambiguous with a hint", () => {
  for (const [input, mark, grouped, decimal, hint] of [
    ["1,234", ",", 1234, 1.234, "Use 1234 or 1.234 to make the decimal mark clear."],
    ["12,500", ",", 12500, 12.5, "Use 12500 or 12.500 to make the decimal mark clear."],
    ["-1,234", ",", -1234, -1.234, "Use 1234 or 1.234 to make the decimal mark clear."],
    ["1.234", ".", 1234, 1.234, "Use 1234 or 1,234 to make the decimal mark clear."],
  ] as const) {
    const r = parseLocaleNumber(input);
    assert.equal(r.status, "ambiguous", input);
    if (r.status !== "ambiguous") return;
    assert.deepEqual([r.mark, r.grouped, r.decimal, r.hint], [mark, grouped, decimal, hint]);
  }
  assert.equal(parseLocaleNumber("0,250").status, "ok");
  assert.equal(parseLocaleNumber("1,234,5").status, "invalid");
  assert.equal(resolveNumber(parseLocaleNumber("12,500"), "es"), null);
  assert.equal(resolveNumber(parseLocaleNumber("1.234"), "es"), null);
  for (const locale of ES) {
    assert.equal(resolveNumber(parseLocaleNumber("1.234"), locale), 1234);
    assert.equal(resolveNumber(parseLocaleNumber("1,234"), locale), 1.234);
  }
});

test("ambiguous input keeps the English reading and asks plain es for a clear mark", () => {
  const q: Question = { id: "c", atom: "a", kind: "calculate", prompt: "?", answer: 1234 };
  assert.ok(gradeQuestion(q, { kind: "calculate", value: "1,234" }).correct);
  assert.ok(gradeQuestion(q, { kind: "calculate", value: "1,234" }, { locale: "en" }).correct);
  for (const [value, hint] of [["1,234", "Use 1234 or 1.234 to make the decimal mark clear."], ["1.234", "Use 1234 or 1,234 to make the decimal mark clear."]]) {
    const es = gradeQuestion(q, { kind: "calculate", value }, { locale: "es" });
    assert.equal(es.correct, false);
    assert.equal(es.hint, hint);
  }
  assert.ok(gradeQuestion(q, { kind: "calculate", value: "1.234" }, { locale: "es-AR" }).correct);
  const dec: Question = { id: "d", atom: "a", kind: "calculate", prompt: "?", answer: 2.5 };
  assert.ok(gradeQuestion(dec, { kind: "calculate", value: "2,5" }, { locale: "es" }).correct);
  assert.equal(gradeQuestion(dec, { kind: "calculate", value: "2,5" }).hint, undefined);
});

test("every calculate key in every deck grades correct with a point, and with a comma in Spanish", () => {
  let n = 0;
  for (const f of readdirSync(QDIR).filter((x) => x.endsWith(".json"))) {
    const deck = loadQuestionDeck(JSON.parse(readFileSync(join(QDIR, f), "utf8")));
    for (const q of deck.questions.filter((x): x is Extract<Question, { kind: "calculate" }> => x.kind === "calculate")) {
      const point = [String(q.answer), formatNumber(q.answer, "en")];
      for (const locale of [undefined, "en"]) for (const value of point) assert.ok(gradeQuestion(q, { kind: "calculate", value }, { locale }).correct, `${f} ${q.id} ${value} ${locale}`);
      const comma = formatNumber(q.answer, "es");
      for (const locale of ES) assert.ok(gradeQuestion(q, { kind: "calculate", value: comma }, { locale }).correct, `${f} ${q.id} ${comma} ${locale}`);
      for (const value of [...point, comma]) {
        const es = gradeQuestion(q, { kind: "calculate", value }, { locale: "es" });
        assert.ok(es.correct || es.hint, `${f} ${q.id} ${value} es`);
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
