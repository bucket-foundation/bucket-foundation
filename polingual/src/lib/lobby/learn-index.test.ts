import assert from "node:assert/strict";
import test from "node:test";
import { buildLearnIndex, learnEntry, learnHref, LEARN_FALLBACK, rootFor } from "./learn-index";

const index = buildLearnIndex([
  { slug: "hundred", en: "hundred", gloss: "the number 100", forms: [{ lang: "es", word: "cien" }, { lang: "la", word: "centum" }], roots: [{ root: "PIE *ḱm̥tóm", langs: ["es", "la"] }] },
]);

test("learnEntry finds a word by form or by meaning", () => {
  assert.equal(learnEntry(index, "es", "cien")?.slug, "hundred");
  assert.equal(learnEntry(index, "de", "hundert", "Hundred")?.slug, "hundred");
  assert.equal(learnEntry(index, "de", "hund"), null);
  assert.equal(learnEntry(null, "es", "cien"), null);
});

test("rootFor and learnHref link a word to its lesson", () => {
  const e = learnEntry(index, "es", "cien");
  assert.equal(rootFor(e, "es"), "PIE *ḱm̥tóm");
  assert.equal(rootFor(e, "ja"), null);
  assert.equal(learnHref(e), "/word/hundred?from=play");
  assert.equal(learnHref(null), LEARN_FALLBACK);
});
