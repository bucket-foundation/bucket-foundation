import test from "node:test";
import assert from "node:assert/strict";
import { snakeDeck } from "../src/lib/academy/word-snake";

const items = Array.from({ length: 200 }, (_, n) => ({ id: `w${n}`, kind: "word", category: "x", gloss: `en${n}`, forms: { en: `en${n}`, es: `es${n}`, fr: n % 10 ? `fr${n}` : `es${n}`, de: `de${n}` }, readings: {} })) as any[];

test("good words are in the room language and decoys never share a form with them", () => {
  const d = snakeDeck(items, "es", ["fr", "de"], "5");
  assert.equal(d.good.length, 80);
  assert.ok(d.good.every((w) => w.lang === "es"));
  assert.ok(d.decoys.length > 20 && d.decoys.every((w) => w.lang !== "es"));
  const good = new Set(d.good.map((w) => w.form));
  assert.ok(d.decoys.every((w) => !good.has(w.form)));
  assert.deepEqual(snakeDeck(items, "es", ["fr", "de"], "5"), d);
});
