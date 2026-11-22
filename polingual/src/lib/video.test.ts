import { test } from "node:test";
import assert from "node:assert/strict";
import { activeCue, cleanTitle, clock, defaultLangs, markSeen, progressOf, toggleLang, words } from "./video";

const cues = [
  { start: 1, end: 3, text: { es: "a" } },
  { start: 4, end: 6, text: { es: "b" } },
  { start: 6, end: 9, text: { es: "c" } },
];

test("active cue follows player time and holds through short gaps", () => {
  assert.equal(activeCue(cues, 0.5), -1);
  assert.equal(activeCue(cues, 1), 0);
  assert.equal(activeCue(cues, 3.5), 0);
  assert.equal(activeCue(cues, 6), 2);
  assert.equal(activeCue(cues, 20), -1);
});

test("language picks stay between two and four", () => {
  const v = { source_lang: "es", langs: ["es", "en", "fr", "de", "pt", "it", "ja"] };
  assert.deepEqual(defaultLangs(v), ["es", "en", "fr", "ja"]);
  assert.deepEqual(toggleLang(["es", "en"], "en"), ["es", "en"]);
  assert.deepEqual(toggleLang(["es", "en", "fr"], "fr"), ["es", "en"]);
  assert.deepEqual(toggleLang(["es", "en", "fr", "de"], "ja"), ["en", "fr", "de", "ja"]);
});

test("words split for spaced and unspaced scripts", () => {
  assert.deepEqual(words("Hola, amigo.", "es").filter((w) => w.word).map((w) => w.text), ["Hola", "amigo"]);
  assert.ok(words("少しおなかがすいています", "ja").filter((w) => w.word).length > 1);
});

test("progress counts distinct cues seen", () => {
  let p = markSeen(undefined, 0);
  p = markSeen(p, 0);
  p = markSeen(p, 2);
  assert.equal(progressOf(p, 4), 0.5);
  assert.equal(clock(125), "2:05");
});

test("titles drop hashtags and dashes", () => {
  assert.equal(cleanTitle("En el parque \u2014 Spanish Mini Story (A2) #Learn #Spanish"), "En el parque: Spanish Mini Story (A2)");
});
