import assert from "node:assert/strict";
import { test } from "node:test";
import { dayState, distWidth, guessError, rollDay, typeKey, winRate } from "./view";

test("dayState reads won, lost, started, open and locked", () => {
  assert.equal(dayState({ guesses: [], done: true, won: true }, false), "won");
  assert.equal(dayState({ guesses: [], done: true, won: false }, false), "lost");
  assert.equal(dayState({ guesses: ["a"], done: false, won: false }, false), "started");
  assert.equal(dayState(undefined, true), "open");
  assert.equal(dayState(undefined, false), "locked");
});

test("guessError names the problem", () => {
  assert.equal(guessError("short", 5), "Use 5 letters");
  assert.equal(guessError("repeat", 5), "You tried that word");
  assert.equal(guessError("letters", 5), "Letters only");
});

test("rollDay moves to today at midnight unless a game is in progress", () => {
  const none = () => undefined;
  assert.equal(rollDay(null, 10, null, none), 10);
  assert.equal(rollDay(12, 10, null, none), 10);
  assert.equal(rollDay(7, 10, 9, none), 7);
  assert.equal(rollDay(9, 10, 9, none), 10);
  assert.equal(rollDay(9, 10, 9, () => ({ guesses: ["a"], done: false, won: false })), 9);
  assert.equal(rollDay(9, 10, 9, () => ({ guesses: ["a"], done: true, won: false })), 10);
});

test("winRate and distWidth", () => {
  assert.equal(winRate({ played: 0, won: 0 }), 0);
  assert.equal(winRate({ played: 3, won: 2 }), 67);
  assert.equal(distWidth(0, [0, 0]), 8);
  assert.equal(distWidth(2, [1, 4]), 50);
});

test("typeKey maps enter, backspace and accented letters", () => {
  assert.equal(typeKey({ key: "Enter" }), "enter");
  assert.equal(typeKey({ key: "Backspace" }), "back");
  assert.equal(typeKey({ key: "É" }), "e");
  assert.equal(typeKey({ key: "1" }), null);
});
