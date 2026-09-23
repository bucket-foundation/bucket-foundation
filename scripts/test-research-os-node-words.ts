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

test("a root below the threshold is withheld while the word stays, and an uncertain root is marked", () => {
  const base = { root_lang: "la", root_form: "meum", root_gloss: "an umbelliferous plant", chain: [{ lang: "la", form: "meum", rel: "inh", gloss: "" }] };
  const hidden = toNodeWord(row("fr", "mien", { ...base, root_confidence: 0.4 }));
  assert.deepEqual([hidden.rootForm, hidden.rootGloss, hidden.rootLang, hidden.chain.length, hidden.confidence], [null, null, null, 0, 0.95]);
  assert.equal(shownWords([hidden]).length, 1);
  const unsure = toNodeWord(row("he", "אובד", { root_lang: "he", root_form: "א־ב־ד", root_gloss: "perish", root_confidence: "0.7", root_source: "oshb" }));
  assert.deepEqual([unsure.rootForm, unsure.rootUncertain, unsure.rootSource], ["א־ב־ד", true, "oshb"]);
  const legacy = toNodeWord(row("de", "Kerze", { root_lang: "la", root_form: "cēra", root_gloss: "wax" }));
  assert.deepEqual([legacy.rootForm, legacy.rootConfidence, legacy.rootUncertain], ["cēra", 0.95, false]);
});

const verses = { corpus: "Hebrew Bible", source: "Original work of the Open Scriptures Hebrew Bible available at https://github.com/openscriptures/morphhb", count: 179, samples: [{ ref: "Genesis 1:3", text: "יְהִי אוֹר" }] };

test("Hebrew Bible verses ride on a shown root and carry the uncertain label below 0.75", async () => {
  const { rootTextLine, rootTextUncertain } = await import("../src/lib/research-os/node-words");
  const sure = toNodeWord(row("he", "אוֹר", { root_lang: "he", root_form: "א־ו־ר", root_confidence: 0.8, root_texts: [verses] }));
  assert.equal(sure.rootTexts.length, 1);
  assert.equal(rootTextLine(sure.rootTexts[0]), "In the Hebrew Bible: 179 verses carry this root.");
  assert.equal(rootTextUncertain(sure.rootTexts[0], sure), false);
  const shaky = toNodeWord(row("he", "אוֹר", { root_lang: "he", root_form: "א־ו־ר", root_confidence: 0.7, root_texts: [verses] }));
  assert.equal(rootTextUncertain(shaky.rootTexts[0], shaky), true);
  const hidden = toNodeWord(row("he", "אוֹר", { root_lang: "he", root_form: "א־ו־ר", root_confidence: 0.4, root_texts: [verses] }));
  assert.deepEqual(hidden.rootTexts, []);
  const quran = { corpus: "Quran", source: "Tanzil", count: 1, samples: [{ ref: "24:35", text: "نور" }] };
  const ar = toNodeWord(row("ar", "نور", { confidence: 0.6, root_texts: [quran] }));
  assert.equal(ar.rootTexts.length, 1);
  assert.equal(rootTextLine(ar.rootTexts[0]), "In the Quran: 1 verse carries this word.");
  assert.equal(rootTextUncertain(ar.rootTexts[0], ar), false);
});

test("the OSHB credit quotes morphhb's license word for word", async () => {
  const { OSHB_ATTRIBUTION } = await import("../src/lib/research-os/node-words");
  assert.equal(OSHB_ATTRIBUTION.text, "Original work of the Open Scriptures Hebrew Bible available at https://github.com/openscriptures/morphhb");
  assert.equal(OSHB_ATTRIBUTION.href, "https://github.com/openscriptures/morphhb");
  assert.match(OSHB_ATTRIBUTION.wlc, /Westminster Leningrad Codex, which is in the public domain/);
});
