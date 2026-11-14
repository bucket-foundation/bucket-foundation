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
