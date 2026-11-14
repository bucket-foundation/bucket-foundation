import { test } from "node:test";
import assert from "node:assert/strict";
import { secondsLeft } from "./clock";

test("seconds left counts up to the deadline and never below zero", () => {
  assert.equal(secondsLeft(null, 0, 60), 60);
  assert.equal(secondsLeft(10_000, 0, 60), 10);
  assert.equal(secondsLeft(10_000, 9_001, 60), 1);
  assert.equal(secondsLeft(10_000, 12_000, 60), 0);
});
