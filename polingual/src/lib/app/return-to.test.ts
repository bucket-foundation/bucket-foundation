import { test } from "node:test";
import assert from "node:assert/strict";
import { returnTo, signInToSave } from "./return-to";

test("sign-in from a daily result returns to that daily page", () => {
  assert.equal(returnTo(new URL(signInToSave("mini"), "https://x").search), "/play/mini");
  assert.equal(returnTo("?from=daily"), "/play");
  assert.equal(returnTo("?from=daily&game=//evil.com"), "/play");
  assert.equal(returnTo("?game=mini"), null);
  assert.equal(returnTo(""), null);
});
