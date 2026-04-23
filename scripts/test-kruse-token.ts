/**
 * Unit test: mint/verify roundtrip for Kruse access tokens.
 *
 * Run:
 *   npx ts-node scripts/test-kruse-token.ts
 *
 * Uses node:test (built-in, no extra dependency). We set the env vars inline
 * before importing the module so the secret/version/allow-list load correctly.
 */

process.env.BKT_KRUSE_TOKEN_SECRET =
  "test-secret-at-least-32-characters-long-xxxxx";
process.env.BKT_KRUSE_TOKEN_VERSION = "7";
process.env.BKT_KRUSE_ALLOWED_RECIPIENTS = "kruse,alice";

import { strict as assert } from "node:assert";
import { test } from "node:test";
import { mintToken, verifyToken } from "../src/lib/kruse-token";

test("mint+verify roundtrip for allowed recipient", async () => {
  const token = await mintToken("kruse", 60);
  const payload = await verifyToken(token);
  assert.ok(payload, "expected payload");
  assert.equal(payload!.r, "kruse");
  assert.equal(payload!.v, 7);
  assert.ok(payload!.exp > payload!.iat);
});

test("verify rejects garbage", async () => {
  assert.equal(await verifyToken("not-a-jwt"), null);
  assert.equal(await verifyToken(""), null);
});

test("verify rejects recipients not on allow-list", async () => {
  const token = await mintToken("mallory", 60);
  assert.equal(await verifyToken(token), null);
});

test("verify rejects tokens from a prior version", async () => {
  const token = await mintToken("kruse", 60);
  process.env.BKT_KRUSE_TOKEN_VERSION = "8"; // rotate
  assert.equal(await verifyToken(token), null);
  process.env.BKT_KRUSE_TOKEN_VERSION = "7"; // restore for subsequent tests
});

test("verify rejects expired tokens", async () => {
  const token = await mintToken("kruse", 1);
  await new Promise((r) => setTimeout(r, 1200));
  assert.equal(await verifyToken(token), null);
});

test("verify rejects tokens signed with a different secret", async () => {
  const token = await mintToken("kruse", 60);
  process.env.BKT_KRUSE_TOKEN_SECRET =
    "different-secret-also-32-chars-long-xxxxxxx";
  assert.equal(await verifyToken(token), null);
  process.env.BKT_KRUSE_TOKEN_SECRET =
    "test-secret-at-least-32-characters-long-xxxxx";
});
