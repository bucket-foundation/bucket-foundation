import test from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync, verify } from "node:crypto";
import {
  apnsConfig,
  cheerPayload,
  normalizeBundleId,
  normalizeDeviceToken,
  normalizePushEnv,
  providerToken,
  pushCheer,
  resetTokenCache,
  sendPush,
  signJwt,
  type ApnsConfig,
  type ApnsResponse,
  type ApnsTransport,
  type PushDevice,
} from "../src/lib/academy/apns";

const { privateKey, publicKey } = generateKeyPairSync("ec", { namedCurve: "P-256" });
const pem = privateKey.export({ type: "pkcs8", format: "pem" }).toString();
const cfg: ApnsConfig = { key: pem, keyId: "KEY1234567", teamId: "TEAM123456" };
const tok = (c: string) => c.repeat(64);

function decode(part: string): Record<string, unknown> {
  return JSON.parse(Buffer.from(part, "base64url").toString("utf8"));
}

interface Sent {
  origin: string;
  path: string;
  headers: Record<string, string>;
  body: string;
}

function mockTransport(reply: (path: string) => ApnsResponse | Error): ApnsTransport & { sent: Sent[]; closed: number } {
  const t = {
    sent: [] as Sent[],
    closed: 0,
    async send(origin: string, path: string, headers: Record<string, string>, body: string) {
      t.sent.push({ origin, path, headers, body });
      const r = reply(path);
      if (r instanceof Error) throw r;
      return r;
    },
    close() {
      t.closed += 1;
    },
  };
  return t;
}

test("signJwt makes an ES256 JWT with kid, iss and iat that the public key verifies", () => {
  const jwt = signJwt(cfg, 1_800_000_000_123);
  const [h, c, s] = jwt.split(".");
  assert.deepEqual(decode(h), { alg: "ES256", kid: "KEY1234567" });
  assert.deepEqual(decode(c), { iss: "TEAM123456", iat: 1_800_000_000 });
  const sig = Buffer.from(s, "base64url");
  assert.equal(sig.length, 64);
  assert.ok(verify("sha256", Buffer.from(`${h}.${c}`), { key: publicKey, dsaEncoding: "ieee-p1363" }, sig));
  assert.doesNotMatch(jwt, /[=+/]/);
});

test("providerToken reuses the JWT for 50 minutes, then signs a new one", () => {
  resetTokenCache();
  const t0 = 1_800_000_000_000;
  const a = providerToken(cfg, t0);
  assert.equal(providerToken(cfg, t0 + 49 * 60_000), a);
  const b = providerToken(cfg, t0 + 50 * 60_000);
  assert.notEqual(b, a);
  assert.equal(decode(b.split(".")[1]).iat, Math.floor((t0 + 50 * 60_000) / 1000));
  assert.notEqual(providerToken({ ...cfg, keyId: "OTHERKEY12" }, t0 + 50 * 60_000), b);
});

test("cheerPayload carries the text, thread-id and group id", () => {
  assert.deepEqual(cheerPayload("cheer", "Gia", "g-1"), {
    aps: { alert: { body: "Gia cheered you on" }, sound: "default", "thread-id": "g-1" },
    group: "g-1",
  });
  assert.equal(cheerPayload("nudge", "Lu", "g-2").aps.alert.body, "Lu nudged you: time for today's reviews");
});

test("apnsConfig needs all three env vars and unescapes newlines", () => {
  assert.equal(apnsConfig({}), null);
  assert.equal(apnsConfig({ APNS_KEY: pem, APNS_KEY_ID: "K" }), null);
  const c = apnsConfig({ APNS_KEY: pem.replace(/\n/g, "\\n"), APNS_KEY_ID: "K", APNS_TEAM_ID: "T" });
  assert.equal(c?.key, pem.trim());
});

test("register inputs are validated", () => {
  assert.equal(normalizePushEnv("sandbox"), "sandbox");
  assert.equal(normalizePushEnv("dev"), null);
  assert.equal(normalizeBundleId("com.polingual.app"), "com.polingual.app");
  assert.equal(normalizeBundleId("com.evil.app"), null);
  assert.equal(normalizeDeviceToken(tok("A")), tok("a"));
  assert.equal(normalizeDeviceToken("abc"), null);
  assert.equal(normalizeDeviceToken(42), null);
});

test("sendPush routes by env, sets APNs headers and prunes 410 and BadDeviceToken", async () => {
  resetTokenCache();
  const devices: PushDevice[] = [
    { token: tok("a"), env: "production", bundle_id: "foundation.bucket.app" },
    { token: tok("b"), env: "sandbox", bundle_id: "com.polingual.app" },
    { token: tok("c"), env: "production", bundle_id: "foundation.bucket.app" },
    { token: tok("d"), env: "production", bundle_id: "foundation.bucket.app" },
    { token: tok("e"), env: "sandbox", bundle_id: "foundation.bucket.app" },
  ];
  const transport = mockTransport((path) => {
    if (path.endsWith(tok("b"))) return { status: 410, reason: "Unregistered" };
    if (path.endsWith(tok("c"))) return { status: 400, reason: "BadDeviceToken" };
    if (path.endsWith(tok("d"))) return { status: 429, reason: "TooManyRequests" };
    if (path.endsWith(tok("e"))) return new Error("socket hang up");
    return { status: 200, reason: null };
  });
  const pruned: string[] = [];
  const payload = cheerPayload("cheer", "Gia", "g-1");
  const res = await sendPush(devices, payload, { cfg, transport, now: 1_800_000_000_000, prune: async (t) => void pruned.push(t) });
  assert.deepEqual(res, { sent: 1, pruned: [tok("b"), tok("c")], failed: 4 });
  assert.deepEqual(pruned.sort(), [tok("b"), tok("c")]);
  assert.equal(transport.closed, 1);
  const a = transport.sent.find((s) => s.path === `/3/device/${tok("a")}`)!;
  assert.equal(a.origin, "https://api.push.apple.com");
  assert.equal(a.headers["apns-topic"], "foundation.bucket.app");
  assert.equal(a.headers["apns-push-type"], "alert");
  assert.match(a.headers.authorization, /^bearer [\w-]+\.[\w-]+\.[\w-]+$/);
  assert.deepEqual(JSON.parse(a.body), payload);
  const b = transport.sent.find((s) => s.path.endsWith(tok("b")))!;
  assert.equal(b.origin, "https://api.sandbox.push.apple.com");
  assert.equal(b.headers["apns-topic"], "com.polingual.app");
});

test("pushCheer skips without config and never throws", async () => {
  let reads = 0;
  const store = {
    async devices() {
      reads += 1;
      return [{ token: tok("a"), env: "production" as const, bundle_id: "foundation.bucket.app" }];
    },
    async prune() {},
  };
  const cheer = { group_id: "g-1", to_id: "u-2", kind: "nudge" as const };
  assert.equal(await pushCheer(cheer, "Gia", { cfg: null, store }), null);
  assert.equal(reads, 0);

  const broken = { ...store, devices: async () => Promise.reject(new Error("db down")) };
  assert.equal(await pushCheer(cheer, "Gia", { cfg, store: broken, transport: mockTransport(() => ({ status: 200, reason: null })) }), null);

  const transport = mockTransport(() => ({ status: 200, reason: null }));
  const res = await pushCheer(cheer, "Gia", { cfg, store, transport });
  assert.deepEqual(res, { sent: 1, pruned: [], failed: 0 });
  assert.equal(JSON.parse(transport.sent[0].body).aps.alert.body, "Gia nudged you: time for today's reviews");

  const badKey = await pushCheer(cheer, "Gia", { cfg: { ...cfg, keyId: "NEWKEY0000", key: "not a pem" }, store, transport: mockTransport(() => ({ status: 200, reason: null })) });
  assert.equal(badKey, null);
});
