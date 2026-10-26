import test from "node:test";
import assert from "node:assert/strict";
import { createPublicKey, generateKeyPairSync, verify } from "node:crypto";
import { APPLE_REVOKE_URL, APPLE_TOKEN_URL, appleClientSecret, appleKeyFromEnv, exchangeAppleCode, revokeAppleToken, type AppleTokenDeps, type StoredAppleToken } from "../src/lib/academy/apple-token";
import { deleteAccount } from "../src/lib/academy/delete-account";

const { privateKey } = generateKeyPairSync("ec", { namedCurve: "P-256" });
const PEM = privateKey.export({ type: "pkcs8", format: "pem" }).toString();
const KEY = { teamId: "TEAM", keyId: "KID", privateKey: PEM };

function apple(reply: { ok: boolean; status: number; body?: unknown }, stored: StoredAppleToken | null = null) {
  const calls: { url: string; body: URLSearchParams }[] = [];
  const db = new Map<string, StoredAppleToken>();
  if (stored) db.set("u1", stored);
  const deps: AppleTokenDeps = {
    key: () => KEY,
    nowSeconds: () => 1_760_000_000,
    fetch: async (url, init) => (calls.push({ url, body: new URLSearchParams(init.body) }), { ok: reply.ok, status: reply.status, json: async () => reply.body ?? {} }),
    save: async (id, t) => void db.set(id, t),
    load: async (id) => db.get(id) ?? null,
    remove: async (id) => void db.delete(id),
  };
  return { deps, calls, db };
}

test("client secret is an ES256 JWT for the app's client id that the key verifies", () => {
  const jwt = appleClientSecret(KEY, "com.polingual.app", 100);
  const [h, b, s] = jwt.split(".");
  assert.deepEqual(JSON.parse(Buffer.from(h, "base64url").toString()), { alg: "ES256", kid: "KID" });
  assert.deepEqual(JSON.parse(Buffer.from(b, "base64url").toString()), { iss: "TEAM", iat: 100, exp: 400, aud: "https://appleid.apple.com", sub: "com.polingual.app" });
  assert.ok(verify("sha256", Buffer.from(`${h}.${b}`), { key: createPublicKey(PEM), dsaEncoding: "ieee-p1363" }, Buffer.from(s, "base64url")));
});

test("appleKeyFromEnv needs all three vars and restores escaped newlines", () => {
  assert.equal(appleKeyFromEnv({ APPLE_TEAM_ID: "T", APPLE_KEY_ID: "K" }), null);
  assert.equal(appleKeyFromEnv({ APPLE_TEAM_ID: "T", APPLE_KEY_ID: "K", APPLE_PRIVATE_KEY: "a\\nb" })?.privateKey, "a\nb");
});

test("a successful exchange stores the refresh token with the app's client id", async () => {
  const w = apple({ ok: true, status: 200, body: { refresh_token: "r1", access_token: "x" } });
  assert.deepEqual(await exchangeAppleCode(w.deps, "u1", "polingual", "code1"), { ok: true });
  assert.equal(w.calls[0].url, APPLE_TOKEN_URL);
  assert.equal(w.calls[0].body.get("grant_type"), "authorization_code");
  assert.equal(w.calls[0].body.get("code"), "code1");
  assert.equal(w.calls[0].body.get("client_id"), "com.polingual.app");
  assert.deepEqual(w.db.get("u1"), { clientId: "com.polingual.app", refreshToken: "r1" });
});

test("a failed exchange stores nothing and reports why", async () => {
  const w = apple({ ok: false, status: 400, body: { error: "invalid_grant" } });
  assert.deepEqual(await exchangeAppleCode(w.deps, "u1", "bucket", "bad"), { ok: false, reason: "apple_token_400" });
  assert.equal(w.db.size, 0);
  const missing = apple({ ok: true, status: 200 });
  missing.deps.key = () => null;
  assert.deepEqual(await exchangeAppleCode(missing.deps, "u1", "bucket", "c"), { ok: false, reason: "apple_key_missing" });
  assert.equal(missing.calls.length, 0);
});

test("revoke sends the stored refresh token with the hint, then deletes it", async () => {
  const w = apple({ ok: true, status: 200 }, { clientId: "foundation.bucket.app", refreshToken: "r1" });
  assert.deepEqual(await revokeAppleToken(w.deps, "u1"), { revoked: true });
  assert.equal(w.calls[0].url, APPLE_REVOKE_URL);
  assert.equal(w.calls[0].body.get("token"), "r1");
  assert.equal(w.calls[0].body.get("token_type_hint"), "refresh_token");
  assert.equal(w.calls[0].body.get("client_id"), "foundation.bucket.app");
  assert.equal(w.db.size, 0);
});

test("a user with no stored token makes no Apple call", async () => {
  const w = apple({ ok: true, status: 200 });
  assert.deepEqual(await revokeAppleToken(w.deps, "u1"), { revoked: false, reason: "none_stored" });
  assert.equal(w.calls.length, 0);
});

test("account deletion revokes Apple before deleting rows and the user", async () => {
  const w = apple({ ok: true, status: 200 }, { clientId: "foundation.bucket.app", refreshToken: "r1" });
  const log: string[] = [];
  const r = await deleteAccount(
    {
      getUser: async () => ({ id: "u1", status: null }),
      revokeApple: async (id) => (log.push(`revoke ${(await revokeAppleToken(w.deps, id)).revoked}`), undefined),
      deleteRows: async (t) => (log.push(`rows ${t}`), { failed: false }),
      deleteUser: async () => (log.push("auth"), { status: null }),
    },
    "good",
  );
  assert.deepEqual(r, { status: null });
  assert.equal(log[0], "revoke true");
  assert.equal(log.at(-1), "auth");
  assert.equal(w.calls[0].url, APPLE_REVOKE_URL);
});
