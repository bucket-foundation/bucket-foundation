import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join, resolve as resolvePath } from "node:path";
import { cardKey } from "../../../src/lib/research-os/work-quiz/fact";
import { checkLimits, LIMITS } from "../../../src/lib/research-os/work-quiz/limits";
import { buildWordSet, wordFactId, type RawSubset, type Script, type WordCell } from "../../../src/lib/research-os/work-quiz/polingual-forms";
import { sampleQuiz } from "../../../src/lib/research-os/work-quiz/sampler";
import { learnPath, learnWordPath, quizJson, wordBackend, type LearnIo } from "../src/cli/learn";
import { resolve } from "../src/cli/run";
import { findCommand } from "../src/cli/table";
import { directBackend } from "../src/core/backend";
import { LESSON_WORDS, THEMES, WordBook, wordSetFromPack } from "../src/core/words";
import { newDataKey } from "../src/crypto";
import { buildDenylist } from "../src/pack/rights";
import { assembleWords, buildWordPack, cleanEtymology, WORD_PACK_BUDGET_BYTES, wordPackChecksum, WORDS_FILE, type RawWords, type WordPack } from "../src/pack/words";
import { Store } from "../src/store";
import { WordSession, wordRoutes } from "../src/words";
import { WorkQuizStore } from "../src/work-quiz";

const REPO = resolvePath(import.meta.dir, "../../..");
const RAW = JSON.parse(readFileSync(join(REPO, WORDS_FILE), "utf8")) as RawWords;
const DENY = buildDenylist(REPO);
const PACK = buildWordPack(REPO, DENY);
const BOOK = new WordBook(PACK);
const DAY = 86_400_000;
const NOW = Date.UTC(2026, 9, 11);
const CHOSEN = ["de", "ar", "hi"];
const SCRIPTS: [string, "rtl" | "ltr", Script][] = [
  ["ar", "rtl", "arabic"],
  ["he", "rtl", "hebrew"],
  ["fa", "rtl", "arabic"],
  ["zh", "ltr", "han"],
  ["ja", "ltr", "han"],
  ["ko", "ltr", "hangul"],
  ["hi", "ltr", "devanagari"],
  ["ta", "ltr", "tamil"],
  ["th", "ltr", "thai"],
];

const cellRows = (cells: readonly WordCell[]) => cells.map((c) => ({ ...c, senseWords: [...c.senseWords].sort() }));

function session(languages: string[] = CHOSEN, now: () => number = () => NOW) {
  const key = newDataKey();
  const store = new Store(":memory:", key);
  const wq = new WorkQuizStore(store, key);
  wq.setLanguages(languages, NOW);
  return { store, wq, words: new WordSession(BOOK, wq, { now, seed: () => "seed" }) };
}

function io(input: string[] = []): LearnIo & { out: string[] } {
  const out: string[] = [];
  return {
    out,
    print: (l) => out.push(l),
    lines: async function* () {
      for (const l of input) yield l;
    },
  };
}

describe("the word pack", () => {
  test("round trips through its file form with a matching checksum and version", () => {
    const text = JSON.stringify(PACK);
    const back = JSON.parse(text) as WordPack;
    expect(back).toEqual(PACK);
    expect(wordPackChecksum(back)).toBe(PACK.sha256);
    expect(PACK.sha256.startsWith(PACK.version)).toBe(true);
    expect(wordPackChecksum({ ...back, words: back.words.slice(1) })).not.toBe(PACK.sha256);
    expect(Buffer.byteLength(text)).toBeLessThan(WORD_PACK_BUDGET_BYTES);
    expect(buildWordPack(REPO, DENY).sha256).toBe(PACK.sha256);
  });

  test("the word set built from the pack equals the one built from the source rows", () => {
    const fromSource = buildWordSet(RAW as unknown as RawSubset);
    const fromPack = wordSetFromPack(JSON.parse(JSON.stringify(PACK)) as WordPack);
    expect(cellRows(fromPack.cells)).toEqual(cellRows(fromSource.cells));
    expect(fromPack.credit).toBe(fromSource.credit);
    expect(fromPack.conceptPos).toEqual(fromSource.conceptPos);
    for (const l of fromPack.languages) {
      expect(fromPack.scripts[l]).toBe(fromSource.scripts[l]);
      expect(cellRows(fromPack.byLang[l])).toEqual(cellRows(fromSource.byLang[l]));
    }
    expect(PACK.counts).toMatchObject({ rows: RAW.words.length, words: fromSource.cells.length, languages: 27 });
  });

  test("a source without the share-alike licence or with a denied name is refused", () => {
    expect(() => assembleWords({ ...RAW, attribution: { ...RAW.attribution, license: "MIT" } }, DENY)).toThrow("CC-BY-SA");
    expect(() => assembleWords({ ...RAW, attribution: { ...RAW.attribution, data: "A word list" } }, DENY)).toThrow("Wiktionary");
    const at = RAW.words.findIndex((w) => w.l === PACK.words[0].lang && w.c === PACK.words[0].concept && w.s.trim() === PACK.words[0].word);
    const words = RAW.words.map((w, i) => (i === at ? { ...w, e: "From the Kruse family name." } : w));
    expect(() => assembleWords({ ...RAW, words }, DENY)).toThrow("rights:");
  });

  test("etymology drops the tree and the cognate list", () => {
    expect(cleanEtymology("Etymology tree\nProto-Germanic *hūsą\nEnglish house\nFrom Middle English hous.\nCognates\nCognate with Dutch huis.", "English", "house")).toBe("From Middle English hous.");
    expect(cleanEtymology(undefined, "English", "house")).toBe("");
  });

  test("the pack and every lesson payload carry the attribution", () => {
    expect(PACK.attribution.data).toContain("Wiktionary");
    expect(PACK.attribution.license).toContain("CC-BY-SA");
    expect(BOOK.credit.text).toBe("Words, definitions, IPA and etymology from Wiktionary via Kaikki (kaikki.org), CC-BY-SA 3.0. Full entries at en.wiktionary.org.");
    expect(BOOK.credit.licenceHref).toStartWith("https://creativecommons.org/licenses/by-sa/");
  });
});

describe("lesson grouping", () => {
  test("is the same on every build and covers each word of a language once", () => {
    const other = new WordBook(JSON.parse(JSON.stringify(PACK)) as WordPack);
    for (const lang of BOOK.languages()) {
      const lessons = BOOK.lessons(lang);
      expect(other.lessons(lang)).toEqual(lessons);
      const concepts = lessons.flatMap((l) => l.concepts);
      expect([...concepts].sort()).toEqual(BOOK.set.byLang[lang].map((c) => c.concept).sort());
      expect(new Set(concepts).size).toBe(concepts.length);
      expect(lessons.every((l) => l.concepts.length >= 1 && l.concepts.length <= LESSON_WORDS)).toBe(true);
      expect(lessons.map((l) => l.n)).toEqual(lessons.map((_, i) => i + 1));
      expect(BOOK.deck(lang)).toMatchObject({ id: `words-${lang}`, words: concepts.length, lessons: lessons.length });
    }
  });

  test("a themed lesson holds words of one theme", () => {
    const titles = new Set(THEMES.map((t) => t.title));
    for (const l of BOOK.lessons("en")) {
      const theme = THEMES.find((t) => l.title === t.title || l.title.startsWith(`${t.title} `))!;
      expect(titles.has(theme.title)).toBe(true);
      if (theme.id !== "mixed") expect(l.concepts.every((c) => theme.concepts.includes(c))).toBe(true);
    }
    expect(new Set(THEMES.flatMap((t) => t.concepts)).size).toBe(THEMES.flatMap((t) => t.concepts).length);
  });

  test("a lesson word carries its fields and the same concept in the other chosen languages", () => {
    const page = BOOK.lesson("de", 1, CHOSEN)!;
    expect(page.words.length).toBeGreaterThan(0);
    expect(page.words.length).toBeLessThanOrEqual(LESSON_WORDS);
    let sideBySide = 0;
    for (const w of page.words) {
      expect(w.word.length).toBeGreaterThan(0);
      expect(w.meaning.length).toBeGreaterThan(0);
      expect(["noun", "verb", "adjective"]).toContain(w.pos);
      expect(w.href).toStartWith("https://en.wiktionary.org/wiki/");
      for (const o of w.others) {
        expect(["ar", "hi"]).toContain(o.lang);
        expect(o.concept).toBe(w.concept);
        sideBySide++;
      }
    }
    const all = BOOK.lessons("de").flatMap((l) => BOOK.lesson("de", l.n, CHOSEN)!.words);
    expect(all.some((w) => w.others.length > 0) || sideBySide > 0).toBe(true);
    expect(all.some((w) => w.ipa && w.etymology && w.senses.length > 0)).toBe(true);
    expect(BOOK.lesson("de", 999, CHOSEN)).toBeNull();
  });

  test("the by-concept view puts the concepts most of the chosen languages share first", () => {
    const first = BOOK.concepts(CHOSEN, 1);
    expect(first.languages.map((l) => l.code)).toEqual(CHOSEN);
    expect(first.rows.length).toBe(LESSON_WORDS);
    const cover = first.rows.map((r) => r.words.filter(Boolean).length);
    expect(cover).toEqual([...cover].sort((a, b) => b - a));
    expect(cover[0]).toBeGreaterThanOrEqual(2);
    for (const r of first.rows) r.words.forEach((w, i) => w && expect([w.lang, w.concept]).toEqual([CHOSEN[i], r.concept]));
    expect(BOOK.concepts(CHOSEN, 1)).toEqual(first);
    expect(BOOK.concepts([], 1)).toMatchObject({ languages: [], rows: [], concepts: 0, of: 1 });
    expect(BOOK.concepts(CHOSEN, 9999).page).toBe(first.of);
  });

  test("one word per script reads in its direction", () => {
    for (const [lang, dir, script] of SCRIPTS) {
      const cell = BOOK.set.byLang[lang].find((c) => c.script === script)!;
      const view = BOOK.view(cell);
      expect({ lang, dir: view.dir, script: view.script }).toEqual({ lang, dir, script });
      expect(view.word).toBe(cell.word);
    }
    expect(BOOK.set.byLang.ja.some((c) => c.script === "kana")).toBe(true);
  });

  test("a deck is found by code, by name and by its id", () => {
    expect(BOOK.resolveDeck("de")).toBe("de");
    expect(BOOK.resolveDeck("German")).toBe("de");
    expect(BOOK.resolveDeck("words-de")).toBe("de");
    expect(BOOK.resolveDeck("Klingon")).toBeNull();
  });
});

describe("questions on lesson words", () => {
  test("every question passes the limits, offers 3 choices and asks about a lesson word", () => {
    let asked = 0;
    for (const lang of BOOK.languages()) {
      for (const l of BOOK.lessons(lang)) {
        const cells = BOOK.lessonCells(lang, l.n);
        const ids = new Set(cells.map(wordFactId));
        const qs = BOOK.questions(cells, CHOSEN, "seed");
        expect(BOOK.questions(cells, CHOSEN, "seed")).toEqual(qs);
        expect(qs.length).toBeLessThanOrEqual(cells.length);
        for (const q of qs) {
          expect(checkLimits(q)).toEqual([]);
          expect(q.choices!.length).toBe(LIMITS.choices);
          expect(q.choices!.filter((c) => c === q.answer).length).toBe(1);
          expect(q.factIds.some((id) => ids.has(id))).toBe(true);
          expect(q.sources[0].label).toContain("Wiktionary");
          expect(q.word!.credit).toContain("CC-BY-SA");
          if (q.type === "pair") expect(CHOSEN).toContain(q.word!.choicesLang!);
          asked++;
        }
      }
    }
    expect(asked).toBeGreaterThan(PACK.words.length / 2);
    const german = BOOK.lessons("de").flatMap((l) => BOOK.questions(BOOK.lessonCells("de", l.n), CHOSEN, "seed"));
    expect(new Set(german.map((q) => q.type)).size).toBeGreaterThanOrEqual(2);
  });
});

describe("review of studied words", () => {
  test("an answered lesson word gets a card under its card key and comes due", () => {
    const { wq, words, store } = session();
    expect(words.decks().map((d) => [d.lang, d.started, d.due])).toEqual([["de", 0, 0], ["ar", 0, 0], ["hi", 0, 0]]);
    const quiz = words.quiz({ deck: "de", lesson: 1 });
    expect(quiz.credit.text).toContain("Wiktionary");
    expect(quiz.questions.length).toBeGreaterThan(0);
    const q = quiz.questions[0];
    expect(Object.keys(q)).not.toContain("answer");
    const full = BOOK.questions(BOOK.lessonCells("de", 1), CHOSEN, "seed")[0];
    expect(full.id).toBe(q.id);
    const outcome = words.answer(q.id, full.answer, 1000);
    expect(outcome).toMatchObject({ correct: true, answer: full.answer });
    expect(outcome.sources[0].label).toContain("Wiktionary");
    expect(() => words.answer(q.id, full.answer, 1000)).toThrow("no open question");
    const key = cardKey(full.factIds.join("+"), full.form);
    expect(full.cardKey).toBe(key);
    expect(key).toMatch(/^word:de:[a-z]+(\+word:[a-z]{2}:[a-z]+)?\|(meaning|sound|language|pair)$/);
    const row = store.db.query<{ card_key: string; due: number }, []>("select card_key, due from work_quiz_cards").all();
    expect(row.map((r) => r.card_key)).toEqual([key]);
    expect(row[0].due).toBeGreaterThan(NOW);
    expect(wq.dueCards(NOW)).toEqual([]);
    const due = wq.dueCards(NOW + 400 * DAY);
    expect(due.map((d) => d.cardKey)).toEqual([key]);
    const sampled = sampleQuiz({ day: "2027-12-01", sources: { beads: [], prs: [], notes: [], repoUrl: null }, due, now: NOW + 400 * DAY, languages: CHOSEN, words: BOOK.set });
    expect(sampled.reviewed).toBe(1);
    expect(sampled.questions[0].id).toBe(full.id);
    expect(words.decks().find((d) => d.lang === "de")).toMatchObject({ started: 1, due: 0 });
    const later = new WordSession(BOOK, wq, { now: () => NOW + 400 * DAY, seed: () => "seed" });
    expect(later.decks().find((d) => d.lang === "de")).toMatchObject({ started: 1, due: 1 });
    expect(later.lessons("de").lessons[0].started).toBe(1);
    store.close();
  });

  test("a wrong answer also schedules the word, and the daily path still skips a first correct answer", () => {
    const { wq, words, store } = session();
    const quiz = words.quiz({ deck: "ar", lesson: 1 });
    const full = BOOK.questions(BOOK.lessonCells("ar", 1), CHOSEN, "seed");
    const wrong = full[0].choices!.find((c) => c !== full[0].answer)!;
    expect(words.answer(quiz.questions[0].id, wrong, 1000).correct).toBe(false);
    expect(wq.wordCards().length).toBe(1);
    wq.record(full[1], true, 3, 1000, NOW);
    expect(wq.wordCards().length).toBe(1);
    expect(wq.tally()).toEqual({ answered: 2, correct: 1 });
    store.close();
  });

  test("a deck quiz with no lesson number serves due words first, then new ones", () => {
    const { words, store } = session();
    const first = words.quiz({ deck: "German", size: 3 });
    expect(first.questions.length).toBeGreaterThan(0);
    expect(first.questions.length).toBeLessThanOrEqual(3);
    const cells = BOOK.lessons("de").flatMap((l) => BOOK.lessonCells("de", l.n));
    const due = new Set([wordFactId(cells[10])]);
    expect(BOOK.studyCells("de", 2, due, due)[0]).toBe(cells[10]);
    expect(BOOK.studyCells("de", 2, new Set([wordFactId(cells[0])]), new Set())[0]).toBe(cells[1]);
    expect(() => words.quiz({ deck: "Klingon" })).toThrow("unknown language");
    expect(() => words.quiz({ deck: "de", lesson: 999 })).toThrow("no such lesson");
    store.close();
  });
});

describe("word routes", () => {
  const call = async (routes: ReturnType<typeof wordRoutes>, method: string, path: string, body?: unknown) => {
    const url = new URL(`http://127.0.0.1${path}`);
    const r = await routes[`${method} ${url.pathname}`](new Request(url, { method, body: body === undefined ? undefined : JSON.stringify(body), headers: { "content-type": "application/json" } }), url);
    return { status: r.status, body: (await r.json()) as Record<string, any> };
  };

  test("decks, lessons, one lesson, the by-concept page and the quiz all carry the credit", async () => {
    const { words, store } = session();
    const routes = wordRoutes(words);
    const decks = await call(routes, "GET", "/local/words/decks");
    expect(decks.body.decks.map((d: { id: string }) => d.id)).toEqual(["words-de", "words-ar", "words-hi"]);
    expect(decks.body.chosen).toEqual(CHOSEN);
    const lessons = await call(routes, "GET", "/local/words/lessons?deck=ar");
    expect(lessons.body.lessons[0].words.length).toBeGreaterThan(0);
    const lesson = await call(routes, "GET", "/local/words/lesson?deck=ar&n=1");
    expect(lesson.body.words[0].dir).toBe("rtl");
    const concepts = await call(routes, "GET", "/local/words/concepts?page=1");
    expect(concepts.body.rows.length).toBe(LESSON_WORDS);
    const quiz = await call(routes, "GET", "/local/words/quiz?deck=ar&lesson=1");
    const byConcept = await call(routes, "GET", "/local/words/quiz?concepts=1");
    expect(byConcept.body.questions.length).toBeGreaterThan(0);
    for (const r of [decks, lessons, lesson, concepts, quiz, byConcept]) {
      expect(r.status).toBe(200);
      expect(r.body.credit.text).toContain("Wiktionary via Kaikki");
      expect(r.body.credit.text).toContain("CC-BY-SA");
    }
    const q = quiz.body.questions[0];
    const answered = await call(routes, "POST", "/local/words/answer", { id: q.id, response: q.choices[0], elapsedMs: 900 });
    expect(answered.status).toBe(200);
    expect(q.choices).toContain(answered.body.answer);
    expect((await call(routes, "POST", "/local/words/answer", { id: q.id, response: q.choices[0], elapsedMs: 900 })).status).toBe(404);
    expect((await call(routes, "POST", "/local/words/answer", { id: q.id })).status).toBe(400);
    expect((await call(routes, "GET", "/local/words/lesson?deck=xx&n=1")).status).toBe(404);
    expect((await call(routes, "GET", "/local/words/lesson?deck=ar&n=0")).status).toBe(400);
    expect((await call(routes, "GET", "/local/words/lesson?deck=ar&n=999")).status).toBe(404);
    store.close();
  });
});

describe("word lessons in the terminal", () => {
  function backend(languages: string[] = CHOSEN) {
    const s = session(languages);
    return { ...s, b: directBackend({ store: s.store, content: {}, daily: s.wq.daily, record: (...a) => s.wq.record(...a), words: s.words, now: () => NOW, seed: () => "seed" }) };
  }

  test("learn path lists one deck per chosen language with the credit, and one deck's lessons by name", async () => {
    const { b, store } = backend();
    const text = io();
    expect(await learnPath(b, null, [], false, text, BOOK.credit.text)).toBe(0);
    expect(text.out[0]).toContain("German words");
    expect(text.out[0]).toContain("Arabic words");
    expect(text.out[0]).toMatch(/0 of \d+ words started, 0 due, \d+ word lessons/);
    expect(text.out[1]).toBe(BOOK.credit.text);
    const line = io();
    await learnPath(b, null, [], true, line, BOOK.credit.text);
    const body = JSON.parse(line.out[0]);
    expect(body.wordDecks.map((d: { id: string }) => d.id)).toEqual(["words-de", "words-ar", "words-hi"]);
    expect(body.credit).toContain("CC-BY-SA");
    const one = io();
    expect(await learnWordPath(b, "de", BOOK.credit.text, false, one)).toBe(0);
    expect(one.out[0]).toMatch(/^German word lessons: 0 of \d+ words started, 0 due\.$/);
    expect(one.out[1]).toMatch(/^  1\. [A-Z]/);
    expect(one.out.at(-1)).toBe(BOOK.credit.text);
    const none = backend([]);
    const hint = io();
    await expect(learnPath(none.b, null, [], false, hint, BOOK.credit.text)).rejects.toThrow("no decks");
    expect(hint.out.at(-1)).toContain("bkt learn quiz --deck German");
    store.close();
    none.store.close();
  });

  test("learn quiz --deck asks word questions and grades answer lines through the same session", async () => {
    const { b, wq, store } = backend();
    const out = io(['{"choice":0,"elapsedMs":800}', '{"choice":1,"elapsedMs":800}']);
    expect(await quizJson(wordBackend(b, "de"), 4, findCommand("learn quiz")!, out, BOOK.credit.text)).toBe(0);
    const head = JSON.parse(out.out[0]);
    expect(head.credit).toBe(BOOK.credit.text);
    expect(head.questions.length).toBeGreaterThanOrEqual(2);
    expect(head.questions[0].choices.length).toBe(3);
    expect(Object.keys(JSON.parse(out.out[1]))).toEqual(["v", "itemId", "correct", "timedOut", "rating", "answer"]);
    expect(wq.wordCards().length).toBe(2);
    expect(resolve(["learn", "quiz", "--deck", "German", "--json"]).kind).toBe("run");
    store.close();
  });
});
