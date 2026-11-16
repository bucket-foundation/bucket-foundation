import test from "node:test";
import assert from "node:assert/strict";
import { deckDate, fallMs, flagTilesDeck, FT_FALL_MIN_MS, FT_FALL_START_MS, ghosts } from "../src/lib/academy/flag-tiles";

const LANGS = ["es", "fr", "de", "it", "pt", "ja"];
function word(n: number): any {
  const forms: Record<string, string> = { en: `en${n}` };
  for (const l of LANGS) forms[l] = `${l}${n}`;
  if (n % 7 === 0) forms.fr = forms.es;
  return { id: `w${n}`, kind: "word", category: "food", gloss: `en${n}`, forms };
}
const items = Array.from({ length: 300 }, (_, i) => word(i));

test("the daily deck is seeded by date with four lanes and no ambiguous words", () => {
  const a = flagTilesDeck(items, "2026-11-13");
  assert.deepEqual(flagTilesDeck(items, "2026-11-13"), a);
  assert.notDeepEqual(flagTilesDeck(items, "2026-11-14").tiles, a.tiles);
  assert.equal(a.langs.length, 4);
  assert.ok(a.tiles.length >= 200);
  for (const t of a.tiles) {
    assert.ok(a.langs.includes(t.lang));
    const item = items.find((i) => i.id === t.itemId);
    assert.equal(item.forms[t.lang], t.form);
    assert.equal(t.meaning, item.forms.en);
    assert.ok(a.langs.every((l) => l === t.lang || item.forms[l] !== t.form));
  }
});

test("speed rises every ten tiles down to a floor", () => {
  assert.equal(fallMs(0), FT_FALL_START_MS);
  assert.equal(fallMs(9), FT_FALL_START_MS);
  assert.ok(fallMs(10) < fallMs(9));
  assert.equal(fallMs(1000), FT_FALL_MIN_MS);
});

test("deck dates accept today and its neighbours only", () => {
  const now = Date.parse("2026-11-13T12:00:00Z");
  assert.equal(deckDate(undefined, now), "2026-11-13");
  assert.equal(deckDate("2026-11-12", now), "2026-11-12");
  assert.equal(deckDate("2026-11-10", now), null);
  assert.equal(deckDate("nope", now), null);
});

test("ghost scores are fixed per day and sorted", () => {
  const g = ghosts("2026-11-13");
  assert.equal(g.length, 5);
  assert.deepEqual(ghosts("2026-11-13"), g);
  assert.ok(g.every((x, i) => i === 0 || g[i - 1].score >= x.score));
});
