import assert from "node:assert/strict";
import test from "node:test";
import { scriptOf } from "./script";

test("scriptOf names the writing system of a word", () => {
  assert.equal(scriptOf("cien"), "Latin");
  assert.equal(scriptOf("сто"), "Cyrillic");
  assert.equal(scriptOf("ἑκατόν"), "Greek");
  assert.equal(scriptOf("शतम्"), "Devanagari");
  assert.equal(scriptOf("백"), "Hangul");
  assert.equal(scriptOf("百"), "Han");
  assert.equal(scriptOf("מאה"), "Hebrew");
  assert.equal(scriptOf("مئة"), "Arabic");
  assert.equal(scriptOf("123"), "Other");
  assert.equal(scriptOf("重い"), "Kanji and kana");
});
