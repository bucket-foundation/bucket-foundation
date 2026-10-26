import { Database } from "bun:sqlite";
import { afterAll, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, renameSync, rmSync, statSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve as resolvePath } from "node:path";
import { checkLimits, LIMITS } from "../../../src/lib/research-os/work-quiz/limits";
import { fold } from "../../../src/lib/research-os/work-quiz/polingual-forms";
import { JSON_SHAPES, jsonLine } from "../src/cli/out";
import { resolve } from "../src/cli/run";
import { CLI_COMMANDS, findCommand } from "../src/cli/table";
import { deckIpa, deckLessonWords, DeckWordBook, lessonWord, openWordDecks, searchTokens, searchWords, wordBookFor, wordHitLine } from "../src/core/word-decks";
import { LESSON_WORDS, WordBook } from "../src/core/words";
import { newDataKey } from "../src/crypto";
import { creditedWordRoutes, deckRoutes, SEARCH_NEEDS_WORDS, type DecksBody } from "../src/deck-routes";
import { brokenDecks, checkManifest, DECK_DB, DECK_MANIFEST, deckLine, deckRows, DeckError, decksDir, findInstalled, installDeck, listAvailable, listInstalled, MAX_DECK_CARDS, MAX_DECK_DB_BYTES, MAX_DECK_FILE_BYTES, MAX_INSTALLED_BYTES, removeDeck, SEARCH_ROW_CAP, sizeText, UNCHECKED_RELEASE_FILE } from "../src/decks";
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
const HELD = BASE.words("de")[0];
const GERMAN_DECK: FixtureWord[] = [[HELD.word, "", HELD.pos, "a word Bucket already holds"], ...GERMAN];
const DE = buildDeck(SRC, "de", "German", GERMAN_DECK);
const row = ([surface, ipa, pos, meaning, shared]: FixtureWord, i: number) => ({ id: i + 1, surface, folded: fold(surface), ipa, pos, meaning, head: "", shared: shared ? 1 : 0 });
const fresh = (lang: string, words: readonly FixtureWord[]) => {
  const held = new Set(BASE.words(lang).map((c) => fold(c.word)));
  return words.filter((w, i) => lessonWord(lang, row(w, i)) !== null && !held.has(fold(w[0])));
};
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
    expect(await refusal(() => installDeck(home, differs.dir))).toContain("its manifest says CC-BY-SA 4.0");
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

  test("a lone release deck file installs from the signed deck list and nothing else", async () => {
    const home = join(ROOT, "h-release");
    const lone = join(ROOT, "release");
    mkdirSync(lone, { recursive: true });
    const file = join(lone, DE.manifest.file);
    writeFileSync(file, readFileSync(DE.packed));
    expect(await refusal(() => installDeck(home, file, null))).toBe(UNCHECKED_RELEASE_FILE);
    expect(await refusal(() => installDeck(home, file, [AR.manifest]))).toContain("release deck file the signed deck list names");
    const m = await installDeck(home, file, [DE.manifest, AR.manifest]);
    expect(m.id).toBe("polingual-de");
    expect(listInstalled(home).map((d) => d.manifest.id)).toEqual(["polingual-de"]);
    writeFileSync(file, Buffer.concat([readFileSync(DE.packed), Buffer.from("x")]));
    expect(await refusal(() => installDeck(join(ROOT, "h-release-2"), file, [DE.manifest]))).toContain("changed or cut short");
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


function hostile(dir: string, lang: string, build: (db: Database) => void): string {
  const made = buildDeck(dir, lang, "German", GERMAN);
  const raw = Bun.zstdDecompressSync(readFileSync(made.packed));
  const path = join(made.dir, "h.sqlite");
  writeFileSync(path, raw);
  const db = new Database(path);
  build(db);
  db.close();
  const bytes = readFileSync(path);
  rmSync(path);
  const packed = Bun.zstdCompressSync(bytes);
  writeFileSync(made.packed, packed);
  const sum = (x: Uint8Array) => new Bun.CryptoHasher("sha256").update(x).digest("hex");
  writeFileSync(join(made.dir, DECK_MANIFEST), JSON.stringify({ ...made.manifest, bytes: packed.length, sha256: sum(packed), db_bytes: bytes.length, db_sha256: sum(bytes) }));
  return made.dir;
}

describe("hostile decks", () => {
  test("a deck whose words is a view over an endless query is refused at once and never read", async () => {
    const home = join(ROOT, "h-view");
    const dir = hostile(join(ROOT, "view"), "de", (db) => {
      db.exec("alter table words rename to real_words");
      db.exec("create view words as with recursive spin(n) as (select 1 union all select n + 1 from spin) select n as id, 'x' as surface, 'x' as folded, '' as ipa, 'noun' as pos, 'x' as meaning, 'x' as head, 'f' as tier, 'word' as kind, 0 as shared, '' as translations, '' as etymology from spin");
    });
    const t0 = performance.now();
    const said = await refusal(() => installDeck(home, dir));
    expect(performance.now() - t0).toBeLessThan(2000);
    expect(said).toContain("which a words deck does not have");
    expect(listInstalled(home)).toEqual([]);
    expect(brokenDecks(home)).toEqual([]);
  });

  test("a trigger, an extra table, an extra index, a changed column and a swapped search table are each refused", async () => {
    const home = join(ROOT, "h-objects");
    const cases: [string, (db: Database) => void, string][] = [
      ["trigger", (db) => db.exec("create trigger t after insert on meta begin select 1; end"), "holds a trigger"],
      ["table", (db) => db.exec("create table extra(x)"), "holds a table"],
      ["index", (db) => db.exec("create index words_pos on words(pos)"), "holds a index"],
      ["view", (db) => db.exec("create view v as select 1"), "holds a view"],
      ["column", (db) => db.exec("alter table words add column note text generated always as (surface || ipa) virtual"), "defines words in a way"],
      ["fts", (db) => (db.exec("drop table words_fts"), db.exec("create virtual table words_fts using fts5(surface, folded, meaning)")), "words_fts"],
      ["missing", (db) => db.exec("drop index words_head"), "lacks words_head"],
    ];
    for (const [name, build, want] of cases) expect(await refusal(() => installDeck(home, hostile(join(ROOT, `obj-${name}`), "de", build)))).toContain(want);
    expect(listInstalled(home)).toEqual([]);
  });

  test("a deck file swapped after install is refused when it is opened, and the bundled words stay", async () => {
    const home = join(ROOT, "h-swapped");
    await installDeck(home, DE.dir);
    const db = new Database(join(decksDir(home), "polingual-de", DECK_DB));
    db.exec("create view sneaky as select 1");
    db.close();
    const said: string[] = [];
    const book = wordBookFor(PACK, home, { onError: (m) => said.push(m) });
    expect(book.words("de").length).toBe(BASE.words("de").length);
    expect(said.length).toBe(1);
    expect(said[0]).toContain("run bkt doctor");
    expect(searchWords(book, book.files, "Tisch", { lang: "de", onError: (m) => said.push(m) }).hits.every((h) => h.deck === "bundled")).toBe(true);
    expect(said.length).toBe(2);
    book.close();
  });

  test("a link is refused at every level: the folder, the manifest, the deck file, the data folder and an installed deck", async () => {
    const home = join(ROOT, "h-links");
    const real = buildDeck(join(ROOT, "link-real"), "de", "German", GERMAN);
    symlinkSync(real.dir, join(ROOT, "link-dir"));
    expect(await refusal(() => installDeck(home, join(ROOT, "link-dir")))).toContain("is a link to another place");
    const viaManifest = join(ROOT, "link-manifest");
    mkdirSync(viaManifest);
    symlinkSync(join(real.dir, DECK_MANIFEST), join(viaManifest, DECK_MANIFEST));
    writeFileSync(join(viaManifest, real.manifest.file), readFileSync(real.packed));
    expect(await refusal(() => installDeck(home, viaManifest))).toContain("is a link to another place");
    const viaFile = join(ROOT, "link-file");
    mkdirSync(viaFile);
    writeFileSync(join(viaFile, DECK_MANIFEST), readFileSync(join(real.dir, DECK_MANIFEST)));
    symlinkSync(real.packed, join(viaFile, real.manifest.file));
    expect(await refusal(() => installDeck(home, viaFile))).toContain("is a link to another place");
    expect(await refusal(() => installDeck(home, join(viaFile, real.manifest.file)))).toContain("is a link to another place");
    expect(listInstalled(home)).toEqual([]);

    const linkedRoot = join(ROOT, "h-linked-root");
    mkdirSync(linkedRoot);
    mkdirSync(join(ROOT, "elsewhere"));
    symlinkSync(join(ROOT, "elsewhere"), decksDir(linkedRoot));
    expect(await refusal(() => installDeck(linkedRoot, real.dir))).toContain("is a link to another place");
    expect(readdirSync(join(ROOT, "elsewhere"))).toEqual([]);

    const linkedDeck = join(ROOT, "h-linked-deck");
    mkdirSync(decksDir(linkedDeck), { recursive: true });
    symlinkSync(join(ROOT, "elsewhere"), join(decksDir(linkedDeck), "polingual-de"));
    expect(await refusal(() => installDeck(linkedDeck, real.dir))).toContain("is a link to another place");

    await installDeck(home, real.dir);
    const placed = join(decksDir(home), "polingual-de");
    renameSync(placed, join(ROOT, "moved-deck"));
    symlinkSync(join(ROOT, "moved-deck"), placed);
    expect(listInstalled(home)).toEqual([]);
    expect(listAvailable(ROOT).map((a) => a.path)).not.toContain(join(ROOT, "link-dir"));
  });

  test("declared sizes and card counts over the limits are refused before any byte is read, and so is a full data folder", async () => {
    expect(MAX_DECK_FILE_BYTES).toBeGreaterThan(82_443_747 * 2);
    expect(MAX_DECK_DB_BYTES).toBeGreaterThan(294_305_792 * 2);
    expect(MAX_DECK_CARDS).toBeGreaterThan(1_199_990 * 2);
    expect(MAX_INSTALLED_BYTES).toBeGreaterThan(1_819_004_928 * 2);
    expect(() => checkManifest({ ...DE.manifest, bytes: MAX_DECK_FILE_BYTES + 1 })).toThrow("Bucket takes deck files up to 256.0 MB");
    expect(() => checkManifest({ ...DE.manifest, db_bytes: MAX_DECK_DB_BYTES + 1 })).toThrow("Bucket takes decks up to 1.0 GB");
    expect(() => checkManifest({ ...DE.manifest, counts: { cards: MAX_DECK_CARDS + 1 } })).toThrow("Bucket takes decks up to 5000000");
    const home = join(ROOT, "h-full");
    const big = join(decksDir(home), "big-deck");
    mkdirSync(big, { recursive: true });
    writeFileSync(join(big, DECK_DB), "x");
    writeFileSync(join(big, DECK_MANIFEST), JSON.stringify({ ...DE.manifest, id: "big-deck", db_bytes: MAX_DECK_DB_BYTES }));
    for (let i = 0; i < 7; i++) {
      const dir = join(decksDir(home), `big-deck-${i}`);
      mkdirSync(dir);
      writeFileSync(join(dir, DECK_DB), "x");
      writeFileSync(join(dir, DECK_MANIFEST), JSON.stringify({ ...DE.manifest, id: `big-deck-${i}`, db_bytes: MAX_DECK_DB_BYTES }));
    }
    expect(await refusal(() => installDeck(home, DE.dir))).toContain("Remove a deck first.");
    const bomb = buildDeck(join(ROOT, "bomb"), "de", "German", GERMAN);
    writeFileSync(join(bomb.dir, DECK_MANIFEST), JSON.stringify({ ...bomb.manifest, db_bytes: 4096 }));
    expect(await refusal(() => installDeck(join(ROOT, "h-bomb"), bomb.dir))).toContain("unpacks to more than the 4096 bytes");
    expect(readdirSync(decksDir(join(ROOT, "h-bomb")))).toEqual([]);
  });
});

describe("reader", () => {
  test("no deck file is opened until its language is used, and only that one is opened", async () => {
    const book = await installed();
    expect(book.files.map((f) => f.isOpen)).toEqual([false, false, false]);
    expect(book.loaded()).toEqual([]);
    expect(book.languages().length).toBe(PACK.languages.length);
    expect(book.decks(["de"]).map((d) => d.lang)).toEqual(["de"]);
    expect(book.files.map((f) => [f.lang, f.isOpen])).toEqual([["ar", false], ["de", true], ["zh", false]]);
    book.lessons("de");
    book.words("de");
    expect([book.files[1].opens, book.builds, book.loaded()]).toEqual([1, 1, ["de"]]);
    book.concepts(["de", "ar"], 1);
    expect(book.loaded()).toEqual(["ar", "de"]);
    book.close();
    expect(book.files.every((f) => !f.isOpen)).toBe(true);
  });

  test("with 35 decks installed, starting up opens none and stays under 300 ms", async () => {
    const home = join(ROOT, "h-many");
    const codes = [...PACK.languages, "ang", "grc", "got", "non", "egy", "cop", "sux", "akk"].slice(0, 35);
    for (const code of codes) await installDeck(home, buildDeck(join(ROOT, "many"), code, `L ${code}`, GERMAN).dir);
    const t0 = performance.now();
    const book = wordBookFor(PACK, home);
    const decks = book.languages();
    const ms = performance.now() - t0;
    expect(book.files.length).toBe(35);
    expect(decks.length).toBe(PACK.languages.length);
    expect(book.files.some((f) => f.isOpen)).toBe(false);
    expect(ms).toBeLessThan(300);
    book.close();
  }, 60_000);

  test("deck words join the bundled words with no duplicate word, and bundled words stay as they were", async () => {
    const book = await installed();
    for (const lang of ["de", "ar", "zh"]) {
      const cells = book.words(lang);
      const own = BASE.words(lang);
      expect(cells.length).toBeGreaterThan(own.length);
      expect(new Set(cells.map((c) => fold(c.word))).size).toBe(new Set(own.map((c) => fold(c.word))).size + cells.filter((c) => book.fromDeck(c)).length);
      expect(new Set(cells.map((c) => c.ref)).size).toBe(cells.length);
      expect(cells.slice(0, own.length).map((c) => c.ref)).toEqual(own.map((c) => c.ref));
    }
    const held = book.words("de").filter((c) => fold(c.word) === fold(HELD.word));
    expect(held.every((c) => !book.fromDeck(c))).toBe(true);
    expect(held.length).toBe(BASE.words("de").filter((c) => fold(c.word) === fold(HELD.word)).length);
    expect(book.words("de").filter((c) => book.fromDeck(c)).map((c) => c.word)).toEqual(fresh("de", GERMAN).map((w) => w[0]));
    book.close();
  });

  test("inflected forms, phrases, names and overlong words stay out of lessons", async () => {
    const book = await installed();
    const words = book.words("de").filter((c) => book.fromDeck(c)).map((c) => c.word);
    for (const out of ["Tische", "Zimmer frei", "Berlin", "Gebäudereinigungsunternehmensverwaltungsangestellter"]) expect(words).not.toContain(out);
    expect(lessonWord("de", row(["Tische", "", "noun", "plural of Tisch"], 0))).toBeNull();
    const ok = lessonWord("de", row(["laufen", "/ˈlaʊ̯fn̩/", "verb", "to run (move fast) · to work (of a machine) · to flow"], 0))!;
    expect([ok.short, ok.quiz, ok.ipa, ok.meaning, ok.senses, ok.concept, ok.strict]).toEqual(["to run", true, "ˈlaʊ̯fn̩", "to run (move fast)", ["to work (of a machine)", "to flow"], undefined, undefined]);
    const long = lessonWord("de", row(["Ding", "", "noun", "a thing that is far too long to fit on a quiz option without breaking the limits"], 0))!;
    expect([long.short, long.quiz]).toEqual([undefined, undefined]);
    expect(deckIpa("[mʲizɨ]")).toBe("mʲizɨ");
    book.close();
  });

  test("a deck word takes a concept only when the bundled words know that concept, the part of speech matches and the language lacks it", () => {
    const gap = PACK.languages.flatMap((lang) => Object.keys(PACK.conceptPos).filter((c) => !PACK.words.some((w) => w.lang === lang && w.strict && w.concept === c)).map((c) => ({ lang, c })))[0];
    const lang = gap?.lang ?? "de";
    const concept = gap?.c ?? Object.keys(PACK.conceptPos)[0];
    const pos = PACK.conceptPos[concept];
    const rows = [
      { id: 1, surface: "zzqvorta", folded: "zzqvorta", ipa: "", pos, meaning: `${concept} (the usual word)`, head: concept, shared: 0 },
      { id: 2, surface: "zzqvortb", folded: "zzqvortb", ipa: "", pos, meaning: `${concept}, again`, head: concept, shared: 0 },
      { id: 3, surface: "zzqvortc", folded: "zzqvortc", ipa: "", pos: pos === "noun" ? "verb" : "noun", meaning: "something else", head: Object.keys(PACK.conceptPos).find((c) => PACK.conceptPos[c] === pos && c !== concept)!, shared: 0 },
      { id: 4, surface: "zzqvortd", folded: "zzqvortd", ipa: "", pos, meaning: "a made up thing", head: "notaconcept", shared: 0 },
    ];
    const made = deckLessonWords(PACK, lang, rows);
    expect(made.map((w) => [w.word, w.concept, w.strict])).toEqual(gap ? [["zzqvorta", concept, true], ["zzqvortb", undefined, undefined], ["zzqvortc", undefined, undefined], ["zzqvortd", undefined, undefined]] : made.map((w) => [w.word, undefined, undefined]));
    expect(deckLessonWords(PACK, "ang", rows)).toEqual([]);
    expect(deckLessonWords(PACK, lang, rows, 2).length).toBe(2);
  });

  test("lessons keep their size and the deck words reach lessons, most common first", async () => {
    const book = await installed();
    const all = book.lessons("de");
    expect(all.length).toBeGreaterThan(BASE.lessons("de").length);
    expect(Math.max(...all.map((l) => l.concepts.length))).toBeLessThanOrEqual(LESSON_WORDS);
    expect(all.map((l) => l.n)).toEqual(all.map((_, i) => i + 1));
    const order = all.flatMap((l) => book.lessonCells("de", l.n)).filter((c) => book.fromDeck(c) && !c.strict).map((c) => c.word);
    expect(order).toEqual(fresh("de", GERMAN).map((w) => w[0]).filter((w) => order.includes(w)));
    expect(order.length).toBeGreaterThan(10);
    expect(book.deck("de").words).toBe(book.words("de").length);
    const n = all.find((l) => book.lessonCells("de", l.n).some((c) => book.fromDeck(c)))!.n;
    const page = book.lesson("de", n, ["de", "ar"])!;
    expect(page.words.length).toBeLessThanOrEqual(LESSON_WORDS);
    const i = book.lessonCells("de", n).findIndex((c) => book.fromDeck(c));
    expect(page.words[i].href).toBe(`https://en.wiktionary.org/wiki/${encodeURIComponent(page.words[i].word)}`);
    book.close();
  });

  test("right-to-left and CJK deck words keep their direction, script and marks", async () => {
    const book = await installed();
    const ar = book.view(book.words("ar").find((c) => c.word === "نَافِذَة" && book.fromDeck(c)) ?? book.words("ar").find((c) => book.fromDeck(c))!);
    expect([ar.dir, ar.script, ar.name]).toEqual(["rtl", "arabic", "Arabic"]);
    expect(/[ً-ْ]/.test(ar.word)).toBe(true);
    const zh = book.view(book.words("zh").find((c) => book.fromDeck(c))!);
    expect([zh.dir, zh.script]).toEqual(["ltr", "han"]);
    book.close();
  });
});

describe("quiz", () => {
  test("every question on deck words passes the limits with exactly 3 choices and one answer", async () => {
    const book = await installed();
    let asked = 0;
    for (const lang of ["de", "ar", "zh"]) {
      const cells = book.words(lang).filter((c) => book.fromDeck(c));
      expect(cells.length).toBeGreaterThanOrEqual(5);
      const qs = book.questions(cells, ["de", "ar", "zh"], "seed");
      expect(qs.length).toBeGreaterThanOrEqual(Math.floor(cells.length / 2));
      for (const q of qs) {
        expect(checkLimits(q)).toEqual([]);
        expect(q.choices!.length).toBe(LIMITS.choices);
        expect(new Set(q.choices).size).toBe(LIMITS.choices);
        expect(q.choices!.filter((c) => c === q.answer).length).toBe(1);
        expect(q.type).not.toBe("pair");
        asked++;
      }
    }
    expect(asked).toBeGreaterThan(20);
    book.close();
  });

  test("a lesson quiz on deck words records them for review through the word session", async () => {
    const book = await installed();
    const s = session(book, ["de", "ar"]);
    const n = book.lessons("de").find((l) => book.lessonCells("de", l.n).filter((c) => book.fromDeck(c) && c.quiz).length >= 3)!.n;
    const quiz = s.quiz({ deck: "de", lesson: n });
    expect(quiz.questions.length).toBeGreaterThan(0);
    for (const q of quiz.questions) expect(q.choices!.length).toBe(3);
    const before = s.decks().find((d) => d.lang === "de")!.started;
    s.answer(quiz.questions[0].id, quiz.questions[0].choices![0], 1500);
    expect(s.decks().find((d) => d.lang === "de")!.started).toBe(before + 1);
    book.close();
  });
});

describe("credit", () => {
  test("a deck word carries its own deck's source and licence on questions, lessons, search and lists", async () => {
    const home = join(ROOT, "h-credit");
    const own = buildDeck(join(ROOT, "own-credit"), "de", "German", GERMAN, { source: "Open Word List", licence: "CC0 1.0", curator: "Ada Example", sourceUrl: "https://words.example", wiktionaryUrl: null, licenceUrl: "https://creativecommons.org/publicdomain/zero/1.0/" });
    await installDeck(home, own.dir);
    const book = wordBookFor(PACK, home);
    const cells = book.words("de").filter((c) => book.fromDeck(c));
    const qs = book.questions(cells, ["de"], "s");
    expect(qs.length).toBeGreaterThan(5);
    for (const q of qs) {
      expect(q.sources.map((s) => [s.label, s.href])).toEqual([["Open Word List, CC0 1.0", "https://words.example"]]);
      expect([q.word!.credit, q.word!.href]).toEqual(["Open Word List, CC0 1.0", "https://words.example"]);
      expect(JSON.stringify(q)).not.toContain("Wiktionary");
    }
    const bundledQs = book.questions(book.words("de").filter((c) => !book.fromDeck(c) && c.quiz).slice(0, 6), ["de"], "s");
    for (const q of bundledQs) expect(q.sources[0].label).toContain("Wiktionary");
    expect(book.view(cells[0]).href).toBe("https://words.example");
    expect(book.creditsFor(["de", "ar"])).toEqual([{ deck: "polingual-de", title: "German words", source: "Open Word List", sourceHref: "https://words.example", licence: "CC0 1.0", licenceHref: "https://creativecommons.org/publicdomain/zero/1.0/", curator: "Ada Example" }]);
    expect(book.creditText(["de"])).toEndWith("German words: Open Word List, CC0 1.0, curated by Ada Example.");
    expect(book.creditText(["ar"])).toBe(book.credit.text);
    const found = searchWords(book, book.files, "Löffel", { lang: "de" });
    const hit = found.hits.find((h) => h.deck === "polingual-de")!;
    expect([hit.source, hit.licence, hit.href]).toEqual(["Open Word List", "CC0 1.0", null]);
    expect(found.credits.find((c) => c.deck === "polingual-de")).toMatchObject({ source: "Open Word List", licence: "CC0 1.0", curator: "Ada Example" });
    const mixed = searchWords(book, book.files, HELD.word, { lang: "de" });
    expect(mixed.credits.find((c) => c.deck === "bundled")).toMatchObject({ title: "Words that came with Bucket", licence: "CC-BY-SA 4.0" });
    expect(deckLine(deckRows(home, null)[0])).toContain("Open Word List, CC0 1.0, curated by Ada Example");

    const s = session(book, ["de"]);
    const routes = creditedWordRoutes(wordRoutes(s), () => s, () => book);
    const call = async (path: string) => {
      const url = new URL(path, URL_BASE);
      return (await (await routes[`GET ${url.pathname}`](new Request(url), url)).json()) as { credit: { text: string; also?: { source: string; licence: string }[] } };
    };
    for (const path of ["/local/words/decks", "/local/words/lessons?deck=de", "/local/words/lesson?deck=de&n=1", "/local/words/concepts?page=1"]) {
      const body = await call(path);
      expect(body.credit.text).toContain("Wiktionary via Kaikki");
      expect(body.credit.also!.map((c) => [c.source, c.licence])).toEqual([["Open Word List", "CC0 1.0"]]);
    }
    const plain = session(book, ["fr"]);
    const none = creditedWordRoutes(wordRoutes(plain), () => plain, () => book);
    const url = new URL("/local/words/decks", URL_BASE);
    expect(((await (await none["GET /local/words/decks"](new Request(url), url)).json()) as { credit: { also?: unknown } }).credit.also).toBeUndefined();
    book.close();
  });
});

describe("word search", () => {
  test("finds a word by its form or its meaning across installed decks, exact form first", async () => {
    const book = await installed();
    const byMeaning = searchWords(book, book.files, "window");
    for (const w of ["Fenster", "نَافِذَة", "窗户"]) expect(byMeaning.hits.map((h) => h.word)).toContain(w);
    expect(byMeaning.credits.length).toBeGreaterThan(0);
    expect(byMeaning.words).toBeGreaterThan(GERMAN.length + ARABIC.length);
    const byForm = searchWords(book, book.files, "Tisch");
    expect(fold(byForm.hits[0].word)).toBe("tisch");
    const prefix = searchWords(book, book.files, "schl", { lang: "de" }).hits.map((h) => h.word);
    expect(prefix).toContain("Schlüssel");
    expect(prefix.every((w) => fold(w).startsWith("schl"))).toBe(true);
    expect(searchWords(book, book.files, "brucke").hits[0].word).toBe("Brücke");
    const arabic = searchWords(book, book.files, "school", { lang: "Arabic" }).hits;
    expect(arabic.map((h) => h.word)).toContain("مَدْرَسَة");
    expect(arabic.every((h) => h.lang === "ar")).toBe(true);
    expect(searchWords(book, book.files, "school", { lang: "zh" }).hits.map((h) => h.word)).toContain("学校");
    expect(searchWords(book, book.files, "window", { limit: 2 }).hits.length).toBe(2);
    expect(book.loaded()).toEqual([]);
    book.close();
  });

  test("right-to-left words match with or without their marks, and CJK words match by prefix", async () => {
    const book = await installed();
    const bare = searchWords(book, book.files, "كتاب", { lang: "ar" }).hits.find((h) => h.deck === "polingual-ar")!;
    expect([bare.word, bare.dir, bare.script, bare.lang]).toEqual(["كِتَاب", "rtl", "arabic", "ar"]);
    expect(searchWords(book, book.files, "كِتَاب", { lang: "ar" }).hits.map((h) => h.word)).toContain("كِتَاب");
    const han = searchWords(book, book.files, "学", { lang: "zh" }).hits.find((h) => h.word === "学校")!;
    expect([han.dir, han.script, han.ipa]).toEqual(["ltr", "han", "ɕɥɛ ɕjɑʊ̯"]);
    expect(wordHitLine(han)).toBe("Chinese  学校  /ɕɥɛ ɕjɑʊ̯/  noun  school");
    book.close();
  });

  test("a language Bucket has no name for is searchable and stays out of lessons", async () => {
    const home = join(ROOT, "h-old");
    await installDeck(home, buildDeck(join(ROOT, "old"), "ang", "Old English", [["wæter", "/ˈwæ.ter/", "noun", "water"], ["hūs", "/huːs/", "noun", "house"]]).dir);
    const book = wordBookFor(PACK, home);
    expect(book.languages()).not.toContain("ang");
    expect(searchWords(book, book.files, "wæter").hits.filter((h) => h.lang === "ang").map((h) => [h.name, h.word])).toEqual([["Old English", "wæter"]]);
    book.close();
  });

  test("odd input never reaches the index as syntax, and a common word reads a bounded number of rows", async () => {
    const book = await installed();
    for (const odd of ['"', "*", "a OR b)", "NEAR(", "surface:tisch", "tisch*", "-tisch", "^tisch", "{surface}:x", "   ", "x".repeat(500), "col:umn", "-"]) expect(Array.isArray(searchWords(book, book.files, odd).hits)).toBe(true);
    expect(searchWords(book, book.files, "surface:tisch", { lang: "de" }).hits).toEqual([]);
    expect(searchTokens('"wa*ter" OR')).toEqual(["wa", "ter", "or"]);
    expect(SEARCH_ROW_CAP).toBeLessThanOrEqual(5000);
    const home = join(ROOT, "h-wide");
    const many: FixtureWord[] = Array.from({ length: 12000 }, (_, i) => [`wort${i}`, "", "noun", `thing number ${i}`]);
    await installDeck(home, buildDeck(join(ROOT, "wide"), "de", "German", many).dir);
    const wide = wordBookFor(PACK, home);
    const t0 = performance.now();
    const hits = wide.files[0].search("thing", 50);
    expect(performance.now() - t0).toBeLessThan(2000);
    expect(hits.map((h) => h.surface).slice(0, 3)).toEqual(["wort0", "wort1", "wort2"]);
    expect(wide.files[0].search("thing", 9999).length).toBe(50);
    expect(Array.from(wide.files[0].top(10 ** 9)).length).toBe(12000);
    wide.close();
    book.close();
  }, 60_000);
});

describe("routes", () => {
  test("the deck list names each deck's own source and licence, and the search carries credits", async () => {
    const book = await installed();
    const routes = deckRoutes({ home: HOME, book: () => book });
    const taken = Object.keys({ ...wordRoutes(session(book, ["de"])), "GET /local/decks": true, "GET /local/settings": true });
    for (const key of Object.keys(routes)) expect(taken).not.toContain(key);
    const call = async (path: string) => {
      const url = new URL(path, URL_BASE);
      const r = await routes[`GET ${url.pathname}`](new Request(url), url);
      return { status: r.status, body: (await r.json()) as Record<string, unknown> };
    };
    const body = (await call("/local/deck-files")).body as unknown as DecksBody;
    expect(body.decks.map((d) => [d.languageName, d.cards, d.installed])).toEqual([
      ["Arabic", ARABIC.length, true],
      ["German", GERMAN_DECK.length, true],
      ["Chinese", CHINESE.length, true],
    ]);
    expect(body.decks.every((d) => d.licence === FIXTURE_LICENCE && d.source === FIXTURE_SOURCE && d.curator === "Bucket Foundation")).toBe(true);
    const found = await call("/local/words/search?q=garden&n=2");
    expect((found.body.hits as unknown[]).length).toBe(2);
    expect((found.body.credits as { licence: string }[]).every((c) => c.licence.length > 0)).toBe(true);
    expect((await call("/local/words/search?q=")).status).toBe(400);
    expect((await call("/local/words/search")).body.error).toBe(SEARCH_NEEDS_WORDS);
    expect(((await call("/local/words/search?q=garden&lang=de")).body.hits as { word: string }[]).map((h) => h.word)).toContain("Garten");
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
    expect(CLI_COMMANDS.filter((c) => c.name.startsWith("decks ")).length).toBe(4);
  });

  test("search --words takes a language and refuses the canon-only flags", () => {
    const run = resolve(["search", "--words", "water", "--lang", "German", "--limit", "5"]);
    expect(run.kind === "run" && [run.values.words, run.values.lang, run.positionals]).toEqual([true, "German", ["water"]]);
    expect(() => resolve(["search", "--words", "water", "--tsv"])).toThrow("--words takes --limit, --lang and --json");
    expect(() => resolve(["search", "water", "--lang", "de"])).toThrow("--lang goes with --words");
  });

  test("the script shapes keep each deck's licence and the credits", async () => {
    const book = await installed();
    const line = JSON.parse(jsonLine("decks list", { decks: deckRows(HOME, null) })) as { v: number; decks: { licence: string; source: string }[] };
    expect([line.v, line.decks.length, line.decks[0].licence, line.decks[0].source]).toEqual([1, 3, FIXTURE_LICENCE, FIXTURE_SOURCE]);
    const out = JSON.parse(jsonLine("search words", searchWords(book, book.files, "key"))) as { hits: { word: string; licence: string }[]; credits: { licence: string; title: string }[] };
    expect(out.hits.length).toBeGreaterThanOrEqual(3);
    expect(out.hits.every((h) => h.licence.length > 0)).toBe(true);
    expect(out.credits.length).toBeGreaterThan(0);
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
      "Wiktionary via Kaikki (kaikki.org), CC-BY-SA 4.0, curated by Bucket Foundation.",
      "Restart Bucket to see it in Learn.",
    ]);
    expect(existsSync(join(home, "bkt.db"))).toBe(false);
    expect(bkt("decks", "install", ZH.packed, "--json").out).toContain('"id":"polingual-zh"');

    const list = bkt("decks", "list", SRC);
    expect(list.code).toBe(0);
    const lines = list.out.trimEnd().split("\n");
    expect(lines.length).toBe(3);
    expect(lines[0]).toStartWith("installed  polingual-ar");
    expect(lines[2]).toStartWith("available  polingual-de");
    expect(lines.every((l) => l.includes("Wiktionary via Kaikki (kaikki.org), CC-BY-SA 4.0, curated by Bucket Foundation"))).toBe(true);
    expect(bkt("words", "list").out).toBe(bkt("decks", "list").out);

    const found = bkt("search", "--words", "كتاب");
    expect(found.code).toBe(0);
    expect(found.out.split("\n")[0]).toBe("Arabic  كِتَاب  /ki.taːb/  noun  book");
    expect(found.out).toContain("Arabic words: Wiktionary via Kaikki (kaikki.org), CC-BY-SA 4.0, curated by Bucket Foundation.");
    const han = JSON.parse(bkt("search", "--words", "学", "--lang", "zh", "--json").out) as { v: number; hits: { word: string; dir: string }[]; credits: { licence: string }[]; words: number };
    expect([han.v, han.hits[0].word, han.hits[0].dir]).toEqual([1, "学校", "ltr"]);
    expect(han.credits.map((c) => c.licence)).toContain("CC-BY-SA 4.0");
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
    expect([m.id, m.title, m.kind, m.licence, m.curator, m.counts.cards]).toEqual(["polingual-es", "Spanish words", "words", "CC-BY-SA 4.0", "Bucket Foundation", 7]);
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
