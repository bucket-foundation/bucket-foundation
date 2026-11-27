import assert from "node:assert/strict";
import { test } from "node:test";
import { bakedGet, bakedSearch, bakedStats, toPhoton } from "./baked";

test("toPhoton reads rank and derived flag from 7, 8 and 9 column rows", () => {
  const seven = toPhoton(["photon:word:la:aqua", "la", "aqua", "water", "noun", null, "functional"]);
  assert.equal(seven.freq_rank, null);
  assert.equal(seven.freq_derived, false);
  const eight = toPhoton(["photon:word:es:perro", "es", "perro", "dog", "noun", null, "functional", 1126]);
  assert.equal(eight.freq_rank, 1126);
  assert.equal(eight.freq_derived, false);
  const nine = toPhoton(["photon:word:es:año luz", "es", "año luz", "light year", "noun", null, "functional", 812, 1]);
  assert.equal(nine.freq_rank, 812);
  assert.equal(nine.freq_derived, true);
});

test("toPhoton reads the IPA source from 10 column rows", () => {
  const ten = toPhoton(["photon:word:es:perro", "es", "perro", "dog", "noun", "/ˈpero/", "functional", 1126, 0, "epitran"]);
  assert.equal(ten.ipa, "/ˈpero/");
  assert.equal(ten.ipa_source, "epitran");
  assert.equal(toPhoton(["photon:word:la:aqua", "la", "aqua", "water", "noun", null, "functional"]).ipa_source, null);
});

test("toPhoton reads 10 and 11 column rows without shifting rank, source or reading", () => {
  const ten = toPhoton(["photon:word:ja:耳", "ja", "耳", "ear", "noun", "[mʲimʲi]", "functional", 900, 0, "wiktionary"]);
  assert.equal(ten.freq_rank, 900);
  assert.equal(ten.ipa_source, "wiktionary");
  assert.equal(ten.reading, null);
  const eleven = toPhoton(["photon:word:ja:白子", "ja", "白子", "milt", "noun", "[ɕiɾa̠ko̞]", "functional", 41000, 1, "rules", "shirako"]);
  assert.equal(eleven.freq_rank, 41000);
  assert.equal(eleven.freq_derived, true);
  assert.equal(eleven.ipa_source, "rules");
  assert.equal(eleven.reading, "shirako");
});

test("every shipped IPA names its source", () => {
  const rows = bakedSearch("a", { topK: 100 }).results;
  assert.ok(rows.every((p) => (p.ipa ? ["wiktionary", "epitran", "llm", "rules", "jmdict", "cedict"].includes(p.ipa_source ?? "") : p.ipa_source === null)));
});

test("every shipped row carries a 0 or 1 derived flag", () => {
  const derived = bakedSearch("a", { topK: 100 }).results.map((p) => p.freq_derived);
  assert.ok(derived.every((d) => typeof d === "boolean"));
});

test("stats count every row", () => {
  const s = bakedStats();
  assert.ok(s.total > 0);
  assert.equal(Object.values(s.by_lang).reduce((a, b) => a + b, 0), s.total);
});

test("search honors topK and lang", () => {
  const first = bakedSearch("water", { topK: 5 });
  assert.ok(first.n_results > 0 && first.n_results <= 5);
  const lang = first.results[0].lang;
  const scoped = bakedSearch("water", { topK: 50, lang });
  assert.ok(scoped.results.every((r) => r.lang === lang));
});

test("search escapes regex characters in the query", () => {
  assert.doesNotThrow(() => bakedSearch("a.*(b[ c"));
});

test("get returns a stored photon and null for unknown ids", () => {
  const hit = bakedSearch("water", { topK: 1 }).results[0];
  assert.equal(bakedGet(hit.id)?.surface, hit.surface);
  assert.equal(bakedGet("no-such-id"), null);
});
