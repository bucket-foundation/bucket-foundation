import { test } from "node:test";
import assert from "node:assert/strict";
import { nativeCorpus } from "../daily/fixture";
import { foldForSearch, pickerGroups, pushRecent, readRecent, translate, translateSearch, translateSources } from "./engine";

const corpus = nativeCorpus();

test("folding drops case, accents and edge punctuation", () => {
  assert.equal(foldForSearch("  ¿Número? "), "numero");
  assert.equal(foldForSearch("Hälfte!"), "halfte");
});

test("exact matches rank first and articles are ignored", () => {
  const [hit] = translateSearch(corpus, "la casa", new Set(["es"]), 1);
  assert.ok(hit);
  const [cien] = translateSearch(corpus, "cien", new Set(["es"]), 1);
  assert.deepEqual(cien, { itemId: "hundred", matchedLang: "es", exact: true });
});

test("a word translates into every target that has it", () => {
  const a = translate(corpus, "hundred", ["en"], ["es", "fr", "de"])!;
  assert.equal(a.itemId, "hundred");
  assert.deepEqual(Object.keys(a.rows).sort(), ["de", "es", "fr"]);
  assert.equal(a.rows.es, "cien");
  assert.equal(translate(corpus, "zzzz", ["en"], ["es"]), null);
});

test("sources put my languages first", () => {
  const s = translateSources(corpus, ["fr", "es"]);
  assert.deepEqual(s.slice(0, 2), ["fr", "es"]);
  assert.ok(s.includes("en"));
});

test("the picker groups recent, mine and more and filters by name", () => {
  const mem = new Map<string, string>();
  const st = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v) } as unknown as Storage;
  pushRecent(st, "de");
  pushRecent(st, "ja");
  assert.deepEqual(readRecent(st), ["ja", "de"]);
  const names: Record<string, string> = { en: "English", es: "Spanish", fr: "French", de: "German", ja: "Japanese" };
  const g = pickerGroups(["en", "es", "fr", "de", "ja"], ["es", "de"], readRecent(st), "", (l) => names[l]);
  assert.deepEqual(g, { recent: ["ja", "de"], mine: ["es"], more: ["en", "fr"] });
  assert.deepEqual(pickerGroups(["en", "es", "fr"], [], [], "fren", (l) => names[l]).more, ["fr"]);
});

test("the word page slug list matches the baked words", async () => {
  const { WORD_SLUGS } = await import("./slugs");
  const { WORDS } = await import("../words");
  assert.deepEqual([...WORD_SLUGS].sort(), WORDS.map((w) => w.slug).sort());
});
