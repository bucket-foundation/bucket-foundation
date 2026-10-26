import test from "node:test";
import assert from "node:assert/strict";
import { createPublicKey, generateKeyPairSync, randomBytes, verify } from "node:crypto";
import {
  APPLE_REVOKE_URL,
  APPLE_TOKEN_URL,
  appleClientSecret,
  appleKeyFromEnv,
  encKeyFromEnv,
  exchangeAppleCode,
  openToken,
  retryPendingRevokes,
  revokeForAccountDelete,
  revokeUserTokens,
  MAX_REVOKE_ATTEMPTS,
  sealToken,
  type AppleTokenDeps,
  type PendingRevoke,
  type StoredAppleToken,
} from "../src/lib/academy/apple-token";
import { deleteAccount } from "../src/lib/academy/delete-account";

const { privateKey } = generateKeyPairSync("ec", { namedCurve: "P-256" });
const PEM = privateKey.export({ type: "pkcs8", format: "pem" }).toString();
const KEY = { teamId: "TEAM", keyId: "KID", privateKey: PEM };
const ENC = randomBytes(32);

type Reply = { ok: boolean; status: number; body?: unknown } | "throw" | "timeout";

function apple(replies: Reply[]) {
  const calls: { url: string; body: URLSearchParams; signal: AbortSignal }[] = [];
  const tokens = new Map<string, StoredAppleToken>();
  const pending: (PendingRevoke & { status: string })[] = [];
  let pendingReads = 0;
  const alerts: string[] = [];
  const logs: string[] = [];
  let nextId = 1;
  const deps: AppleTokenDeps = {
    key: () => KEY,
    encKey: () => ENC,
    timeoutMs: 20,
    alert: (m) => void alerts.push(m),
    nowSeconds: () => 1_760_000_000,
    log: (event, f) => void logs.push(`${event} ${f.ok} ${f.reason ?? ""}`.trim()),
    fetch: async (url, init) => {
      calls.push({ url, body: new URLSearchParams(init.body), signal: init.signal });
      const r = replies.length > 1 ? replies.shift()! : replies[0];
      if (r === "throw") throw new TypeError("network down");
      if (r === "timeout") {
        const hold = setTimeout(() => undefined, 1000);
        return new Promise((_, rej) => init.signal.addEventListener("abort", () => (clearTimeout(hold), rej(init.signal.reason))));
      }
      return { ok: r.ok, status: r.status, json: async () => r.body ?? {} };
    },
    save: async (u, t) => void tokens.set(`${u}|${t.clientId}`, t),
    list: async (u) => Array.from(tokens.entries()).filter(([k]) => k.startsWith(`${u}|`)).map(([, t]) => t),
    remove: async (u, c) => void tokens.delete(`${u}|${c}`),
    addPending: async (t) => void pending.push({ ...t, id: nextId++, attempts: 1, status: "pending" }),
    listPending: async (n) => (pendingReads++, pending.filter((p) => p.status === "pending").slice(0, n)),
    removePending: async (id) => void pending.splice(pending.findIndex((p) => p.id === id), 1),
    bumpPending: async (id, _r, failed) => {
      const p = pending.find((x) => x.id === id)!;
      p.attempts += 1;
      if (failed) p.status = "failed";
    },
  };
  const store = (u: string, clientId: string, refresh: string) => tokens.set(`${u}|${clientId}`, { clientId, sealed: sealToken(ENC, refresh) });
  return { deps, calls, tokens, pending, logs, store, pendingReads: () => pendingReads, alerts };
}

test("client secret is an ES256 JWT for the app's client id that the key verifies", () => {
  const [h, b, s] = appleClientSecret(KEY, "com.polingual.app", 100).split(".");
  assert.deepEqual(JSON.parse(Buffer.from(h, "base64url").toString()), { alg: "ES256", kid: "KID" });
  assert.deepEqual(JSON.parse(Buffer.from(b, "base64url").toString()), { iss: "TEAM", iat: 100, exp: 400, aud: "https://appleid.apple.com", sub: "com.polingual.app" });
  assert.ok(verify("sha256", Buffer.from(`${h}.${b}`), { key: createPublicKey(PEM), dsaEncoding: "ieee-p1363" }, Buffer.from(s, "base64url")));
});

test("env parsing for the Apple key and the 32-byte encryption key", () => {
  assert.equal(appleKeyFromEnv({ APPLE_TEAM_ID: "T", APPLE_KEY_ID: "K" }), null);
  assert.equal(appleKeyFromEnv({ APPLE_TEAM_ID: "T", APPLE_KEY_ID: "K", APPLE_PRIVATE_KEY: "a\\nb" })?.privateKey, "a\nb");
  assert.equal(encKeyFromEnv(undefined), null);
  assert.equal(encKeyFromEnv("c2hvcnQ="), null);
  assert.deepEqual(encKeyFromEnv(ENC.toString("hex")), ENC);
  assert.deepEqual(encKeyFromEnv(ENC.toString("base64")), ENC);
});

test("sealed tokens round-trip, differ per seal, and reject tampering", () => {
  const a = sealToken(ENC, "r1");
  assert.notEqual(a, sealToken(ENC, "r1"));
  assert.ok(!a.includes("r1"));
  assert.equal(openToken(ENC, a), "r1");
  const parts = a.split(".");
  parts[3] = Buffer.from("xx").toString("base64url");
  assert.throws(() => openToken(ENC, parts.join(".")));
  assert.throws(() => openToken(randomBytes(32), a));
});

test("a successful exchange stores the sealed refresh token under the app's client id", async () => {
  const w = apple([{ ok: true, status: 200, body: { refresh_token: "r1" } }]);
  assert.deepEqual(await exchangeAppleCode(w.deps, "u1", "polingual", "code1"), { ok: true, reason: undefined });
  assert.equal(w.calls[0].url, APPLE_TOKEN_URL);
  assert.equal(w.calls[0].body.get("grant_type"), "authorization_code");
  assert.equal(w.calls[0].body.get("client_id"), "com.polingual.app");
  assert.ok(w.calls[0].signal instanceof AbortSignal);
  const saved = w.tokens.get("u1|com.polingual.app")!;
  assert.equal(openToken(ENC, saved.sealed), "r1");
});

test("Bucket and Polingual tokens for one user are stored side by side", async () => {
  const w = apple([{ ok: true, status: 200, body: { refresh_token: "rb" } }, { ok: true, status: 200, body: { refresh_token: "rp" } }]);
  await exchangeAppleCode(w.deps, "u1", "bucket", "c1");
  await exchangeAppleCode(w.deps, "u1", "polingual", "c2");
  assert.deepEqual(Array.from(w.tokens.keys()).sort(), ["u1|com.polingual.app", "u1|foundation.bucket.app"]);
});

for (const [name, reply, reason] of [
  ["http 400", { ok: false, status: 400 }, "http_400"],
  ["fetch throwing", "throw", "fetch_error"],
  ["a timeout", "timeout", "timeout"],
] as const) {
  test(`an exchange that fails with ${name} stores nothing and logs ${reason}`, async () => {
    const w = apple([reply]);
    assert.deepEqual(await exchangeAppleCode(w.deps, "u1", "bucket", "c"), { ok: false, reason });
    assert.equal(w.tokens.size, 0);
    assert.deepEqual(w.logs, [`apple_exchange false ${reason}`]);
  });
}

test("no code, no encryption key, or no Apple key skips the exchange without calling Apple", async () => {
  const w = apple([{ ok: true, status: 200 }]);
  assert.equal((await exchangeAppleCode(w.deps, "u1", "bucket", "")).reason, "no_code");
  w.deps.encKey = () => null;
  assert.equal((await exchangeAppleCode(w.deps, "u1", "bucket", "c")).reason, "enc_key_missing");
  w.deps.encKey = () => ENC;
  w.deps.key = () => null;
  assert.equal((await exchangeAppleCode(w.deps, "u1", "bucket", "c")).reason, "apple_key_missing");
  assert.equal(w.calls.length, 0);
  assert.equal(w.tokens.size, 0);
});

test("revoke sends every stored token for the user with the hint, then removes them", async () => {
  const w = apple([{ ok: true, status: 200 }]);
  w.store("u1", "foundation.bucket.app", "rb");
  w.store("u1", "com.polingual.app", "rp");
  w.store("u2", "foundation.bucket.app", "other");
  assert.deepEqual(await revokeUserTokens(w.deps, "u1"), { revoked: 2, pending: 0 });
  assert.deepEqual(w.calls.map((c) => [c.url, c.body.get("client_id"), c.body.get("token"), c.body.get("token_type_hint")]).sort(), [
    [APPLE_REVOKE_URL, "com.polingual.app", "rp", "refresh_token"],
    [APPLE_REVOKE_URL, "foundation.bucket.app", "rb", "refresh_token"],
  ]);
  assert.deepEqual(Array.from(w.tokens.keys()), ["u2|foundation.bucket.app"]);
});

test("a user with no stored token makes no Apple call", async () => {
  const w = apple([{ ok: true, status: 200 }]);
  assert.deepEqual(await revokeUserTokens(w.deps, "u1"), { revoked: 0, pending: 0 });
  assert.equal(w.calls.length, 0);
});

for (const reply of [{ ok: false, status: 500 }, "throw", "timeout"] as const) {
  test(`a revoke that fails (${typeof reply === "string" ? reply : reply.status}) moves the token to pending, and a retry revokes it`, async () => {
    const w = apple([reply, { ok: true, status: 200 }]);
    w.store("u1", "foundation.bucket.app", "rb");
    assert.deepEqual(await revokeUserTokens(w.deps, "u1"), { revoked: 0, pending: 1 });
    assert.equal(w.tokens.size, 0);
    assert.equal(w.pending.length, 1);
    assert.equal(openToken(ENC, w.pending[0].sealed), "rb");
    assert.deepEqual(await retryPendingRevokes(w.deps), { revoked: 1, failed: 0 });
    assert.equal(w.pending.length, 0);
    assert.equal(w.calls.at(-1)!.body.get("token"), "rb");
  });
}

test("a retry that fails again keeps the pending row and counts the attempt", async () => {
  const w = apple([{ ok: false, status: 503 }]);
  w.store("u1", "foundation.bucket.app", "rb");
  await revokeUserTokens(w.deps, "u1");
  assert.deepEqual(await retryPendingRevokes(w.deps), { revoked: 0, failed: 1 });
  assert.equal(w.pending[0].attempts, 2);
  assert.ok(w.logs.includes("apple_revoke_retry false http_503"));
});

test("account deletion revokes Apple first, and a revoke step that cannot queue holds the delete", async () => {
  const w = apple([{ ok: true, status: 200 }]);
  w.store("u1", "foundation.bucket.app", "rb");
  const log: string[] = [];
  const clients = (revokeApple: (id: string) => Promise<{ failed: boolean }>) => ({
    getUser: async () => ({ id: "u1", status: null }),
    revokeApple,
    deleteRows: async (t: string) => (log.push(`rows ${t}`), { failed: false }),
    deleteUser: async () => (log.push("auth"), { status: null }),
  });
  const ok = await deleteAccount(clients(async (id) => (log.push(`revoke ${(await revokeUserTokens(w.deps, id)).revoked}`), { failed: false })), "good");
  assert.deepEqual(ok, { status: null });
  assert.equal(log[0], "revoke 1");
  assert.equal(log.at(-1), "auth");
  log.length = 0;
  assert.deepEqual(await deleteAccount(clients(async () => ({ failed: true })), "good"), { status: 500 });
  assert.deepEqual(log, []);
});

test("the delete path revokes the user's tokens and never runs the pending retry", async () => {
  const w = apple([{ ok: false, status: 500 }]);
  w.store("u1", "foundation.bucket.app", "rb");
  assert.deepEqual(await revokeForAccountDelete(w.deps, "u1"), { failed: false });
  assert.equal(w.pending.length, 1);
  assert.equal(w.pendingReads(), 0);
  w.deps.addPending = async () => {
    throw new Error("db down");
  };
  w.store("u2", "foundation.bucket.app", "r2");
  assert.deepEqual(await revokeForAccountDelete(w.deps, "u2"), { failed: true });
  assert.equal(w.pendingReads(), 0);
});

test("a pending row is marked failed after five attempts and then skipped", async () => {
  const w = apple([{ ok: false, status: 503 }]);
  w.store("u1", "foundation.bucket.app", "rb");
  await revokeUserTokens(w.deps, "u1");
  for (let i = 1; i < MAX_REVOKE_ATTEMPTS; i++) await retryPendingRevokes(w.deps);
  assert.equal(w.pending[0].attempts, MAX_REVOKE_ATTEMPTS);
  assert.equal(w.pending[0].status, "failed");
  const before = w.calls.length;
  assert.deepEqual(await retryPendingRevokes(w.deps), { revoked: 0, failed: 0 });
  assert.equal(w.calls.length, before);
});

test("invalid_grant from Apple marks the row failed on the first retry", async () => {
  const w = apple([{ ok: false, status: 400, body: { error: "invalid_grant" } }]);
  w.store("u1", "foundation.bucket.app", "rb");
  await revokeUserTokens(w.deps, "u1");
  await retryPendingRevokes(w.deps);
  assert.equal(w.pending[0].status, "failed");
  assert.ok(w.logs.includes("apple_revoke_retry false http_400_invalid_grant"));
});

test("invalid_client keeps rows pending without counting the attempt and alerts once per run", async () => {
  const w = apple([{ ok: false, status: 400, body: { error: "invalid_client" } }]);
  w.store("u1", "foundation.bucket.app", "r1");
  w.store("u2", "com.polingual.app", "r2");
  await revokeUserTokens(w.deps, "u1");
  await revokeUserTokens(w.deps, "u2");
  for (let i = 0; i < MAX_REVOKE_ATTEMPTS + 1; i++) assert.deepEqual(await retryPendingRevokes(w.deps), { revoked: 0, failed: 2 });
  assert.deepEqual(w.pending.map((p) => [p.status, p.attempts]), [["pending", 1], ["pending", 1]]);
  assert.equal(w.alerts.length, MAX_REVOKE_ATTEMPTS + 1);
  assert.match(w.alerts[0], /invalid_client/);
});

test("invalid_grant stays permanent and sends no credential alert", async () => {
  const w = apple([{ ok: false, status: 400, body: { error: "invalid_grant" } }]);
  w.store("u1", "foundation.bucket.app", "r1");
  await revokeUserTokens(w.deps, "u1");
  await retryPendingRevokes(w.deps);
  assert.equal(w.pending[0].status, "failed");
  assert.deepEqual(w.alerts, []);
});
