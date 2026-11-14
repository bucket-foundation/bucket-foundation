import { test } from "node:test";
import assert from "node:assert/strict";
import { deckRoot } from "@academy/deck-root";
import { flagTilesDeck } from "@academy/flag-tiles";
import { shiftBoard } from "@academy/shift";
import { atlasRounds } from "@academy/voice-atlas";
import { nativeCorpus } from "./daily/fixture";

const items = nativeCorpus().items;
const day = "2026-11-13";

test("the deck root comes from the learner and falls back to English", () => {
  assert.equal(deckRoot("fr", items), "fr");
  assert.equal(deckRoot("xx", items), "en");
  assert.equal(deckRoot(null, items), "en");
  assert.equal(deckRoot("FR", items), "en");
});

test("flag tiles give meanings in a French learner's root and never ask French", () => {
  const deck = flagTilesDeck(items, day, "fr");
  assert.ok(!deck.langs.includes("fr"));
  const t = deck.tiles[0];
  assert.equal(t.meaning, items.find((i) => i.id === t.itemId)!.forms.fr);
});

test("shift and voice atlas carry the root meaning", () => {
  const board = shiftBoard(items, day, "es");
  assert.ok(board);
  for (const t of board!.targets) assert.notEqual(t.lang, "es");
  const rounds = atlasRounds(items, day, 4, "de");
  for (const r of rounds) {
    assert.notEqual(r.lang, "de");
    assert.equal(r.meaning, items.find((i) => i.id === r.itemId)!.forms.de);
  }
});

test("babel, forehead and snake decks take a non-English root and keep English goldens without one", async () => {
  const { babelMeanings } = await import("@academy/babel");
  const { foreheadDeck } = await import("@academy/forehead");
  const { snakeDeck } = await import("@academy/word-snake");
  const fr = babelMeanings(items, ["es", "de", "it"], 1, "fr");
  assert.equal(fr[0].meaning, items.find((i) => i.id === fr[0].id)!.forms.fr);
  assert.deepEqual(babelMeanings(items, ["es", "de", "it"], 1), babelMeanings(items, ["es", "de", "it"], 1, "en"));
  const fh = foreheadDeck(items, ["es", "de"], "42", "de");
  for (const c of fh) assert.notEqual(c.lang, "de");
  const snake = snakeDeck(items, "es", ["fr", "it"], "7", "it");
  assert.ok(snake.decoys.every((d) => d.lang !== "it"));
  assert.deepEqual(snakeDeck(items, "es", ["fr", "it"], "7"), snakeDeck(items, "es", ["fr", "it"], "7", "en"));
});

test("polyword reveals its meaning in the learner's root when the bank has it", async () => {
  const { meaningIn } = await import("./polyword/puzzle");
  const bank = { langs: { es: ["eight"] }, words: { eight: { gloss: "eight", forms: { es: { word: "ocho" }, fr: { word: "huit" } } } } };
  assert.deepEqual(meaningIn(bank, { slug: "eight", gloss: "eight" }, "fr"), { lang: "fr", text: "huit" });
  assert.deepEqual(meaningIn(bank, { slug: "eight", gloss: "eight" }, "ko"), { lang: "en", text: "eight" });
});

test("deck cache urls keep only date and root", async () => {
  const { canonicalDeckUrl } = await import("@academy/deck-root");
  assert.equal(canonicalDeckUrl(new URL("https://x.test/api/academy/shift?utm=1&root=fr&date=2026-11-13&z=2")).search, "?date=2026-11-13&root=fr");
});

test("babel drops the root from its languages and still needs two", async () => {
  const { langsWithoutRoot, hasExtraParams } = await import("@academy/deck-root");
  assert.deepEqual(langsWithoutRoot(["es", "fr", "de"], "fr"), ["es", "de"]);
  assert.equal(langsWithoutRoot(["es", "fr"], "fr"), null);
  assert.equal(langsWithoutRoot(["es", "fr", "de", "it", "pt"], "en"), null);
  assert.equal(hasExtraParams(new URL("https://x.test/a?langs=es&seed=1&root=fr"), ["langs", "seed", "root"]), false);
  assert.equal(hasExtraParams(new URL("https://x.test/a?langs=es&utm=1"), ["langs", "seed", "root"]), true);
});
