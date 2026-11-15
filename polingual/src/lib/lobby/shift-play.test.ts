import assert from "node:assert/strict";
import { test } from "node:test";
import { centerWord, hintFor, letterAt, revealOne, rotate } from "./shift-play";

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

test("letterAt wraps the offset both ways", () => {
  const col = ["A", "B", "C"];
  assert.equal(letterAt(col, 0), "A");
  assert.equal(letterAt(col, 4), "B");
  assert.equal(letterAt(col, -1), "C");
});

test("revealOne opens one more letter of the first unfinished target", () => {
  const targets = [{ form: "ab" }, { form: "cd" }];
  assert.deepEqual(revealOne(targets, {}), { ab: 1 });
  assert.deepEqual(revealOne(targets, { ab: 2 }), { ab: 2, cd: 1 });
  const done = { ab: 2, cd: 2 };
  assert.equal(revealOne(targets, done), done);
});
