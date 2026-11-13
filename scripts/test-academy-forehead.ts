import test from "node:test";
import assert from "node:assert/strict";
import { foreheadDeck, foreheadLangs, foreheadSeed } from "../src/lib/academy/forehead";

const items = Array.from({ length: 120 }, (_, n) => ({ id: `w${n}`, kind: "word", category: "food", gloss: `en${n}`, forms: { en: `en${n}`, es: `es${n}`, fr: `fr${n}` }, readings: {} })) as any[];

test("forehead decks are seeded, unique and drawn from the chosen languages", () => {
  const a = foreheadDeck(items, ["es", "fr"], "9");
  assert.equal(a.length, 60);
  assert.deepEqual(foreheadDeck(items, ["es", "fr"], "9"), a);
  assert.notDeepEqual(foreheadDeck(items, ["es", "fr"], "10"), a);
  assert.equal(new Set(a.map((c) => c.meaning)).size, 60);
  assert.ok(a.every((c) => ["es", "fr"].includes(c.lang) && items.find((i) => i.id === c.itemId).forms[c.lang] === c.form));
  assert.ok(new Set(a.map((c) => c.lang)).size === 2);
});

test("query validation", () => {
  assert.deepEqual(foreheadLangs("es,fr,es"), ["es", "fr"]);
  assert.equal(foreheadLangs("xx"), null);
  assert.equal(foreheadLangs(""), null);
  assert.equal(foreheadSeed("12"), "12");
  assert.equal(foreheadSeed("0"), null);
  assert.equal(foreheadSeed("abc"), null);
});
