import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join, resolve as resolvePath } from "node:path";
import { cardKey } from "../../../src/lib/research-os/work-quiz/fact";
import { checkLimits, countTokens, LIMITS } from "../../../src/lib/research-os/work-quiz/limits";
import { buildWordSet, conceptPos, rejection, rivalOrder, rivals, WRONG_PAIRS, type RawSubset, type Script, type WordCell } from "../../../src/lib/research-os/work-quiz/polingual-forms";
import { sampleQuiz } from "../../../src/lib/research-os/work-quiz/sampler";
import { learnPath, learnWordPath, quizJson, wordBackend, type LearnIo } from "../src/cli/learn";
import { resolve } from "../src/cli/run";
import { findCommand } from "../src/cli/table";
import { directBackend } from "../src/core/backend";
import { LESSON_WORDS, THEMES, WordBook, wordSetFromPack } from "../src/core/words";
import { newDataKey } from "../src/crypto";
import { buildDenylist } from "../src/pack/rights";
import { assembleWords, buildWordPack, cleanEtymology, FORM_OF, formOf, LICENCE_FILE, SEVERAL_WORDS, shortMeaning, WORD_PACK_BUDGET_BYTES, wordPackChecksum, WORDS_FILE, type RawWords, type WordPack } from "../src/pack/words";
import { seededRng } from "../../../src/lib/research-os/work-quiz/generate";
import { daily, wordCreditLine } from "../src/cli/learn";
import { DailyQuizStore } from "../src/daily-quiz";
import { Store } from "../src/store";
import { WordSession, wordRoutes } from "../src/words";
import { WorkQuizStore } from "../src/work-quiz";

const REPO = resolvePath(import.meta.dir, "../../..");
const RAW = JSON.parse(readFileSync(join(REPO, WORDS_FILE), "utf8")) as RawWords;
const LICENCE = readFileSync(join(REPO, LICENCE_FILE), "utf8");
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
    expect(WORD_PACK_BUDGET_BYTES).toBe(4 * 1024 * 1024);
    expect(Buffer.byteLength(text)).toBeGreaterThan(WORD_PACK_BUDGET_BYTES / 2);
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
    expect(PACK.counts).toMatchObject({ rows: RAW.words.length, checked: fromSource.cells.length, words: PACK.words.length, languages: 27 });
    expect(PACK.words.filter((w) => w.cell).length).toBe(fromSource.cells.length);
  });

  test("a source without the share-alike licence or with a denied name is refused", () => {
    expect(() => assembleWords({ ...RAW, attribution: { ...RAW.attribution, license: "MIT" } }, DENY, LICENCE)).toThrow("CC-BY-SA");
    expect(() => assembleWords({ ...RAW, attribution: { ...RAW.attribution, data: "A word list" } }, DENY, LICENCE)).toThrow("Wiktionary");
    expect(() => assembleWords(RAW, DENY, "Attribution-ShareAlike 3.0 Unported")).toThrow("full Attribution-ShareAlike 3.0 Unported licence text");
    const words = RAW.words.map((w, i) => (i === 0 ? { ...w, e: "From the Kruse family name." } : w));
    expect(() => assembleWords({ ...RAW, words }, DENY, LICENCE)).toThrow("rights:");
  });

  test("etymology drops the tree and the cognate list", () => {
    expect(cleanEtymology("Etymology tree\nProto-Germanic *hūsą\nEnglish house\nFrom Middle English hous.\nCognates\nCognate with Dutch huis.", "English", "house")).toBe("From Middle English hous.");
    expect(cleanEtymology(undefined, "English", "house")).toBe("");
  });

  test("the pack and every lesson payload carry the attribution", () => {
    expect(PACK.attribution.data).toContain("Wiktionary");
    expect(PACK.attribution.license).toContain("CC-BY-SA");
    expect(BOOK.credit.text).toBe("Words, definitions, IPA and etymology from Wiktionary via Kaikki (kaikki.org), CC-BY-SA 3.0, shortened and filtered by Bucket. Full entries at en.wiktionary.org.");
    expect(BOOK.credit.licenceHref).toStartWith("https://creativecommons.org/licenses/by-sa/");
  });
});

describe("the licence and the changes", () => {
  test("the pack ships the full licence text and a note of what Bucket changed", () => {
    expect(PACK.licenceText).toBe(LICENCE);
    expect(PACK.licenceText).toContain("Attribution-ShareAlike 3.0 Unported");
    expect(PACK.licenceText).toContain("You may Distribute or Publicly Perform an Adaptation only under the");
    expect(PACK.changes).toStartWith("Changes made by Bucket:");
    expect(PACK.changes).toContain("under the same licence");
    expect(BOOK.licence).toMatchObject({ title: "Creative Commons CC-BY-SA 3.0", text: LICENCE, changes: PACK.changes });
    const notice = readFileSync(join(REPO, "packages/bkt/NOTICE"), "utf8");
    expect(notice).toContain("Wiktionary");
    expect(notice).toContain("Changes made by Bucket");
    expect(notice).toContain("licences/CC-BY-SA-3.0.txt");
    expect(findCommand("licences")!.summary).toContain("licence text");
  });

  test("bkt licences prints the credit, the changes and the licence text", () => {
    const r = Bun.spawnSync([process.execPath, join(REPO, "packages/bkt/src/cli.tsx"), "licences"], { env: { PATH: process.env.PATH ?? "", HOME: "/nonexistent", BKT_HOME: "/nonexistent/bkt" } });
    const out = r.stdout.toString();
    expect(r.exitCode).toBe(0);
    expect(out.split("\n")[0]).toBe(BOOK.credit.text);
    expect(out).toContain("Changes made by Bucket:");
    expect(out).toContain("8. Miscellaneous");
    const help = Bun.spawnSync([process.execPath, join(REPO, "packages/bkt/src/cli.tsx"), "help"], { env: { PATH: process.env.PATH ?? "", HOME: "/nonexistent", BKT_HOME: "/nonexistent/bkt" } });
    expect(help.stdout.toString()).toMatch(/licences\s+print the credit, the changes and the licence text/);
  });

  test("bkt daily prints the credit when a question shows a word, in text and for scripts", async () => {
    const { store, wq } = session();
    const day = "2026-10-11";
    const word = BOOK.questions(BOOK.lessonCells("de", 1), CHOSEN, "seed")[0];
    const plain = { id: "plain", type: "recall" as const, prompt: "Which branch takes merges?", lines: [], choices: ["dev", "main", "ops"], answer: "dev", tolerance: 0, limitSec: 30, explain: "dev takes merges.", sources: [{ kind: "note" as const, ref: "a#b", label: "notes" }] };
    const store2 = new DailyQuizStore(store, (wq as unknown as { key: Buffer }).key);
    store2.put({ day, questions: [word, plain, { ...plain, id: "plain-2" }] }, NOW);
    const b = directBackend({ store, content: {}, daily: store2, record: (...a) => wq.record(...a), now: () => NOW, seed: () => "seed" });
    const text = io();
    expect(await daily(b, day, false, findCommand("daily")!, text)).toBe(0);
    expect(text.out.at(-2)).toBe("Word questions use Wiktionary via Kaikki (kaikki.org), CC-BY-SA 3.0, shortened and filtered by Bucket. Run bkt licences for the terms.");
    const line = io([JSON.stringify({ response: word.answer, elapsedMs: 900 }), JSON.stringify({ response: "dev", elapsedMs: 900 })]);
    await daily(b, day, true, findCommand("daily")!, line);
    expect(JSON.parse(line.out[0]).credit).toContain("CC-BY-SA 3.0");
    expect(JSON.parse(line.out[1]).credit).toContain("CC-BY-SA 3.0");
    expect(JSON.parse(line.out[2]).credit).toBeUndefined();
    store2.put({ day: "2026-10-12", questions: [plain, { ...plain, id: "plain-2" }, { ...plain, id: "plain-3" }] }, NOW);
    const none = io();
    await daily(b, "2026-10-12", false, findCommand("daily")!, none);
    expect(none.out.join("\n")).not.toContain("Wiktionary");
    expect(wordCreditLine([{ word: null }, {}])).toBeUndefined();
    store.close();
  });
});

describe("which words ship", () => {
  test("lessons hold every row with a word and a meaning, less the entries that only point to another word", () => {
    const c = PACK.counts;
    const dropped = Object.values(c.dropped).reduce((a, b) => a + b, 0);
    expect(c.words + dropped).toBe(c.rows);
    expect(c.words).toBe(PACK.words.length);
    expect(c.words).toBeGreaterThan(6400);
    expect(c.dropped[FORM_OF]).toBeGreaterThan(10);
    expect(c.quiz + c.lessonOnly).toBe(c.words);
    expect(c.quiz).toBeGreaterThan(5000);
    expect(c.strict).toBe(c.checked + c.rejected[SEVERAL_WORDS]);
    expect(Object.values(c.rejected).reduce((a, b) => a + b, 0) + c.checked).toBe(c.rows);
    expect(Object.keys(c.rejected)[0]).toBe("gloss names another word");
    expect(PACK.words.every((w) => w.word.length > 0 && w.meaning.length > 0)).toBe(true);
    const sizes = BOOK.languages().map((l) => BOOK.words(l).length);
    expect([Math.min(...sizes), Math.max(...sizes)]).toEqual([c.fewest[1], c.most[1]]);
    expect(c.fewest[1]).toBeGreaterThan(90);
    for (const [lang, word] of [["cs", "dlouhý"], ["pt", "água"], ["la", "numerus"], ["tr", "saka"]]) expect(PACK.words.some((w) => w.lang === lang && w.word === word)).toBe(true);
  });

  test("an entry that only names a form of another word is dropped by rule", () => {
    for (const g of ["short neuter singular of живо́й (živój)", "definite plural of fall", "plural of casa", "inflection of vit:", "alternative spelling of foo"]) expect({ g, drop: formOf(g) }).toEqual({ g, drop: true });
    for (const g of ["The hard white form of dentin which forms the tusks", "a type of blue cheese", "Name of Hindu goddess, a form of Durga", "two (short form of iki)", "water"]) expect({ g, drop: formOf(g) }).toEqual({ g, drop: false });
    expect(PACK.words.some((w) => formOf(w.meaning))).toBe(false);
  });

  test("the meaning for a question is the first clause, and a long one leaves the word for lessons only", () => {
    expect(shortMeaning("water (clear liquid)")).toBe("water");
    expect(shortMeaning("long, lengthy")).toBe("long");
    expect(shortMeaning("a person who carries and sells water in the streets of a town")).toBe("");
    expect(shortMeaning("house.")).toBe("house");
    for (const w of PACK.words.filter((x) => x.quiz && !x.cell)) expect(countTokens(w.short!)).toBeLessThanOrEqual(LIMITS.option);
    expect(PACK.words.filter((w) => !w.quiz).every((w) => !w.cell)).toBe(true);
  });

  test("only a word that is its concept sits in the by-concept view and beside another language", () => {
    const pos = conceptPos(RAW.words);
    const base = RAW.words.find((w) => w.l === "sv" && w.s === "hand")!;
    expect(rejection(base, pos)).toBeNull();
    expect(rejection({ ...base, g: "egg white, white", c: "white" }, pos)).toBe("gloss names another word");
    expect(rejection({ ...base, g: "poached egg with yogurt", c: "egg" }, pos)).toBe("gloss names another word");
    expect(rejection({ ...base, c: undefined }, pos)).toBe("no concept");
    for (const pair of ["sv:vita:white", "pt:senhor:man", "ru:мужик:man", "de:Runde:round", "fr:œillet:eye"]) {
      const [l, s, c] = pair.split(":");
      expect(WRONG_PAIRS.has(pair)).toBe(true);
      expect(PACK.words.find((w) => w.lang === l && w.word === s && w.concept === c)).toMatchObject({ lang: l });
      expect(PACK.words.find((w) => w.lang === l && w.word === s && w.concept === c)!.strict).toBeUndefined();
    }
    const all = BOOK.languages();
    const pages = BOOK.concepts(all, 1).of;
    const rows = Array.from({ length: pages }, (_, i) => BOOK.concepts(all, i + 1).rows).flat();
    expect(rows.length).toBe(BOOK.conceptCount());
    expect(rows.length).toBe(PACK.counts.concepts);
    const shown = rows.flatMap((r) => r.words.flat());
    expect(shown.length).toBe(PACK.counts.strict);
    const strict = new Set(PACK.words.filter((w) => w.strict).map((w) => `${w.lang}:${w.concept}:${w.word}`));
    expect(shown.every((w) => strict.has(`${w.lang}:${w.concept}:${w.word}`))).toBe(true);
    expect(shown.some((w) => (w.lang === "tr" && w.word === "saka") || (w.lang === "sv" && w.word === "vita"))).toBe(false);
    const loose = BOOK.words("tr").find((c) => c.word === "saka")!;
    expect(loose.strict).toBe(false);
    const at = BOOK.lessons("tr").find((l) => BOOK.lessonCells("tr", l.n).includes(loose))!;
    expect(BOOK.lesson("tr", at.n, all)!.words.find((w) => w.word === "saka")!.others).toEqual([]);
  });
});

describe("wrong choices", () => {
  test("come from the answer's part of speech first in the checked forms", () => {
    for (const a of BOOK.set.cells) {
      const order = rivalOrder(BOOK.set, seededRng(`order|${a.lang}:${a.concept}`), a);
      const same = rivals(BOOK.set, a).filter((c) => c.pos === a.pos).length;
      expect(order.length).toBe(rivals(BOOK.set, a).length);
      expect(order.slice(0, same).every((c) => c.pos === a.pos)).toBe(true);
      expect(order.slice(same).every((c) => c.pos !== a.pos)).toBe(true);
    }
  });
});

describe("lesson grouping", () => {
  test("is the same on every build and covers each word of a language once", () => {
    const other = new WordBook(JSON.parse(JSON.stringify(PACK)) as WordPack);
    for (const lang of BOOK.languages()) {
      const lessons = BOOK.lessons(lang);
      expect(other.lessons(lang)).toEqual(lessons);
      const cells = lessons.flatMap((l) => BOOK.lessonCells(lang, l.n));
      expect(cells.length).toBe(BOOK.words(lang).length);
      expect(new Set(cells).size).toBe(cells.length);
      expect(new Set(cells.map((c) => c.ref)).size).toBe(cells.length);
      expect(lessons.every((l) => l.concepts.length >= 1 && l.concepts.length <= LESSON_WORDS)).toBe(true);
      expect(lessons.map((l) => l.n)).toEqual(lessons.map((_, i) => i + 1));
      expect(BOOK.deck(lang)).toMatchObject({ id: `words-${lang}`, words: cells.length, quiz: cells.filter((c) => c.quiz).length, lessons: lessons.length });
    }
  });

  test("a themed lesson holds words of one theme, and the words that are their concept come first", () => {
    for (const l of BOOK.lessons("en")) {
      const theme = THEMES.find((t) => l.title === t.title || l.title.startsWith(`${t.title} `))!;
      if (theme.id !== "mixed") expect(l.concepts.every((c) => theme.concepts.includes(c))).toBe(true);
    }
    expect(new Set(THEMES.flatMap((t) => t.concepts)).size).toBe(THEMES.flatMap((t) => t.concepts).length);
    for (const lang of ["de", "ar", "ja"]) {
      const lessons = BOOK.lessons(lang);
      const firstRound = lessons.filter((l) => !/ [2-9]\d*$/.test(l.title) || / 1$/.test(l.title));
      expect(lessons.slice(0, firstRound.length).map((l) => l.n)).toEqual(firstRound.map((l) => l.n));
      const body = lessons.filter((l) => l.title.startsWith("Body")).flatMap((l) => BOOK.lessonCells(lang, l.n));
      const strictAt = body.map((c) => c.strict);
      expect(strictAt.lastIndexOf(true)).toBeLessThan(strictAt.includes(false) ? strictAt.indexOf(false) : strictAt.length);
    }
  });

  test("a lesson word carries its fields and the same concept in the other chosen languages", () => {
    const page = BOOK.lesson("de", 1, CHOSEN)!;
    expect(page.words.length).toBeGreaterThan(0);
    expect(page.words.length).toBeLessThanOrEqual(LESSON_WORDS);
    for (const w of page.words) {
      expect(w.word.length).toBeGreaterThan(0);
      expect(w.meaning.length).toBeGreaterThan(0);
      expect(w.href).toStartWith("https://en.wiktionary.org/wiki/");
      for (const o of w.others) {
        expect(["ar", "hi"]).toContain(o.lang);
        expect(o.concept).toBe(w.concept);
      }
    }
    const all = BOOK.lessons("de").flatMap((l) => BOOK.lesson("de", l.n, CHOSEN)!.words);
    expect(all.some((w) => w.others.length > 0)).toBe(true);
    expect(all.some((w) => w.ipa && w.etymology && w.senses.length > 0)).toBe(true);
    expect(all.some((w) => !w.quiz)).toBe(true);
    expect(BOOK.lesson("de", 999, CHOSEN)).toBeNull();
  });

  test("the by-concept view puts the concepts most of the chosen languages share first", () => {
    const first = BOOK.concepts(CHOSEN, 1);
    expect(first.languages.map((l) => l.code)).toEqual(CHOSEN);
    expect(first.rows.length).toBe(LESSON_WORDS);
    const cover = first.rows.map((r) => r.words.filter((w) => w.length > 0).length);
    expect(cover).toEqual([...cover].sort((a, b) => b - a));
    expect(cover[0]).toBeGreaterThanOrEqual(2);
    for (const r of first.rows) r.words.forEach((ws, i) => ws.forEach((w) => expect([w.lang, w.concept]).toEqual([CHOSEN[i], r.concept])));
    expect(BOOK.concepts(CHOSEN, 1)).toEqual(first);
    expect(BOOK.concepts([], 1)).toMatchObject({ languages: [], rows: [], concepts: 0, of: 1 });
    expect(BOOK.concepts(CHOSEN, 9999).page).toBe(first.of);
  });

  test("one word per script reads in its direction", () => {
    for (const [lang, dir, script] of SCRIPTS) {
      const cell = BOOK.words(lang).find((c) => c.script === script)!;
      const view = BOOK.view(cell);
      expect({ lang, dir: view.dir, script: view.script }).toEqual({ lang, dir, script });
      expect(view.word).toBe(cell.word);
    }
    expect(BOOK.words("ja").some((c) => c.script === "kana")).toBe(true);
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
    let picks = 0;
    let ready = 0;
    const types = new Set<string>();
    for (const lang of BOOK.languages()) {
      for (const l of BOOK.lessons(lang)) {
        const cells = BOOK.lessonCells(lang, l.n);
        const ids = new Set(cells.filter((c) => c.quiz).map((c) => BOOK.factId(c)));
        ready += ids.size;
        const qs = BOOK.questions(cells, CHOSEN, "seed");
        expect(qs.length).toBeLessThanOrEqual(ids.size);
        for (const q of qs) {
          expect(checkLimits(q)).toEqual([]);
          expect(q.choices!.length).toBe(LIMITS.choices);
          expect(q.choices!.filter((c) => c === q.answer).length).toBe(1);
          expect(q.factIds.some((id) => ids.has(id))).toBe(true);
          expect(q.cardKey).toBe(cardKey(q.factIds.join("+"), q.form));
          expect(q.sources[0].label).toContain("Wiktionary");
          expect(q.word!.credit).toContain("CC-BY-SA");
          if (q.type === "pair") expect(CHOSEN).toContain(q.word!.choicesLang!);
          if (q.prompt.startsWith("What does this")) picks++;
          types.add(q.type);
          asked++;
        }
      }
    }
    expect(asked / ready).toBeGreaterThan(0.95);
    expect(picks).toBeGreaterThan(4000);
    expect(types.size).toBeGreaterThanOrEqual(3);
    const cells = BOOK.lessonCells("de", 1);
    expect(BOOK.questions(cells, CHOSEN, "seed")).toEqual(BOOK.questions(cells, CHOSEN, "seed"));
  });

  test("the meaning question shows the word and offers trimmed meanings of other words of its kind", () => {
    const cell = BOOK.words("pt").find((c) => c.word === "água")!;
    const q = BOOK.meaningPick(cell, "seed")!;
    expect(q.prompt).toBe("What does this Portuguese word mean?");
    expect(q.lines).toEqual(["água"]);
    expect(q.answer).toBe(cell.short);
    expect(q.word).toMatchObject({ lang: "pt", choicesLang: null });
    const byShort = new Map(BOOK.words("pt").filter((c) => c.short && c.pos === cell.pos).map((c) => [c.short, c]));
    for (const c of q.choices!.filter((x) => x !== q.answer)) {
      expect(byShort.has(c)).toBe(true);
      expect(BOOK.words("pt").some((o) => o.short === c && o.pos === cell.pos && o.concept !== cell.concept)).toBe(true);
    }
    const long = BOOK.words("de").find((c) => !c.quiz)!;
    expect([long.quiz, BOOK.meaningPick(long, "seed")]).toEqual([false, null]);
    expect(BOOK.questions([long], CHOSEN, "seed")).toEqual([]);
    let slots = 0;
    let other = 0;
    for (const lang of BOOK.languages()) {
      const pos = new Map(BOOK.words(lang).filter((c) => c.short).map((c) => [c.short, new Set<string>()]));
      for (const c of BOOK.words(lang)) if (c.short) pos.get(c.short)!.add(c.pos);
      for (const c of BOOK.words(lang).filter((x) => x.quiz)) {
        const pick = BOOK.meaningPick(c, "seed");
        for (const x of pick?.choices?.filter((y) => y !== pick.answer) ?? []) {
          slots++;
          if (!pos.get(x)!.has(c.pos)) other++;
        }
      }
    }
    expect(slots).toBeGreaterThan(9000);
    expect(other).toBe(0);
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
    expect(key).toMatch(/^word:de:[^|+]+(\+word:[a-z]{2}:[^|+]+)?\|(meaning|sound|language|pair)$/);
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
    const cells = BOOK.lessons("de").flatMap((l) => BOOK.lessonCells("de", l.n)).filter((c) => c.quiz);
    const due = new Set([BOOK.factId(cells[10])]);
    expect(BOOK.studyCells("de", 2, due, due)[0]).toBe(cells[10]);
    expect(BOOK.studyCells("de", 2, new Set([BOOK.factId(cells[0])]), new Set())[0]).toBe(cells[1]);
    expect(BOOK.studyCells("de", 500, new Set(), new Set()).every((c) => c.quiz)).toBe(true);
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
    expect(text.out[0]).toMatch(/0 of \d+ quiz words started, 0 due, \d+ words in \d+ word lessons/);
    expect(text.out[1]).toBe(`${BOOK.credit.text} Run bkt licences for the terms.`);
    const line = io();
    await learnPath(b, null, [], true, line, BOOK.credit.text);
    const body = JSON.parse(line.out[0]);
    expect(body.wordDecks.map((d: { id: string }) => d.id)).toEqual(["words-de", "words-ar", "words-hi"]);
    expect(body.credit).toContain("CC-BY-SA");
    const one = io();
    expect(await learnWordPath(b, "de", BOOK.credit.text, false, one)).toBe(0);
    expect(one.out[0]).toMatch(/^German word lessons: \d+ words, 0 of \d+ quiz words started, 0 due\.$/);
    expect(one.out[1]).toMatch(/^  1\. [A-Z]/);
    expect(one.out.at(-1)).toBe(`${BOOK.credit.text} Run bkt licences for the terms.`);
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
