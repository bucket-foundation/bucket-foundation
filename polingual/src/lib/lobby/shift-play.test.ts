import assert from "node:assert/strict";
import { test } from "node:test";
import { centerWord, hintFor, rotate } from "./shift-play";

test("the center row reads one letter per column and wraps both ways", () => {
  const cols = [["c", "g"], ["a", "o"], ["s", "t"], ["a", "o"]];
  assert.equal(centerWord(cols, [0, 0, 0, 0]), "casa");
  assert.equal(centerWord(cols, rotate([0, 0, 0, 0], 0, 1)), "gasa");
  assert.equal(centerWord(cols, [-1, 1, 1, 1]), "goto");
});

test("hints reveal letters from the start", () => {
  assert.equal(hintFor("gato", 0), "_ _ _ _");
  assert.equal(hintFor("gato", 2), "g a _ _");
});
