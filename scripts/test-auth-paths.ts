/**
 * Pure tests for the site session rules: protected paths, the post-sign-in
 * redirect sanitizer, and handle validation. node:test, no network.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_AFTER_SIGN_IN, isProtectedPath, safeNextPath, signInUrl } from "../src/lib/auth/paths";
import { checkHandle } from "../src/lib/auth/handle";

test("protected paths cover the app and leave the landing public", () => {
  assert.equal(isProtectedPath("/research-os"), false);
  assert.equal(isProtectedPath("/research-os/"), false);
  assert.equal(isProtectedPath("/research-os/home"), true);
  assert.equal(isProtectedPath("/research-os/workspace"), true);
  assert.equal(isProtectedPath("/research-os/workspace/anything"), true);
  assert.equal(isProtectedPath("/research-os/workspaces"), false);
  assert.equal(isProtectedPath("/account"), true);
  assert.equal(isProtectedPath("/canon/signoff"), true);
  assert.equal(isProtectedPath("/canon/search"), false);
  assert.equal(isProtectedPath("/academy"), false);
});

test("safeNextPath keeps same-origin paths and rejects everything else", () => {
  assert.equal(safeNextPath("/research-os/workspace?target=x"), "/research-os/workspace?target=x");
  assert.equal(safeNextPath(null), DEFAULT_AFTER_SIGN_IN);
  assert.equal(safeNextPath(""), DEFAULT_AFTER_SIGN_IN);
  assert.equal(safeNextPath("https://evil.example/x"), DEFAULT_AFTER_SIGN_IN);
  assert.equal(safeNextPath("//evil.example/x"), DEFAULT_AFTER_SIGN_IN);
  assert.equal(safeNextPath("/\\evil.example"), DEFAULT_AFTER_SIGN_IN);
  assert.equal(safeNextPath("javascript:alert(1)"), DEFAULT_AFTER_SIGN_IN);
  assert.equal(safeNextPath("/sign-in?next=/x"), DEFAULT_AFTER_SIGN_IN);
  assert.equal(safeNextPath("/ok" + String.fromCharCode(10) + "x"), DEFAULT_AFTER_SIGN_IN);
});

test("signInUrl encodes the destination and omits the default", () => {
  assert.equal(signInUrl(DEFAULT_AFTER_SIGN_IN), "/sign-in");
  assert.equal(signInUrl("/research-os/class?c=1"), "/sign-in?next=%2Fresearch-os%2Fclass%3Fc%3D1");
  assert.equal(signInUrl("https://evil.example"), "/sign-in");
});

test("checkHandle enforces the app.identities rule", () => {
  assert.deepEqual(checkHandle("Ada-Lovelace"), { ok: true, handle: "ada-lovelace" });
  assert.deepEqual(checkHandle("abc"), { ok: true, handle: "abc" });
  assert.equal(checkHandle("").ok, false);
  assert.equal(checkHandle("ab").ok, false);
  assert.equal(checkHandle("-abc").ok, false);
  assert.equal(checkHandle("abc-").ok, false);
  assert.equal(checkHandle("a--bc").ok, false);
  assert.equal(checkHandle("a".repeat(25)).ok, false);
  assert.equal(checkHandle("with space").ok, false);
  const r = checkHandle("admin");
  assert.equal(r.ok, false);
  if (!r.ok) assert.equal(r.reason, "reserved");
});
