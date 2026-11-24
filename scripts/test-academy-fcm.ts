import test from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync, verify } from "node:crypto";
import {
  fcmConfig,
  fcmErrorCode,
  mergeResults,
  pushFcmCheer,
  pushFcmStreak,
  resetAccessTokenCache,
  sendFcm,
  signAssertion,
  vercelOidcToken,
  type FcmKeyConfig,
  type FcmOidcConfig,
  type FetchLike,
} from "../src/lib/academy/fcm";

const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const pem = privateKey.export({ type: "pkcs8", format: "pem" }).toString();
const account = { type: "service_account", project_id: "polingual-test", client_email: "push@polingual-test.iam.gserviceaccount.com", private_key: pem, token_uri: "https://oauth2.googleapis.com/token" };
const cfg = fcmConfig({ FCM_SERVICE_ACCOUNT_JSON: JSON.stringify(account) }) as FcmKeyConfig;
const tok = (c: string) => c.repeat(140);

interface Call {
  url: string;
  headers: Record<string, string>;
  body: string;
}

function mockFetch(reply: (body: string) => { status: number; text: string } | Error): FetchLike & { calls: Call[] } {
  const calls: Call[] = [];
  const fn = (async (url: string, init: { headers: Record<string, string>; body: string }) => {
    calls.push({ url, headers: init.headers, body: init.body });
    if (url.includes("oauth2")) return { status: 200, ok: true, text: async () => JSON.stringify({ access_token: "ya29.test", expires_in: 3600 }) };
    const r = reply(init.body);
    if (r instanceof Error) throw r;
    return { status: r.status, ok: r.status >= 200 && r.status < 300, text: async () => r.text };
  }) as unknown as FetchLike & { calls: Call[] };
  fn.calls = calls;
  return fn;
}

const fcmError = (status: number, code: string, errorCode?: string) =>
  JSON.stringify({ error: { code: status, status: code, details: errorCode ? [{ "@type": "type.googleapis.com/google.firebase.fcm.v1.FcmError", errorCode }] : [] } });

test("fcmConfig fails closed when unset, empty, malformed or incomplete", () => {
  assert.equal(fcmConfig({}), null);
  assert.equal(fcmConfig({ VERCEL: "1", FCM_SERVICE_ACCOUNT_JSON: "{not json" }), null);
  assert.equal(fcmConfig({ FCM_SERVICE_ACCOUNT_JSON: "  " }), null);
  assert.equal(fcmConfig({ FCM_SERVICE_ACCOUNT_JSON: "{not json" }), null);
  assert.equal(fcmConfig({ FCM_SERVICE_ACCOUNT_JSON: JSON.stringify({ ...account, private_key: "" }) }), null);
  assert.equal(fcmConfig({ FCM_SERVICE_ACCOUNT_JSON: JSON.stringify({ ...account, project_id: undefined }) }), null);
  assert.equal(cfg.projectId, "polingual-test");
});

test("fcmConfig unescapes literal newlines and rejects a non-https token_uri", () => {
  const c = fcmConfig({ FCM_SERVICE_ACCOUNT_JSON: JSON.stringify({ ...account, private_key: pem.replace(/\n/g, "\\n"), token_uri: "http://evil" }) }) as FcmKeyConfig | null;
  assert.ok(c);
  assert.equal(c.privateKey, pem.trim());
  assert.equal(c.tokenUri, "https://oauth2.googleapis.com/token");
});

test("signAssertion makes an RS256 JWT with the FCM scope that the public key verifies", () => {
  const jwt = signAssertion(cfg, 1_800_000_000_000);
  const [h, c, s] = jwt.split(".");
  const claims = JSON.parse(Buffer.from(c, "base64url").toString());
  assert.equal(JSON.parse(Buffer.from(h, "base64url").toString()).alg, "RS256");
  assert.equal(claims.iss, account.client_email);
  assert.equal(claims.scope, "https://www.googleapis.com/auth/firebase.messaging");
  assert.equal(claims.exp - claims.iat, 3600);
  assert.ok(verify("sha256", Buffer.from(`${h}.${c}`), publicKey, Buffer.from(s, "base64url")));
});

test("sendFcm posts one v1 message per device with a cached bearer token", async () => {
  resetAccessTokenCache();
  const f = mockFetch(() => ({ status: 200, text: "{}" }));
  const devices = [{ token: tok("a"), bundle_id: "com.polingual.app" }, { token: tok("b"), bundle_id: "com.polingual.app" }];
  const msg = { body: "hi", tag: "g1", data: { group: "g1" } };
  const r = await sendFcm(devices, msg, { cfg, prune: async () => undefined, fetch: f, now: 1_800_000_000_000 });
  assert.deepEqual(r, { sent: 2, pruned: [], moved: [], failed: 0 });
  const sends = f.calls.filter((c) => c.url.includes("fcm.googleapis.com"));
  assert.equal(sends[0].url, "https://fcm.googleapis.com/v1/projects/polingual-test/messages:send");
  assert.equal(sends[0].headers.authorization, "Bearer ya29.test");
  assert.equal(JSON.parse(sends[0].body).message.token, tok("a"));
  await sendFcm(devices, msg, { cfg, prune: async () => undefined, fetch: f, now: 1_800_000_060_000 });
  assert.equal(f.calls.filter((c) => c.url.includes("oauth2")).length, 1);
});

test("sendFcm prunes UNREGISTERED only and keeps tokens on other errors", async () => {
  resetAccessTokenCache();
  const f = mockFetch((body) => {
    const t = JSON.parse(body).message.token as string;
    if (t === tok("a")) return { status: 404, text: fcmError(404, "NOT_FOUND", "UNREGISTERED") };
    if (t === tok("b")) return { status: 400, text: fcmError(400, "INVALID_ARGUMENT", "INVALID_ARGUMENT") };
    if (t === tok("c")) return { status: 503, text: fcmError(503, "UNAVAILABLE", "UNAVAILABLE") };
    return new Error("socket");
  });
  const pruned: string[] = [];
  const r = await sendFcm(
    ["a", "b", "c", "d"].map((c) => ({ token: tok(c), bundle_id: "com.polingual.app" })),
    { body: "x", tag: "t", data: {} },
    { cfg, prune: async (t) => void pruned.push(t), fetch: f, now: 1_800_000_000_000 },
  );
  assert.equal(r.sent, 0);
  assert.equal(r.failed, 4);
  assert.deepEqual(pruned.sort(), [tok("a")]);
});

test("fcmErrorCode prefers the FcmError detail and falls back to status", () => {
  assert.equal(fcmErrorCode(404, fcmError(404, "NOT_FOUND", "UNREGISTERED")), "UNREGISTERED");
  assert.equal(fcmErrorCode(400, fcmError(400, "INVALID_ARGUMENT")), "INVALID_ARGUMENT");
  assert.equal(fcmErrorCode(404, "not json"), "UNREGISTERED");
  assert.equal(fcmErrorCode(500, "not json"), null);
});

test("sendFcm skips the network for zero devices", async () => {
  const f = mockFetch(() => ({ status: 200, text: "{}" }));
  const r = await sendFcm([], { body: "x", tag: "t", data: {} }, { cfg, prune: async () => undefined, fetch: f });
  assert.equal(r.sent, 0);
  assert.equal(f.calls.length, 0);
});

test("pushFcmCheer and pushFcmStreak return null without config and on store errors", async () => {
  const f = mockFetch(() => ({ status: 200, text: "{}" }));
  const store = { devices: async () => [{ token: tok("a"), bundle_id: "com.polingual.app" }], prune: async () => undefined };
  assert.equal(await pushFcmCheer({ group_id: "g", to_id: "u", kind: "cheer" }, "Ana", { cfg: null, store, fetch: f }), null);
  assert.equal(f.calls.length, 0);
  const bad = { devices: async () => { throw new Error("db"); }, prune: async () => undefined };
  assert.equal(await pushFcmStreak("u", 3, { cfg, store: bad, fetch: f }), null);
  resetAccessTokenCache();
  const ok = await pushFcmCheer({ group_id: "g", to_id: "u", kind: "cheer" }, "Ana", { cfg, store, fetch: f, now: 1_800_000_000_000 });
  assert.equal(ok?.sent, 1);
  const sent = JSON.parse(f.calls[f.calls.length - 1].body).message;
  assert.equal(sent.notification.body, "Ana cheered you on");
  assert.equal(sent.android.notification.tag, "g");
});

test("mergeResults sums both platforms and passes through a single side", () => {
  const a = { sent: 1, pruned: ["x"], moved: [], failed: 0 };
  const b = { sent: 2, pruned: [], moved: ["y"], failed: 1 };
  assert.deepEqual(mergeResults(a, b), { sent: 3, pruned: ["x"], moved: ["y"], failed: 1 });
  assert.equal(mergeResults(null, b), b);
  assert.equal(mergeResults(null, null), null);
});

const audience = "//iam.googleapis.com/projects/201543151655/locations/global/workloadIdentityPools/vercel/providers/vercel";
const saEmail = "firebase-adminsdk-fbsvc@bucket-foundation.iam.gserviceaccount.com";

function oidcFetch(opts: { sts?: number; iam?: number; expireTime?: string } = {}): FetchLike & { calls: Call[] } {
  const calls: Call[] = [];
  const fn = (async (url: string, init: { headers: Record<string, string>; body: string }) => {
    calls.push({ url, headers: init.headers, body: init.body });
    const reply = (status: number, body: unknown) => ({ status, ok: status < 300, text: async () => JSON.stringify(body) });
    if (url.startsWith("https://sts.googleapis.com")) return reply(opts.sts ?? 200, { access_token: "sts.fed", expires_in: 3600 });
    if (url.startsWith("https://iamcredentials.googleapis.com")) return reply(opts.iam ?? 200, { accessToken: "ya29.sa", expireTime: opts.expireTime ?? "2027-01-15T09:00:00Z" });
    return reply(200, {});
  }) as unknown as FetchLike & { calls: Call[] };
  fn.calls = calls;
  return fn;
}

const t0 = Date.parse("2027-01-15T08:00:00Z");

test("fcmConfig picks OIDC defaults on Vercel without a key and reads env overrides", () => {
  assert.equal(fcmConfig({ VERCEL_OIDC_TOKEN: "" }), null);
  const d = fcmConfig({ VERCEL: "1" }) as FcmOidcConfig;
  assert.deepEqual(d, { auth: "oidc", projectId: "bucket-foundation", audience, serviceAccountEmail: saEmail });
  const o = fcmConfig({ FCM_AUTH: "oidc", GCP_PROJECT_NUMBER: "9", GCP_WIF_POOL_ID: "p", GCP_WIF_PROVIDER_ID: "q", FCM_SERVICE_ACCOUNT_EMAIL: "x@y", FCM_PROJECT_ID: "z" }) as FcmOidcConfig;
  assert.equal(o.audience, "//iam.googleapis.com/projects/9/locations/global/workloadIdentityPools/p/providers/q");
  assert.equal(o.serviceAccountEmail, "x@y");
  assert.equal(o.projectId, "z");
  assert.equal((fcmConfig({ VERCEL: "1", FCM_SERVICE_ACCOUNT_JSON: JSON.stringify(account) }) as FcmKeyConfig).auth, "key");
});

test("vercelOidcToken prefers the request header and falls back to env", () => {
  const sym = Symbol.for("@vercel/request-context");
  const g = globalThis as Record<symbol, unknown>;
  assert.equal(vercelOidcToken({ VERCEL_OIDC_TOKEN: "env.jwt" }), "env.jwt");
  g[sym] = { get: () => ({ headers: { "x-vercel-oidc-token": "hdr.jwt" } }) };
  try {
    assert.equal(vercelOidcToken({ VERCEL_OIDC_TOKEN: "env.jwt" }), "hdr.jwt");
  } finally {
    delete g[sym];
  }
  assert.equal(vercelOidcToken({}), null);
});

test("OIDC path exchanges at STS, impersonates the SA, sends to FCM, and caches until 60s before expiry", async () => {
  resetAccessTokenCache();
  const cfg: FcmOidcConfig = { ...(fcmConfig({ VERCEL: "1" }) as FcmOidcConfig), oidcToken: () => "vercel.jwt" };
  const f = oidcFetch();
  const devices = [{ token: tok("a"), bundle_id: "com.polingual.app" }];
  const msg = { body: "hi", tag: "g", data: {} };
  const r = await sendFcm(devices, msg, { cfg, prune: async () => undefined, fetch: f, now: t0 });
  assert.equal(r.sent, 1);
  const [sts, iam, send] = f.calls;
  assert.equal(sts.url, "https://sts.googleapis.com/v1/token");
  const sb = JSON.parse(sts.body);
  assert.equal(sb.grantType, "urn:ietf:params:oauth:grant-type:token-exchange");
  assert.equal(sb.audience, audience);
  assert.equal(sb.subjectToken, "vercel.jwt");
  assert.equal(sb.subjectTokenType, "urn:ietf:params:oauth:token-type:jwt");
  assert.equal(sb.scope, "https://www.googleapis.com/auth/cloud-platform");
  assert.equal(iam.url, `https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${encodeURIComponent(saEmail)}:generateAccessToken`);
  assert.equal(iam.headers.authorization, "Bearer sts.fed");
  assert.deepEqual(JSON.parse(iam.body).scope, ["https://www.googleapis.com/auth/firebase.messaging"]);
  assert.equal(send.url, "https://fcm.googleapis.com/v1/projects/bucket-foundation/messages:send");
  assert.equal(send.headers.authorization, "Bearer ya29.sa");
  await sendFcm(devices, msg, { cfg, prune: async () => undefined, fetch: f, now: t0 + 3600_000 - 61_000 });
  assert.equal(f.calls.filter((c) => c.url.includes("sts")).length, 1);
  await sendFcm(devices, msg, { cfg, prune: async () => undefined, fetch: f, now: t0 + 3600_000 - 59_000 });
  assert.equal(f.calls.filter((c) => c.url.includes("sts")).length, 2);
});

test("OIDC path fails closed with no token, STS or IAM errors, or a bad expiry", async () => {
  const base = fcmConfig({ VERCEL: "1" }) as FcmOidcConfig;
  const devices = [{ token: tok("a"), bundle_id: "com.polingual.app" }];
  const msg = { body: "hi", tag: "g", data: {} };
  const cases: [FcmOidcConfig, FetchLike & { calls: Call[] }, RegExp][] = [
    [{ ...base, oidcToken: () => null }, oidcFetch(), /no vercel oidc token/],
    [{ ...base, oidcToken: () => "j" }, oidcFetch({ sts: 403 }), /sts: 403/],
    [{ ...base, oidcToken: () => "j" }, oidcFetch({ iam: 403 }), /impersonate: 403/],
    [{ ...base, oidcToken: () => "j" }, oidcFetch({ expireTime: "soon" }), /bad expireTime/],
  ];
  for (const [c, f, re] of cases) {
    resetAccessTokenCache();
    await assert.rejects(sendFcm(devices, msg, { cfg: c, prune: async () => undefined, fetch: f, now: t0 }), re);
    assert.equal(f.calls.filter((x) => x.url.includes("fcm.googleapis.com")).length, 0);
  }
  resetAccessTokenCache();
  const store = { devices: async () => devices, prune: async () => undefined };
  assert.equal(await pushFcmStreak("u", 2, { cfg: { ...base, oidcToken: () => null }, store, fetch: oidcFetch(), now: t0 }), null);
});
