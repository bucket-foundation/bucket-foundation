import { test } from "node:test";
import assert from "node:assert/strict";
import type { MiniEntry, MiniPuzzle } from "./mini";
import { miniRight, tapCell, writeAt } from "./mini-play";

const word = { lang: "es", itemId: "x", form: "", gloss: "", root: "en", rank: 0 };
const across: MiniEntry = { word, letters: ["S", "O", "L"], row: 0, col: 0, across: true, number: 1 };
const down: MiniEntry = { word, letters: ["S", "I"], row: 0, col: 0, across: false, number: 1 };
const puzzle: MiniPuzzle = { lang: "es", entries: [across, down], keys: [] };

test("tapCell keeps the active word when the square is in it and moves the cursor there", () => {
  assert.deepEqual(tapCell(puzzle, 0, 0, 2), { active: 0, cursor: 2 });
  assert.deepEqual(tapCell(puzzle, 1, 0, 0), { active: 1, cursor: 0 });
});

test("tapCell switches to the word that holds a square outside the active word", () => {
  assert.deepEqual(tapCell(puzzle, 0, 1, 0), { active: 1, cursor: 1 });
});

test("writeAt fills the square under the cursor", () => {
  assert.deepEqual(writeAt({}, across, 1, "O"), { "0,1": "O" });
});

test("miniRight marks each entry right only when every square matches", () => {
  const fill = { "0,0": "S", "0,1": "O", "0,2": "L", "1,0": "A" };
  assert.deepEqual(miniRight(puzzle, fill), [true, false]);
});
