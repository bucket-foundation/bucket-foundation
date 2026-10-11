import { afterAll, describe, expect, test } from "bun:test";
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve as resolvePath } from "node:path";
import { checkLimits, LIMITS } from "../../../src/lib/research-os/work-quiz/limits";
import { fold, wordFactId } from "../../../src/lib/research-os/work-quiz/polingual-forms";
import { JSON_SHAPES, jsonLine } from "../src/cli/out";
import { resolve } from "../src/cli/run";
import { CLI_COMMANDS, findCommand } from "../src/cli/table";
import { DECK_LESSON_TITLE, deckIpa, DeckWordBook, lessonWord, mergeWordDecks, openWordDecks, searchTokens, searchWords, wordBookFor, wordHitLine } from "../src/core/word-decks";
import { LESSON_WORDS, WordBook } from "../src/core/words";
import { newDataKey } from "../src/crypto";
import { deckRoutes, SEARCH_NEEDS_WORDS, type DecksBody } from "../src/deck-routes";
import { brokenDecks, checkManifest, DECK_DB, DECK_MANIFEST, deckLine, deckRows, DeckError, decksDir, findInstalled, installDeck, listAvailable, listInstalled, removeDeck, sizeText } from "../src/decks";
import { buildDenylist } from "../src/pack/rights";
import { buildWordPack } from "../src/pack/words";
import { Store } from "../src/store";
import { WordSession, wordRoutes } from "../src/words";
import { WorkQuizStore } from "../src/work-quiz";
import { ARABIC, buildDeck, CHINESE, FIXTURE_LICENCE, FIXTURE_SOURCE, GERMAN, type FixtureWord } from "./fixtures/deck";

const REPO = resolvePath(import.meta.dir, "../../..");
const PACK = buildWordPack(REPO, buildDenylist(REPO));
const ROOT = mkdtempSync(join(tmpdir(), "bkt-decks-"));
const SRC = join(ROOT, "src");
const HOME = join(ROOT, "home");
const BASE = new WordBook(PACK);
const [HELD, OTHER] = BASE.set.byLang.de;
const GERMAN_DECK: FixtureWord[] = [[HELD.word, "", HELD.pos, HELD.concept], ["Zweitwort", "", OTHER.pos, OTHER.concept], ...GERMAN];
const DE = buildDeck(SRC, "de", "German", GERMAN_DECK);
const bundledForms = new Set(BASE.set.cells.map((c) => `${c.lang}:${c.folded}`));
const bundledPairs = new Set(BASE.set.cells.map((c) => `${c.lang}:${c.concept}`));
const row = ([surface, ipa, pos, meaning, shared]: FixtureWord, i: number) => ({ id: i + 1, surface, folded: fold(surface), ipa, pos, meaning, head: "", shared: shared ? 1 : 0 });
const fresh = (lang: string, words: readonly FixtureWord[]) =>
  words.filter((w, i) => {
    const made = lessonWord(lang, row(w, i));
    return made !== null && !bundledForms.has(`${lang}:${fold(made.word)}`) && !bundledPairs.has(`${lang}:${made.concept}`);
  });
const AR = buildDeck(SRC, "ar", "Arabic", ARABIC);
const ZH = buildDeck(SRC, "zh", "Chinese", CHINESE);
const NOW = Date.UTC(2026, 9, 11);
const URL_BASE = "http://127.0.0.1";

afterAll(() => rmSync(ROOT, { recursive: true, force: true }));

const refusal = async (run: () => Promise<unknown>): Promise<string> => {
  try {
    await run();
  } catch (e) {
    expect(e).toBeInstanceOf(DeckError);
    return (e as Error).message;
  }
  throw new Error("the install went through");
};

async function installed(): Promise<DeckWordBook> {
  for (const d of [DE, AR, ZH]) await installDeck(HOME, d.dir);
  return wordBookFor(PACK, HOME);
}

function session(book: WordBook, languages: string[]) {
  const key = newDataKey();
  const store = new Store(":memory:", key);
  const wq = new WorkQuizStore(store, key);
  wq.setLanguages(languages, NOW);
  return new WordSession(book, wq, { now: () => NOW, seed: () => "seed" });
}

describe("deck manifest", () => {
  test("a full manifest reads as a general deck with title, kind, counts, curator and card fields", () => {
    const m = checkManifest(DE.manifest);
    expect([m.format, m.id, m.title, m.kind, m.language, m.curator, m.licence, m.source]).toEqual(["bkt-deck", "polingual-de", "German words", "words", "de", "Bucket Foundation", FIXTURE_LICENCE, FIXTURE_SOURCE]);
    expect(m.fields).toContain("surface");
    expect(m.counts.cards).toBe(GERMAN_DECK.length);
    expect(checkManifest({ ...DE.manifest, kind: "cards", language: null, fields: ["front", "back"] }).kind).toBe("cards");
  });

  test("a manifest with no licence, source or curator is refused in a sentence", () => {
    const { licence: _l, ...bare } = DE.manifest;
    expect(() => checkManifest(bare)).toThrow("names no licence");
    expect(() => checkManifest({ ...DE.manifest, licence: "  " })).toThrow("names no licence");
    expect(() => checkManifest({ ...DE.manifest, source: "" })).toThrow("names no source");
    expect(() => checkManifest({ ...DE.manifest, curator: undefined })).toThrow("names no curator");
  });

  test("a manifest that points outside its folder or carries a bad shape is refused", () => {
    for (const bad of [
      { file: "../x.zst" },
      { file: "a/b.zst" },
      { id: "../etc" },
      { id: "Bad Id" },
      { kind: "video" },
      { format: "other" },
      { format_version: 2 },
      { sha256: "abc" },
      { counts: {} },
      { fields: [] },
      { language: null },
      { licence_url: "http://plain.example" },
      { built: "yesterday" },
    ])
      expect(() => checkManifest({ ...DE.manifest, ...bad })).toThrow(DeckError);
    expect(() => checkManifest(null)).toThrow(DeckError);
    expect(() => checkManifest([])).toThrow(DeckError);
  });
});

describe("install", () => {
  test("a deck installs from its folder, its file or its manifest, and lands unpacked beside its manifest", async () => {
    const home = join(ROOT, "h-install");
    for (const from of [DE.dir, DE.packed, join(DE.dir, DECK_MANIFEST)]) {
      const m = await installDeck(home, from);
      expect(m.id).toBe("polingual-de");
    }
    const [deck] = listInstalled(home);
    expect(deck.dir).toBe(join(decksDir(home), "polingual-de"));
    expect(statSync(deck.db).size).toBe(DE.manifest.db_bytes);
    expect(JSON.parse(readFileSync(join(deck.dir, DECK_MANIFEST), "utf8")).licence).toBe(FIXTURE_LICENCE);
    expect(brokenDecks(home)).toEqual([]);
    expect(findInstalled(home, "German")!.manifest.id).toBe("polingual-de");
    expect(findInstalled(home, "de")!.manifest.id).toBe("polingual-de");
  });

  test("a tampered deck file is refused and nothing is installed", async () => {
    const home = join(ROOT, "h-tamper");
    const bad = buildDeck(join(ROOT, "tamper"), "de", "German", GERMAN);
    const bytes = readFileSync(bad.packed);
    bytes[bytes.length - 9] ^= 0xff;
    writeFileSync(bad.packed, bytes);
    expect(await refusal(() => installDeck(home, bad.dir))).toContain("The file was changed, so Bucket left it alone.");
    expect(listInstalled(home)).toEqual([]);
    expect(existsSync(join(decksDir(home), "polingual-de"))).toBe(false);
  });

  test("a deck cut short, swapped, or with a rewritten checksum is refused", async () => {
    const home = join(ROOT, "h-swap");
    const cut = buildDeck(join(ROOT, "cut"), "de", "German", GERMAN);
    writeFileSync(cut.packed, readFileSync(cut.packed).subarray(0, 100));
    expect(await refusal(() => installDeck(home, cut.dir))).toContain("was changed or cut short");

    const swap = buildDeck(join(ROOT, "swap"), "de", "German", GERMAN);
    const other = Bun.zstdCompressSync(Buffer.from("not a database"));
    writeFileSync(swap.packed, other);
    const sum = new Bun.CryptoHasher("sha256").update(other).digest("hex");
    writeFileSync(join(swap.dir, DECK_MANIFEST), JSON.stringify({ ...swap.manifest, bytes: other.length, sha256: sum }));
    expect(await refusal(() => installDeck(home, swap.dir))).toContain("differs from its manifest");

    const junk = Buffer.from("plain text, never packed");
    writeFileSync(swap.packed, junk);
    writeFileSync(join(swap.dir, DECK_MANIFEST), JSON.stringify({ ...swap.manifest, bytes: junk.length, sha256: new Bun.CryptoHasher("sha256").update(junk).digest("hex") }));
    expect(await refusal(() => installDeck(home, swap.dir))).toContain("does not unpack");
    expect(listInstalled(home)).toEqual([]);
    expect(brokenDecks(home)).toEqual([]);
  });

  test("a deck with no licence in its manifest, or none inside the file, is refused", async () => {
    const home = join(ROOT, "h-licence");
    const none = buildDeck(join(ROOT, "nolicence"), "de", "German", GERMAN, { licence: null });
    expect(await refusal(() => installDeck(home, none.dir))).toContain("names no licence");
    const inner = buildDeck(join(ROOT, "noinner"), "de", "German", GERMAN, { innerLicence: null });
    expect(await refusal(() => installDeck(home, inner.dir))).toContain("carries no licence inside");
    const differs = buildDeck(join(ROOT, "differs"), "de", "German", GERMAN, { innerLicence: "CC0" });
    expect(await refusal(() => installDeck(home, differs.dir))).toContain("its manifest says CC-BY-SA 3.0");
    expect(listInstalled(home)).toEqual([]);
  });

  test("a deck whose manifest counts more cards than the file holds is refused", async () => {
    const home = join(ROOT, "h-count");
    const d = buildDeck(join(ROOT, "count"), "de", "German", GERMAN);
    writeFileSync(join(d.dir, DECK_MANIFEST), JSON.stringify({ ...d.manifest, counts: { cards: GERMAN.length + 5 } }));
    expect(await refusal(() => installDeck(home, d.dir))).toContain(`holds ${GERMAN.length} cards`);
  });

  test("a missing folder, manifest or deck file each say what is missing", async () => {
    const home = join(ROOT, "h-missing");
    expect(await refusal(() => installDeck(home, join(ROOT, "nowhere")))).toContain("does not exist");
    expect(await refusal(() => installDeck(home, ROOT))).toContain("a deck is a folder with a manifest and one deck file");
    const gone = buildDeck(join(ROOT, "gone"), "de", "German", GERMAN);
    rmSync(gone.packed);
    expect(await refusal(() => installDeck(home, gone.dir))).toContain("is missing beside the manifest");
  });

  test("list shows installed decks and the ones a folder offers; remove takes an id or a language", async () => {
    const home = join(ROOT, "h-list");
    expect(deckRows(home, null)).toEqual([]);
    expect(listAvailable(SRC).map((a) => a.manifest.id).sort()).toEqual(["polingual-ar", "polingual-de", "polingual-zh"]);
    await installDeck(home, DE.dir);
    const rows = deckRows(home, SRC);
    expect(rows.map((r) => [r.id, r.installed])).toEqual([
      ["polingual-de", true],
      ["polingual-ar", false],
      ["polingual-zh", false],
    ]);
    const line = deckLine(rows[0]);
    for (const want of ["installed", "German words", `${GERMAN_DECK.length} words`, FIXTURE_SOURCE, FIXTURE_LICENCE, "curated by Bucket Foundation"]) expect(line).toContain(want);
    expect(removeDeck(home, "klingon")).toBeNull();
    expect(removeDeck(home, "German")!.id).toBe("polingual-de");
    expect(listInstalled(home)).toEqual([]);
    expect(sizeText(5 * 1024 ** 3)).toBe("5.0 GB");
    expect(sizeText(1536 * 1024)).toBe("1.5 MB");
    expect(sizeText(10)).toBe("1 KB");
  });
});

describe("reader", () => {
  test("installed words join the bundled words with no duplicate word or concept", async () => {
    const book = await installed();
    const base = new WordBook(PACK);
    for (const lang of ["de", "ar", "zh"]) {
      const cells = book.set.byLang[lang];
      expect(cells.length).toBeGreaterThan(base.set.byLang[lang].length);
      expect(new Set(cells.map((c) => c.folded)).size).toBe(cells.length);
      expect(new Set(cells.map((c) => c.concept)).size).toBe(cells.length);
      expect(new Set(cells.map(wordFactId)).size).toBe(cells.length);
      for (const c of base.set.byLang[lang]) expect(cells.some((x) => x.word === c.word && x.concept === c.concept)).toBe(true);
    }
    const held = book.set.byLang.de.filter((c) => c.folded === HELD.folded);
    expect(held.length).toBe(1);
    expect(book.fromDeck(held[0])).toBe(false);
    expect(book.set.byLang.de.map((c) => c.word)).not.toContain("Zweitwort");
    expect(book.set.byLang.de.filter((c) => c.concept === OTHER.concept).map((c) => c.word)).toEqual([OTHER.word]);
    expect(book.set.byLang.de.filter((c) => book.fromDeck(c)).map((c) => c.word)).toEqual(fresh("de", GERMAN).map((w) => w[0]));
    book.close();
  });

  test("inflected forms, phrases, names and overlong words stay out of lessons", async () => {
    const book = await installed();
    const words = book.set.byLang.de.map((c) => c.word);
    for (const out of ["Tische", "Zimmer frei", "Berlin", "Gebäudereinigungsunternehmensverwaltungsangestellter"]) expect(words).not.toContain(out);
    for (const kept of ["Tisch", "Stuhl", "kaufen"]) expect(words).toContain(kept);
    expect(lessonWord("de", { id: 1, surface: "Tische", folded: "tische", ipa: "", pos: "noun", meaning: "plural of Tisch", head: "", shared: 0 })).toBeNull();
    expect(lessonWord("de", { id: 1, surface: "laufen", folded: "laufen", ipa: "/ˈlaʊ̯fn̩/", pos: "verb", meaning: "to run · to work (of a machine) · to flow", head: "run", shared: 0 })).toBeNull();
    const ok = lessonWord("de", { id: 1, surface: "laufen", folded: "laufen", ipa: "/ˈlaʊ̯fn̩/", pos: "verb", meaning: "to run (move fast) · to run, to work (of a machine) · to flow", head: "run", shared: 0 })!;
    expect([ok.concept, ok.gloss, ok.ipa, ok.meaning, ok.senses.length]).toEqual(["run", "to run", "ˈlaʊ̯fn̩", "to run (move fast)", 2]);
    expect(deckIpa("[mʲizɨ]")).toBe("mʲizɨ");
    const kind = lessonWord("de", { id: 1, surface: "Kind", folded: "kind", ipa: "/kɪnt/", pos: "noun", meaning: "kid; child (young person) · child; offspring", head: "child", shared: 0 })!;
    expect([kind.concept, kind.gloss]).toEqual(["child", "kid"]);
    expect(lessonWord("de", { id: 1, surface: "Kind", folded: "kind", ipa: "", pos: "noun", meaning: "kid", head: "horse", shared: 0 })).toBeNull();
    book.close();
  });

  test("bundled lessons keep their order and size; deck words follow as Common words, most common first", async () => {
    const book = await installed();
    const base = new WordBook(PACK);
    const own = base.lessons("de");
    const all = book.lessons("de");
    expect(all.slice(0, own.length)).toEqual(own);
    const more = all.slice(own.length);
    expect(more.length).toBeGreaterThan(1);
    expect(more.every((l) => l.title.startsWith(DECK_LESSON_TITLE))).toBe(true);
    expect(all.map((l) => l.n)).toEqual(all.map((_, i) => i + 1));
    expect(Math.max(...all.map((l) => l.concepts.length))).toBeLessThanOrEqual(LESSON_WORDS);
    const order = more.flatMap((l) => book.lessonCells("de", l.n).map((c) => c.word));
    expect(order).toEqual(fresh("de", GERMAN).map((w) => w[0]));
    expect(book.deck("de").words).toBe(book.set.byLang.de.length);
    expect(book.deck("de").lessons).toBe(all.length);
    const page = book.lesson("de", more[0].n, ["de", "ar", "zh"])!;
    expect(page.words.length).toBeLessThanOrEqual(LESSON_WORDS);
    expect(page.words[0].href).toBe(`https://en.wiktionary.org/wiki/${encodeURIComponent(page.words[0].word)}`);
    expect(page.words.some((w) => w.others.length > 0)).toBe(true);
    book.close();
  });

  test("the by-concept view lines up installed words that share a meaning across languages", async () => {
    const book = await installed();
    const chosen = ["de", "ar", "zh"];
    const rows: Record<string, (string | null)[]> = {};
    for (let p = 1; p <= book.concepts(chosen, 1).of; p++) for (const r of book.concepts(chosen, p).rows) rows[r.concept] = r.words.map((w) => w?.word ?? null);
    for (const concept of ["window", "bridge", "garden"]) {
      expect(rows[concept].every((w) => w !== null)).toBe(true);
      expect(rows[concept]).toEqual(["de", "ar", "zh"].map((l) => book.set.byLang[l].find((c) => c.concept === concept)!.word));
    }
    const shared = ["window", "bridge", "garden"].filter((c) => !bundledPairs.has(`zh:${c}`));
    expect(shared.length).toBeGreaterThan(0);
    for (const c of shared) expect(rows[c][2]).toBe(CHINESE.find((w) => w[3] === c)![0]);
    expect(rows.spoon[0]).not.toBeNull();
    expect(rows.spoon.slice(1)).toEqual([null, null]);
    book.close();
  });

  test("right-to-left and CJK words keep their direction, script and marks", async () => {
    const book = await installed();
    const ar = book.view(book.set.byLang.ar.find((c) => c.concept === "window")!);
    expect([ar.dir, ar.script, ar.word, ar.name]).toEqual(["rtl", "arabic", "نَافِذَة", "Arabic"]);
    const zh = book.view(book.set.byLang.zh.find((c) => c.concept === "window")!);
    expect([zh.dir, zh.script, zh.word, zh.ipa]).toEqual(["ltr", "han", "窗户", "ʈ͡ʂʰwɑŋ xu"]);
    expect(book.set.scripts.ar).toBe("arabic");
    expect(book.set.scripts.zh).toBe("han");
    book.close();
  });

  test("a language with no name in the app is searchable and stays out of lessons", async () => {
    const home = join(ROOT, "h-old");
    const old = buildDeck(join(ROOT, "old"), "ang", "Old English", [["wæter", "/ˈwæ.ter/", "noun", "water"], ["hūs", "/huːs/", "noun", "house"]]);
    await installDeck(home, old.dir);
    const book = wordBookFor(PACK, home);
    expect(book.languages()).not.toContain("ang");
    const found = searchWords(book, book.files, "wæter");
    expect(found.hits.map((h) => [h.lang, h.name, h.word])).toEqual([["ang", "Old English", "wæter"]]);
    book.close();
  });

  test("a deck file that stops opening leaves the bundled words in place and says so", async () => {
    const home = join(ROOT, "h-broken");
    await installDeck(home, DE.dir);
    writeFileSync(join(decksDir(home), "polingual-de", DECK_DB), "not a database");
    const said: string[] = [];
    const book = wordBookFor(PACK, home, { onError: (m) => said.push(m) });
    expect(book.set.byLang.de.length).toBe(new WordBook(PACK).set.byLang.de.length);
    expect(said.length).toBe(1);
    expect(said[0]).toContain("run bkt doctor");
  });

  test("the cap bounds how many deck words a language adds", () => {
    const rows = GERMAN.map(row);
    const merged = mergeWordDecks(PACK, [{ lang: "de", rows }], 3);
    expect(merged.added.get("de")!.map((w) => w.word)).toEqual(fresh("de", GERMAN).slice(0, 3).map((w) => w[0]));
    expect(mergeWordDecks(PACK, []).pack).toBe(PACK);
    expect(mergeWordDecks(PACK, [{ lang: "ang", rows }]).pack).toBe(PACK);
  });
});

describe("quiz", () => {
  test("every question on installed words passes the limits with exactly 3 choices and one answer", async () => {
    const book = await installed();
    let asked = 0;
    for (const lang of ["de", "ar", "zh"]) {
      const cells = book.set.byLang[lang].filter((c) => book.fromDeck(c));
      expect(cells.length).toBeGreaterThanOrEqual(8);
      const qs = book.questions(cells, ["de", "ar", "zh"], "seed");
      expect(qs.length).toBeGreaterThanOrEqual(Math.floor(cells.length / 2));
      for (const q of qs) {
        expect(checkLimits(q)).toEqual([]);
        expect(q.choices!.length).toBe(LIMITS.choices);
        expect(new Set(q.choices).size).toBe(LIMITS.choices);
        expect(q.choices!.filter((c) => c === q.answer).length).toBe(1);
        expect(q.type).not.toBe("pair");
        expect(q.word!.credit).toBe("Wiktionary via Kaikki (kaikki.org), CC-BY-SA 3.0");
        expect(q.sources[0].href).toContain("https://en.wiktionary.org/wiki/");
        asked++;
      }
    }
    expect(asked).toBeGreaterThan(20);
    book.close();
  });

  test("a pair question never leans on a deck word, so a bundled word keeps its checked match", async () => {
    const book = await installed();
    const bundled = book.set.byLang.de.filter((c) => !book.fromDeck(c));
    const deckFacts = new Set(book.set.cells.filter((c) => book.fromDeck(c)).map(wordFactId));
    const pairs = book.questions(bundled, ["de", "ar", "zh", "es", "fr"], "s2").filter((q) => q.type === "pair");
    for (const q of pairs) expect(q.factIds.some((id) => deckFacts.has(id))).toBe(false);
    book.close();
  });

  test("a lesson quiz on deck words records them for review through the word session", async () => {
    const book = await installed();
    const s = session(book, ["de", "ar"]);
    const first = book.lessons("de").find((l) => l.title.startsWith(DECK_LESSON_TITLE))!;
    const quiz = s.quiz({ deck: "de", lesson: first.n });
    expect(quiz.questions.length).toBeGreaterThan(0);
    expect(quiz.credit.licence).toBe("CC-BY-SA 3.0");
    for (const q of quiz.questions) expect(q.choices!.length).toBe(3);
    const before = s.decks().find((d) => d.lang === "de")!.started;
    s.answer(quiz.questions[0].id, quiz.questions[0].choices![0], 1500);
    expect(s.decks().find((d) => d.lang === "de")!.started).toBe(before + 1);
    book.close();
  });
});

describe("word search", () => {
  test("finds a word by its form or its meaning across installed decks, exact form first", async () => {
    const book = await installed();
    const byMeaning = searchWords(book, book.files, "window");
    for (const w of ["Fenster", "نَافِذَة", "窗户"]) expect(byMeaning.hits.map((h) => h.word)).toContain(w);
    expect(byMeaning.credit.text).toContain("Wiktionary via Kaikki");
    expect(byMeaning.languages).toBeGreaterThanOrEqual(3);
    expect(byMeaning.words).toBeGreaterThan(GERMAN.length + ARABIC.length);
    const byForm = searchWords(book, book.files, "Tisch");
    expect(byForm.hits[0].word).toBe("Tisch");
    expect(byForm.hits.map((h) => h.word)).toContain("Tische");
    const prefix = searchWords(book, book.files, "schl", { lang: "de" }).hits.map((h) => h.word);
    expect(prefix).toContain("Schlüssel");
    expect(prefix.every((w) => fold(w).startsWith("schl"))).toBe(true);
    expect(searchWords(book, book.files, "brucke").hits[0].word).toBe("Brücke");
    const arabic = searchWords(book, book.files, "school", { lang: "Arabic" }).hits;
    expect(arabic.map((h) => h.word)).toContain("مَدْرَسَة");
    expect(arabic.every((h) => h.lang === "ar")).toBe(true);
    expect(searchWords(book, book.files, "school", { lang: "zh" }).hits.map((h) => h.word)).toContain("学校");
    expect(searchWords(book, book.files, "window", { limit: 2 }).hits.length).toBe(2);
    book.close();
  });

  test("right-to-left words match with or without their marks, and CJK words match by prefix", async () => {
    const book = await installed();
    const bare = searchWords(book, book.files, "كتاب").hits[0];
    expect([bare.word, bare.dir, bare.script, bare.lang]).toEqual(["كِتَاب", "rtl", "arabic", "ar"]);
    expect(searchWords(book, book.files, "كِتَاب").hits[0].word).toBe("كِتَاب");
    const han = searchWords(book, book.files, "学").hits[0];
    expect([han.word, han.dir, han.script, han.ipa]).toEqual(["学校", "ltr", "han", "ɕɥɛ ɕjɑʊ̯"]);
    expect(wordHitLine(han)).toBe("Chinese  学校  /ɕɥɛ ɕjɑʊ̯/  noun  school");
    book.close();
  });

  test("bundled words answer when no deck is installed, and odd input finds nothing without failing", () => {
    const book = wordBookFor(PACK, join(ROOT, "h-none"));
    const water = searchWords(book, book.files, "water");
    expect(water.hits.length).toBeGreaterThan(3);
    expect(water.hits.every((h) => h.deck === "bundled")).toBe(true);
    for (const odd of ['"', "*", "a OR b)", "NEAR(", "   ", "x".repeat(500), "col:umn", "-"]) expect(Array.isArray(searchWords(book, book.files, odd).hits)).toBe(true);
    expect(searchTokens('"wa*ter" OR')).toEqual(["wa", "ter", "or"]);
    expect(searchTokens("  ")).toEqual([]);
  });

  test("odd input against a real deck never reaches the index as syntax", async () => {
    const book = await installed();
    for (const odd of ['"', "*", "a OR b)", "NEAR(", "surface:tisch", "tisch*", "-tisch", "^tisch", "{surface}:x"]) expect(Array.isArray(searchWords(book, book.files, odd).hits)).toBe(true);
    expect(searchWords(book, book.files, "surface:tisch").hits).toEqual([]);
    book.close();
  });
});

describe("routes", () => {
  test("the deck list and the word search carry the attribution", async () => {
    const book = await installed();
    const routes = deckRoutes({ home: HOME, book: () => book, decks: () => book.files });
    const call = async (path: string) => {
      const url = new URL(path, URL_BASE);
      const r = await routes[`GET ${url.pathname}`](new Request(url), url);
      return { status: r.status, body: (await r.json()) as Record<string, unknown> };
    };
    const list = await call("/local/decks");
    const body = list.body as unknown as DecksBody;
    expect(body.decks.map((d) => [d.languageName, d.cards, d.installed])).toEqual([
      ["Arabic", ARABIC.length, true],
      ["German", GERMAN_DECK.length, true],
      ["Chinese", CHINESE.length, true],
    ]);
    expect(body.decks.every((d) => d.licence === FIXTURE_LICENCE && d.source === FIXTURE_SOURCE && d.curator === "Bucket Foundation")).toBe(true);
    expect(body.credit.licence).toBe("CC-BY-SA 3.0");
    const found = await call("/local/words/search?q=garden&n=2");
    expect((found.body.hits as unknown[]).length).toBe(2);
    expect((found.body.credit as { text: string }).text).toContain("CC-BY-SA 3.0");
    expect((await call("/local/words/search?q=")).status).toBe(400);
    expect((await call("/local/words/search")).body.error).toBe(SEARCH_NEEDS_WORDS);
    expect(((await call("/local/words/search?q=garden&lang=de")).body.hits as { word: string }[]).map((h) => h.word)).toContain("Garten");
    book.close();
  });

  test("lessons, decks and concepts from the word routes credit the source on installed words", async () => {
    const book = await installed();
    const routes = wordRoutes(session(book, ["de", "ar", "zh"]));
    const call = async (path: string) => {
      const url = new URL(path, URL_BASE);
      return (await (await routes[`GET ${url.pathname}`](new Request(url), url)).json()) as { credit: { text: string; licence: string }; decks?: { lang: string; words: number }[] };
    };
    const n = book.lessons("de").find((l) => l.title.startsWith(DECK_LESSON_TITLE))!.n;
    for (const path of ["/local/words/decks", "/local/words/lessons?deck=de", `/local/words/lesson?deck=de&n=${n}`, "/local/words/concepts?page=1", `/local/words/quiz?deck=de&lesson=${n}`]) {
      const body = await call(path);
      expect(body.credit.text).toContain("Wiktionary via Kaikki (kaikki.org), CC-BY-SA 3.0");
      expect(body.credit.licence).toBe("CC-BY-SA 3.0");
    }
    expect((await call("/local/words/decks")).decks!.find((d) => d.lang === "de")!.words).toBe(book.set.byLang.de.length);
    book.close();
  });
});

describe("commands", () => {
  test("decks and words name the same three commands", () => {
    for (const family of ["decks", "words"]) for (const verb of ["list", "install", "remove"]) expect(findCommand(`${family} ${verb}`)?.json).toBe(true);
    const run = resolve(["words", "install", "/tmp/x"]);
    expect(run.kind === "run" && [run.command.name, run.positionals]).toEqual(["words install", ["/tmp/x"]]);
    const decks = resolve(["decks", "remove", "de", "--json"]);
    expect(decks.kind === "run" && [decks.command.name, decks.values.json]).toEqual(["decks remove", true]);
    expect(() => resolve(["decks", "install"])).toThrow("decks install needs <file-or-folder>");
    expect(() => resolve(["decks", "burn"])).toThrow("unknown decks command burn");
    expect(CLI_COMMANDS.filter((c) => c.name.startsWith("decks ")).length).toBe(3);
  });

  test("search --words takes a language and refuses the canon-only flags", () => {
    const run = resolve(["search", "--words", "water", "--lang", "German", "--limit", "5"]);
    expect(run.kind === "run" && [run.values.words, run.values.lang, run.positionals]).toEqual([true, "German", ["water"]]);
    expect(() => resolve(["search", "--words", "water", "--tsv"])).toThrow("--words takes --limit, --lang and --json");
    expect(() => resolve(["search", "water", "--lang", "de"])).toThrow("--lang goes with --words");
  });

  test("the script shapes keep the licence and the credit", async () => {
    const book = await installed();
    const rows = deckRows(HOME, null);
    const line = JSON.parse(jsonLine("decks list", { decks: rows, credit: book.credit.text })) as { v: number; decks: { licence: string; cards: number }[]; credit: string };
    expect([line.v, line.decks.length, line.decks[0].licence]).toEqual([1, 3, FIXTURE_LICENCE]);
    expect(line.credit).toContain("Wiktionary");
    const found = searchWords(book, book.files, "key");
    const out = JSON.parse(jsonLine("search words", { ...found, credit: found.credit.text })) as { hits: { word: string }[]; credit: string };
    expect(out.hits.length).toBeGreaterThanOrEqual(3);
    expect(out.credit).toContain("CC-BY-SA 3.0");
    expect(Object.keys(JSON_SHAPES)).toContain("decks install");
    book.close();
  });
});

describe("through the command line", () => {
  const CLI = join(import.meta.dir, "../src/cli.tsx");
  const home = join(ROOT, "h-cli");
  const env = { PATH: process.env.PATH ?? "", HOME: join(ROOT, "user"), BKT_HOME: home, XDG_RUNTIME_DIR: join(ROOT, "run"), TMPDIR: ROOT, NO_COLOR: "1" };
  const bkt = (...args: string[]) => {
    const r = Bun.spawnSync([process.execPath, CLI, ...args], { env, stdin: "ignore", stdout: "pipe", stderr: "pipe" });
    return { code: r.exitCode, out: r.stdout.toString(), err: r.stderr.toString() };
  };

  test("install, list, search and remove run with no key store and print sentences with the licence", () => {
    const none = bkt("decks", "list");
    expect([none.code, none.out]).toEqual([3, ""]);
    expect(none.err).toContain("no deck is installed; run bkt decks install <file-or-folder>");

    const put = bkt("words", "install", AR.dir);
    expect(put.err).toBe("");
    expect(put.code).toBe(0);
    expect(put.out.trimEnd().split("\n")).toEqual([
      `Installed Arabic words: ${ARABIC.length} words, version ${AR.manifest.version}, checksum matches.`,
      "Wiktionary via Kaikki (kaikki.org), CC-BY-SA 3.0, curated by Bucket Foundation.",
      "Restart Bucket to see it in Learn.",
    ]);
    expect(existsSync(join(home, "bkt.db"))).toBe(false);
    expect(bkt("decks", "install", ZH.packed, "--json").out).toContain('"id":"polingual-zh"');

    const list = bkt("decks", "list", SRC);
    expect(list.code).toBe(0);
    const lines = list.out.trimEnd().split("\n");
    expect(lines.length).toBe(4);
    expect(lines[0]).toStartWith("installed  polingual-ar");
    expect(lines[2]).toStartWith("available  polingual-de");
    expect(lines[3]).toContain("Wiktionary via Kaikki (kaikki.org), CC-BY-SA 3.0");
    expect(bkt("words", "list").out).toBe(bkt("decks", "list").out);

    const found = bkt("search", "--words", "كتاب");
    expect(found.code).toBe(0);
    expect(found.out.split("\n")[0]).toBe("Arabic  كِتَاب  /ki.taːb/  noun  book");
    expect(found.out).toContain("Wiktionary via Kaikki (kaikki.org), CC-BY-SA 3.0");
    const han = JSON.parse(bkt("search", "--words", "学", "--lang", "zh", "--json").out) as { v: number; hits: { word: string; dir: string }[]; credit: string; words: number };
    expect([han.v, han.hits[0].word, han.hits[0].dir]).toEqual([1, "学校", "ltr"]);
    expect(han.credit).toContain("CC-BY-SA 3.0");
    const miss = bkt("search", "--words", "zzzzqq");
    expect(miss.code).toBe(3);
    expect(miss.err).toContain("no word matches zzzzqq in");

    const doctor = bkt("doctor", "--keyring", "passphrase");
    expect(doctor.out).toContain("ok    Decks           2 installed, 20 cards,");
    expect(doctor.out).toContain("word decks for Arabic, Chinese");

    const gone = bkt("words", "remove", "ar");
    expect([gone.code, gone.out.trim()]).toEqual([0, "Removed Arabic words. Restart Bucket to drop it from Learn."]);
    expect(bkt("decks", "remove", "ar").code).toBe(3);
    expect(listInstalled(home).map((d) => d.manifest.id)).toEqual(["polingual-zh"]);
  }, 120_000);

  test("a tampered deck exits 1 with the reason and installs nothing", () => {
    const bad = buildDeck(join(ROOT, "cli-tamper"), "de", "German", GERMAN);
    const bytes = readFileSync(bad.packed);
    bytes[20] ^= 0xff;
    writeFileSync(bad.packed, bytes);
    const r = bkt("decks", "install", bad.dir);
    expect(r.code).toBe(1);
    expect(r.out).toBe("");
    expect(r.err).toContain("The file was changed, so Bucket left it alone.");
    const none = buildDeck(join(ROOT, "cli-nolicence"), "de", "German", GERMAN, { licence: null });
    expect(bkt("decks", "install", none.dir).err).toContain("names no licence");
    expect(listInstalled(home).map((d) => d.manifest.id)).not.toContain("polingual-de");
  }, 120_000);
});

describe("the exporter's own output", () => {
  const python = Bun.which("python3");
  const zstd = Bun.which("zstd");
  test.skipIf(!python || !zstd)("a deck the exporter writes installs, reads and searches", async () => {
    const out = join(ROOT, "exported");
    const code = "import sys; sys.path.insert(0, sys.argv[1]); import export_packs as ep, test_export_packs as t; ep.export_all(t.FakeSource(), sys.argv[2], built='2026-10-11', commit='test', log=lambda l: None, level=3)";
    const run = Bun.spawnSync([python!, "-B", "-c", code, join(REPO, "tools/polingual"), out]);
    expect(run.stderr.toString()).toBe("");
    expect(run.exitCode).toBe(0);
    const home = join(ROOT, "h-exported");
    const m = await installDeck(home, join(out, "es"));
    expect([m.id, m.title, m.kind, m.licence, m.curator, m.counts.cards]).toEqual(["polingual-es", "Spanish words", "words", "CC-BY-SA 3.0", "Bucket Foundation", 7]);
    const [deck] = openWordDecks(home);
    expect(deck.meta().adaptation).toContain("same licence");
    expect([...deck.top(2)].map((r) => r.surface)).toEqual(["gato", "agua"]);
    expect(deck.search("water", 5).map((r) => r.surface)).toEqual(["agua", "agua de coco"]);
    deck.close();
    await installDeck(home, join(out, "ar"));
    const book = wordBookFor(PACK, home);
    expect(searchWords(book, book.files, "كتاب").hits[0].word).toBe("كِتَاب");
    book.close();
  });
});
