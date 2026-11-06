import test from "node:test";
import assert from "node:assert/strict";
import { signParentToken, verifyParentToken, parentApprovalCheck, sameEmail, DECIDE_TTL_MS } from "../src/lib/research-os/parent-consent";
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

test("a child cannot approve their own request", () => {
  const args = { invitedEmail: "parent@example.com", childId: "kid", parentBand: "18plus", declaresAdult: false };
  assert.equal(parentApprovalCheck({ ...args, parent: null }), "sign_in");
  assert.equal(parentApprovalCheck({ ...args, parent: { id: "kid", email: "parent@example.com" } }), "self");
  assert.equal(parentApprovalCheck({ ...args, parent: { id: "p", email: "other@example.com" } }), "wrong_account");
  assert.equal(parentApprovalCheck({ ...args, parent: { id: "p", email: "Parent@Example.com" } }), "ok");
  assert.equal(parentApprovalCheck({ ...args, parentBand: "13to17", parent: { id: "p", email: "parent@example.com" } }), "not_adult");
  assert.equal(parentApprovalCheck({ ...args, parentBand: "under13", declaresAdult: true, parent: { id: "p", email: "parent@example.com" } }), "not_adult");
  assert.equal(parentApprovalCheck({ ...args, parentBand: null, parent: { id: "p", email: "parent@example.com" } }), "declare_adult");
  assert.equal(parentApprovalCheck({ ...args, parentBand: null, declaresAdult: true, parent: { id: "p", email: "parent@example.com" } }), "ok");
  assert.equal(sameEmail(" Kid@x.com", "kid@x.com"), true);
  assert.equal(sameEmail(null, "kid@x.com"), false);
});

const sum = { weekReviews: 5, todayReviews: 2 } as unknown as MemberSummary;
const sums = new Map([["kid", sum], ["adult", sum]]);
const minors = new Map<string, string | null>([["kid", "parent"]]);

test("a consented child shows only in the consenting parent's family group", () => {
  assert.equal(summariesForGroup({ kind: "family", owner_id: "parent" }, sums, minors).has("kid"), true);
  assert.equal(summariesForGroup({ kind: "friends", owner_id: "parent" }, sums, minors).has("kid"), false);
  assert.equal(summariesForGroup({ kind: "family", owner_id: "stranger" }, sums, minors).has("kid"), false);
  assert.equal(summariesForGroup({ kind: "family", owner_id: "stranger" }, sums, minors).has("adult"), true);
});

test("a child without consent shows nowhere, even to the owner", () => {
  const none = new Map<string, string | null>([["kid", null]]);
  assert.equal(summariesForGroup({ kind: "family", owner_id: "parent" }, sums, none).has("kid"), false);
});
