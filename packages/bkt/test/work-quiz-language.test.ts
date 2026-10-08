import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { seededRng } from "../../../src/lib/research-os/work-quiz/generate";
import { languageMakers, rivals, sharesSense } from "../../../src/lib/research-os/work-quiz/polingual-forms";
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

  test("wrong choices come from the clean pool and never share the answer's sense", () => {
    const set = loadWordSet();
    expect(set.cells.some((c) => c.lang === "zh" && c.word === "門子")).toBe(false);
    expect(set.cells.some((c) => c.lang === "sa" && c.word === "पिङ्ग")).toBe(false);
    expect(set.cells.some((c) => c.lang === "pt" && c.word === "público")).toBe(false);
    for (const a of set.cells) for (const r of rivals(set, a)) {
      expect(set.cells).toContain(r);
      expect(sharesSense(a, r)).toBe(false);
    }
  });

  test("the sampler serves language questions under bun", () => {
    const quiz = sampleQuiz({ day: "2026-10-05", sources: NONE, languages: ["ja", "he"] });
    expect(quiz.questions.length).toBe(5);
    expect(quiz.questions.every((q) => q.sources[0].kind === "word")).toBe(true);
  });
});

import { afterEach, beforeEach } from "bun:test";
import { Database } from "bun:sqlite";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { newDataKey } from "../src/crypto";
import { LOCAL_ONLY_TABLES, MIGRATIONS, SCHEMA_VERSION, Store } from "../src/store";
import { WorkQuizStore, workQuizRoutes } from "../src/work-quiz";
import { LANGUAGE_CODES, LANGUAGE_NAMES } from "../../../src/lib/research-os/work-quiz/languages";

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "bkt-languages-"));
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

const get = (routes: ReturnType<typeof workQuizRoutes>, path: string) => routes[`GET ${path.split("?")[0]}`](new Request("http://x"), new URL(`http://x${path}`));
const post = (routes: ReturnType<typeof workQuizRoutes>, path: string, body: unknown) => routes[`POST ${path}`](new Request("http://x", { method: "POST", body: JSON.stringify(body) }), new URL(`http://x${path}`));

describe("schema 11 languages", () => {
  test("the static language list matches the word set manifest", () => {
    const raw = JSON.parse(readFileSync(subsetPath(join(import.meta.dir, "..")), "utf8")) as { manifest: { languages: string[]; language_names: Record<string, string> } };
    expect([...LANGUAGE_CODES].sort()).toEqual([...raw.manifest.languages].sort());
    expect(LANGUAGE_NAMES).toEqual(raw.manifest.language_names);
  });

  test("a v10 database migrates to 11 with an empty local languages table", () => {
    const path = join(dir, "bkt.db");
    const db = new Database(path, { create: true, strict: true });
    for (const m of MIGRATIONS.slice(0, 11)) {
      if (typeof m === "string") db.run(m);
      else m(db);
    }
    db.run("pragma user_version = 11");
    db.run("insert into work_quiz_coverage (cell, fact_id, picks, misses, last_day) values ('c', 'f', 1, 0, '2026-10-01')");
    db.close();
    const key = newDataKey();
    const s = new Store(path, key);
    expect(SCHEMA_VERSION).toBe(13);
    expect(s.db.query<{ user_version: number }, []>("pragma user_version").get()!.user_version).toBe(SCHEMA_VERSION);
    expect(s.db.query("select cell from work_quiz_coverage").all()).toEqual([{ cell: "c" }]);
    expect(LOCAL_ONLY_TABLES).toContain("work_quiz_languages");
    const wq = new WorkQuizStore(s, key);
    expect(wq.languages()).toEqual([]);
    expect(() => s.db.run("insert into work_quiz_languages (code, added_at) values ('toolong', 1)")).toThrow();
    s.close();
  });

  test("languages are saved per person, replaced on each save and cleared with forget", async () => {
    const key = newDataKey();
    const s = new Store(join(dir, "bkt.db"), key);
    const wq = new WorkQuizStore(s, key);
    const routes = workQuizRoutes(wq, { now: () => 1, log: () => {} });
    expect(((await (await get(routes, "/local/work-quiz/languages")).json()) as { languages: string[]; available: { code: string }[] }).available.length).toBe(27);
    let res = await post(routes, "/local/work-quiz/languages", { languages: ["ja", "he", "ja"] });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ languages: ["ja", "he"] });
    res = await post(routes, "/local/work-quiz/languages", { languages: ["xx"] });
    expect(res.status).toBe(400);
    res = await post(routes, "/local/work-quiz/languages", { languages: "ja" });
    expect(res.status).toBe(400);
    expect(wq.languages()).toEqual(["ja", "he"]);
    wq.setLanguages(["ar"], 2);
    expect(wq.languages()).toEqual(["ar"]);
    const status = (await (await get(routes, "/local/work-quiz/status")).json()) as { languages: string[]; ready: boolean };
    expect(status.languages).toEqual(["ar"]);
    expect(status.ready).toBe(true);
    await post(routes, "/local/work-quiz/forget", {});
    expect(wq.languages()).toEqual([]);
    expect(((await (await get(routes, "/local/work-quiz/status")).json()) as { ready: boolean }).ready).toBe(false);
    s.close();
  });

  test("with languages and no work sources, /next and the daily quiz serve word questions with their word metadata", async () => {
    const key = newDataKey();
    const s = new Store(join(dir, "bkt.db"), key);
    const wq = new WorkQuizStore(s, key);
    const at = Date.parse("2026-10-05T15:00:00");
    const routes = workQuizRoutes(wq, { now: () => at, log: () => {} });
    expect((await get(routes, "/local/work-quiz/next")).status).toBe(404);
    wq.setLanguages(["he", "de"], at);
    const q = (await (await get(routes, "/local/work-quiz/next")).json()) as { id: string; type: string; word?: { credit: string; href: string | null } };
    expect(LANGUAGE_QUIZ_TYPES).toContain(q.type as (typeof LANGUAGE_QUIZ_TYPES)[number]);
    expect(q.word!.credit).toContain("Wiktionary");
    expect(q.word!.href).toBe("https://en.wiktionary.org");
    const day = new Date(at).toLocaleDateString("en-CA");
    const daily = (await (await get(routes, `/local/work-quiz/daily?day=${day}`)).json()) as { questions: { type: string; word?: { credit: string } }[] };
    expect(daily.questions.length).toBeGreaterThan(0);
    expect(daily.questions.every((x) => x.word?.credit.includes("Wiktionary"))).toBe(true);
    const stored = wq.daily.get(day)!.questions[0];
    expect(stored.word?.lang === null || LANGUAGE_CODES.includes(stored.word!.lang!)).toBe(true);
    s.close();
  });

  test("the daily parser keeps a well-formed word block and refuses a bad one", () => {
    const base = { id: "w1", type: "meaning", prompt: "Which German word means \"tooth\"?", choices: ["Zahn", "Hand", "Fuß"], answer: "Zahn", limitSec: 20, sources: [{ kind: "word", ref: "de:tooth", label: "Wiktionary via Kaikki (kaikki.org), CC-BY-SA 3.0", href: "https://en.wiktionary.org/wiki/Zahn" }] };
    const ok = parseDailyQuiz({ day: "2026-10-05", questions: [{ ...base, word: { lang: null, choicesLang: "de", credit: "Wiktionary, CC-BY-SA 3.0", href: "https://en.wiktionary.org" } }] }).questions[0];
    expect(ok.word).toEqual({ lang: null, choicesLang: "de", credit: "Wiktionary, CC-BY-SA 3.0", href: "https://en.wiktionary.org" });
    expect(parseDailyQuiz({ day: "2026-10-05", questions: [base] }).questions[0].word).toBeUndefined();
    expect(() => parseDailyQuiz({ day: "2026-10-05", questions: [{ ...base, word: { lang: "xx", choicesLang: null, credit: "c", href: null } }] })).toThrow(DailyQuizError);
    expect(() => parseDailyQuiz({ day: "2026-10-05", questions: [{ ...base, word: { lang: null, choicesLang: null, credit: "c", href: "http://x" } }] })).toThrow(DailyQuizError);
  });
});
