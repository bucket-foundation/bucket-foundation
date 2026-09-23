import test from "node:test";
import assert from "node:assert/strict";
import { langName, orderWords, toNodeWord, type NodeWordRow } from "../src/lib/research-os/node-words";

const row = (lang: string, word: string, extra: Partial<NodeWordRow> = {}): NodeWordRow => ({
  lang, word, roman: null, gloss: null, root_lang: null, root_form: null, root_gloss: null,
  chain: [], root_texts: [], en_term: "light", sense: null, source: "Wiktionary via Kaikki.org, CC BY-SA 4.0", ...extra,
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
