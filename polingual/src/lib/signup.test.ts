import assert from "node:assert/strict";
import { test } from "node:test";
import { LIST_MAX, parseSignup } from "./signup";

test("accepts a valid email and lowercases it", () => {
  const r = parseSignup({ email: "  Ana@Example.COM ", speaks: "es", learning: "ja" });
  assert.ok(r.ok);
  assert.deepEqual(r.signup, { email: "ana@example.com", speaks: "es", learning: "ja" });
  assert.equal(r.suspect, false);
});

test("rejects bad emails and non-object bodies", () => {
  for (const body of [null, "x", 5, {}, { email: "nope" }, { email: "a@b" }, { email: "a b@c.com" }]) {
    assert.equal(parseSignup(body).ok, false);
  }
});

test("flags the honeypot field", () => {
  const r = parseSignup({ email: "a@b.co", website: "http://spam" });
  assert.ok(r.ok && r.suspect);
});

test("strips control characters and caps list length", () => {
  const r = parseSignup({ email: "a@b.co", speaks: "e\u0000n\n\tfr", learning: "x".repeat(LIST_MAX + 50) });
  assert.ok(r.ok);
  assert.equal(r.signup.speaks, "e n fr");
  assert.equal(r.signup.learning.length, LIST_MAX);
});
