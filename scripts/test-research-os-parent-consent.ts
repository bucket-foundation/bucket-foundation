import test from "node:test";
import assert from "node:assert/strict";
import { signParentToken, verifyParentToken, DECIDE_TTL_MS } from "../src/lib/research-os/parent-consent";
import { summariesForGroup } from "../src/lib/academy/minor-visibility";
import type { MemberSummary } from "../src/lib/academy/groups";

const SECRET = "test-secret";
const base = { requestId: "req-1", action: "decide" as const, email: "parent@example.com", expiresAt: Date.now() + DECIDE_TTL_MS };

test("a signed token round-trips and hides the email", () => {
  const tok = signParentToken(base, SECRET);
  assert.equal(tok.includes("parent@example.com"), false);
  assert.deepEqual(verifyParentToken(tok, SECRET), base);
});

test("tampered, wrong-secret and expired tokens fail", () => {
  const tok = signParentToken(base, SECRET);
  const [p, s] = tok.split(".");
  const forged = Buffer.from(JSON.stringify({ ...JSON.parse(Buffer.from(p, "base64url").toString()), a: "revoke" })).toString("base64url");
  assert.equal(verifyParentToken(`${forged}.${s}`, SECRET), null);
  assert.equal(verifyParentToken(tok, "other"), null);
  assert.equal(verifyParentToken(tok, SECRET, base.expiresAt + 1), null);
  assert.equal(verifyParentToken("garbage", SECRET), null);
});

const sum = { weekReviews: 5 } as unknown as MemberSummary;
const sums = new Map([["kid", sum], ["adult", sum]]);
const minors = new Map<string, string | null>([["kid", "h-parent"]]);
const owners = new Map([["parent", "h-parent"], ["stranger", "h-other"]]);

test("a consented child shows only in the consenting parent's family group", () => {
  assert.equal(summariesForGroup({ kind: "family", owner_id: "parent" }, sums, minors, owners).has("kid"), true);
  assert.equal(summariesForGroup({ kind: "friends", owner_id: "parent" }, sums, minors, owners).has("kid"), false);
  assert.equal(summariesForGroup({ kind: "family", owner_id: "stranger" }, sums, minors, owners).has("kid"), false);
  assert.equal(summariesForGroup({ kind: "family", owner_id: "stranger" }, sums, minors, owners).has("adult"), true);
});

test("a child without consent shows nowhere", () => {
  const none = new Map<string, string | null>([["kid", null]]);
  assert.equal(summariesForGroup({ kind: "family", owner_id: "parent" }, sums, none, owners).has("kid"), false);
});
