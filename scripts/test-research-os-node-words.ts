import test from "node:test";
import assert from "node:assert/strict";
import { HIDE_BELOW, UNCERTAIN_BELOW, langName, orderWords, shownWords, toNodeWord, type NodeWordRow } from "../src/lib/research-os/node-words";

const row = (lang: string, word: string, extra: Partial<NodeWordRow> = {}): NodeWordRow => ({
  lang, word, roman: null, gloss: null, root_lang: null, root_form: null, root_gloss: null,
  chain: [], root_texts: [], en_term: "light", sense: null, confidence: 0.95, source: "Wiktionary via Kaikki.org, CC BY-SA 4.0", ...extra,
});

test("a row becomes a word with language names and a root", () => {
  const w = toNodeWord(row("he", "אוֹר", { roman: "'or", root_lang: "he", root_form: "א־ו־ר", root_gloss: "related to light" }));
  assert.equal(w.langName, "Hebrew");
  assert.equal(w.rootLangName, "Hebrew");
  assert.equal(w.rootForm, "א־ו־ר");
  assert.equal(w.roman, "'or");
});

test("chain and root texts that are not arrays read as empty", () => {
  const w = toNodeWord(row("ar", "نور", { chain: { bad: true }, root_texts: [{ corpus: "Quran", source: "Tanzil", count: 2 }, null] }));
  assert.deepEqual(w.chain, []);
  assert.deepEqual(w.rootTexts, []);
});

test("English and the root-bearing languages come first", () => {
  const words = ["fi", "ar", "en", "de", "he", "zh", "la", "sa"].map((l) => toNodeWord(row(l, l)));
  assert.deepEqual(orderWords(words).map((w) => w.lang), ["en", "he", "ar", "sa", "zh", "la", "fi", "de"]);
});

test("an unknown code reads as itself and a proto language by name", () => {
  assert.equal(langName("xx"), "xx");
  assert.equal(langName("ine-pro"), "Proto-Indo-European");
  assert.equal(langName(null), "");
});

test("rows below the hide line drop out and middle rows are marked uncertain", () => {
  const words = [0.95, 0.7, 0.4].map((c, i) => toNodeWord(row(["en", "he", "ar"][i], "w", { confidence: c })));
  assert.deepEqual(shownWords(words).map((w) => w.lang), ["en", "he"]);
  assert.deepEqual(words.map((w) => w.uncertain), [false, true, true]);
  assert.ok(HIDE_BELOW < UNCERTAIN_BELOW);
});

test("a confidence the database returns as text or not at all reads safely", () => {
  assert.equal(toNodeWord(row("en", "w", { confidence: "0.85" })).confidence, 0.85);
  assert.equal(toNodeWord(row("en", "w", { confidence: null })).confidence, 0);
  assert.equal(toNodeWord(row("en", "w", { confidence: 7 })).confidence, 1);
});
