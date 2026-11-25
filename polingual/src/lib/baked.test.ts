import assert from "node:assert/strict";
import { test } from "node:test";
import { bakedGet, bakedSearch, bakedStats, toPhoton } from "./baked";

test("toPhoton reads freq_rank from an 8-column row and null from a 7-column row", () => {
  const eight = toPhoton(["photon:word:es:perro", "es", "perro", "dog", "noun", null, "functional", 1126]);
  assert.equal(eight.freq_rank, 1126);
  const seven = toPhoton(["photon:word:la:aqua", "la", "aqua", "water", "noun", null, "functional"]);
  assert.equal(seven.freq_rank, null);
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
