import assert from "node:assert/strict";
import { test } from "node:test";
import { cardFit, secondsUntil, toggleLang } from "./forehead-play";

test("toggleLang adds and removes a language and stops at six", () => {
  assert.deepEqual(toggleLang(["es"], "fr"), ["es", "fr"]);
  assert.deepEqual(toggleLang(["es", "fr"], "es"), ["fr"]);
  const six = ["a", "b", "c", "d", "e", "f"];
  assert.deepEqual(toggleLang(six, "g"), six);
});

test("secondsUntil rounds up and never goes below zero", () => {
  assert.equal(secondsUntil(10_000, 8_100), 2);
  assert.equal(secondsUntil(10_000, 12_000), 0);
});

test("cardFit sizes by the longest word plus one, at least four", () => {
  assert.equal(cardFit("sol"), 4);
  assert.equal(cardFit("buenos días"), 7);
});
