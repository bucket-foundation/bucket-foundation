import test from "node:test";
import assert from "node:assert/strict";
import { shiftBoard, spellable } from "../src/lib/academy/shift";

const es = ["casa", "gato", "mesa", "pelo", "río", "luna", "sopa", "vaso"];
const fr = ["chat", "lune", "pain", "rose", "port", "mère", "soir", "fête"];
const items = es.map((w, n) => ({ id: `w${n}`, kind: "word", category: "x", gloss: `en${n}`, forms: { en: `en${n}`, es: w, fr: fr[n], it: `x${n}`, pt: `y${n}`, de: `z${n}`, nl: `q${n}`, sv: `k${n}` } })) as any[];

test("the daily board holds three words per language and every target is spellable", () => {
  const b = shiftBoard(items, "2026-11-13");
  assert.ok(b);
  assert.deepEqual(shiftBoard(items, "2026-11-13"), b);
  assert.deepEqual(b!.langs.slice().sort(), ["es", "fr"]);
  assert.equal(b!.targets.length, 6);
  assert.equal(b!.columns.length, 4);
  for (const t of b!.targets) {
    assert.ok(spellable(t.form, b!.columns));
    assert.ok(b!.valid[t.form].includes(t.lang));
  }
  assert.ok(Object.keys(b!.valid).every((w) => spellable(w, b!.columns)));
});

test("spellable checks every column", () => {
  assert.equal(spellable("ab", [["a"], ["b", "c"]]), true);
  assert.equal(spellable("ad", [["a"], ["b", "c"]]), false);
  assert.equal(spellable("abc", [["a"], ["b"]]), false);
});
