import { test } from "node:test";
import assert from "node:assert/strict";
import { hits, mark, patternWords, pickVariant } from "./pattern";

test("hits counts the ones in a pattern", () => {
  assert.equal(hits(""), 0);
  assert.equal(hits("1011"), 3);
});

test("mark appends a one for right and a zero for wrong", () => {
  assert.equal(mark("1", true), "11");
  assert.equal(mark("1", false), "10");
});

test("patternWords marks each word by its slot and treats missing slots as wrong", () => {
  const w = { lang: "es", itemId: "a", form: "agua", gloss: "water" };
  assert.deepEqual(patternWords([w, { ...w, itemId: "b" }], "1"), [{ ...w, right: true }, { ...w, itemId: "b", right: false }]);
});

test("pickVariant shows the answer green and the wrong pick red once picked", () => {
  assert.equal(pickVariant(null, "a", "a"), "secondary");
  assert.equal(pickVariant("b", "a", "a"), "success");
  assert.equal(pickVariant("b", "b", "a"), "primary");
  assert.equal(pickVariant("b", "c", "a"), "secondary");
});
