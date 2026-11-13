import test from "node:test";
import assert from "node:assert/strict";
import { babelLevel, babelMeanings } from "../src/lib/academy/babel";

const items = Array.from({ length: 60 }, (_, n) => ({ id: `w${n}`, kind: "word", category: "food", gloss: `en${n}`, forms: { en: `en${n}`, es: n % 9 ? `es${n}` : `x${n}`, fr: n % 9 ? `fr${n}` : `x${n}`, de: `de${n}` } })) as any[];

test("levels draw five distinct meanings with a form in every chosen language", () => {
  const a = babelMeanings(items, ["es", "fr", "de"], 1);
  assert.equal(a.length, 5);
  assert.deepEqual(babelMeanings(items, ["es", "fr", "de"], 1), a);
  assert.notDeepEqual(babelMeanings(items, ["es", "fr", "de"], 2), a);
  for (const m of a) {
    assert.equal(new Set(Object.values(m.forms)).size, 3);
    assert.deepEqual(Object.keys(m.forms), ["es", "fr", "de"]);
  }
});

test("level parsing", () => {
  assert.equal(babelLevel("3"), 3);
  assert.equal(babelLevel("0"), null);
  assert.equal(babelLevel("x"), null);
});
