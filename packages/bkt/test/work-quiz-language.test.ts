import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { seededRng } from "../../../src/lib/research-os/work-quiz/generate";
import { languageMakers } from "../../../src/lib/research-os/work-quiz/polingual-forms";
import { loadWordSet, subsetPath } from "../../../src/lib/research-os/work-quiz/polingual-server";
import { sampleQuiz } from "../../../src/lib/research-os/work-quiz/sampler";
import { LANGUAGE_FORMS } from "../../../src/lib/research-os/work-quiz/space";
import { LANGUAGE_QUIZ_TYPES, SOURCE_KINDS } from "../../../src/lib/research-os/work-quiz/types";
import { DailyQuizError, KINDS, parseDailyQuiz } from "../src/daily-quiz";

const NONE = { beads: [], prs: [], notes: [], repoUrl: null };

describe("language questions in the desktop engine", () => {
  test("the word set loads under bun from the package folder", () => {
    expect(subsetPath(join(import.meta.dir, ".."))).toEndWith("learning/app/polingual/subset.json");
    expect(loadWordSet().languages.length).toBe(27);
  });

  test("the daily quiz parser takes every language type and the word source kind", () => {
    expect([...KINDS]).toEqual([...SOURCE_KINDS]);
    expect(KINDS).toContain("word");
    const makers = languageMakers(loadWordSet(), ["th", "ar", "de"]);
    for (const form of LANGUAGE_FORMS) {
      expect(LANGUAGE_QUIZ_TYPES).toContain(form);
      const q = makers[form]!(NONE, seededRng(`bun-${form}`), 3)!;
      const stored = JSON.parse(JSON.stringify({ id: q.id, type: q.type, prompt: q.prompt, lines: q.lines, choices: q.choices, answer: q.answer, limitSec: q.limitSec, explain: q.explain, sources: q.sources }));
      const back = parseDailyQuiz({ day: "2026-10-05", questions: [stored] }).questions[0];
      expect(back).toEqual({ ...stored, tolerance: 0 });
      expect(back.sources[0].label).toContain("Wiktionary");
    }
    expect(() => parseDailyQuiz({ day: "2026-10-05", questions: [{ id: "x", type: "meaning", prompt: "Which word?", choices: ["a", "b"], answer: "a", limitSec: 20, sources: [{ kind: "lexeme", ref: "a", label: "b" }] }] })).toThrow(DailyQuizError);
  });

  test("the sampler serves language questions under bun", () => {
    const quiz = sampleQuiz({ day: "2026-10-05", sources: NONE, languages: ["ja", "he"] });
    expect(quiz.questions.length).toBe(5);
    expect(quiz.questions.every((q) => q.sources[0].kind === "word")).toBe(true);
  });
});
