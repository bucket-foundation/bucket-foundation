import assert from "node:assert/strict";
import { generateKeyPairSync, verify } from "node:crypto";
import { test } from "node:test";
import { RateLimiter } from "./beta";
import { betaLink, LINK_TTL_MS, linkKey, signLink, verifyLink } from "./beta-link";
import { APP_ID, ascToken, BETA_GROUP_ID, confirmJoin, enrollAfterEmail, inviteTester, requestInvite, TESTFLIGHT_JOIN_URL } from "./testflight";

const { privateKey, publicKey } = generateKeyPairSync("ec", { namedCurve: "P-256" });
const pem = privateKey.export({ type: "pkcs8", format: "pem" }).toString();
const env: Record<string, string> = { ASC_KEY_ID: "KEY123", ASC_ISSUER_ID: "issuer-1", ASC_PRIVATE_KEY: pem.replace(/\n/g, "\\n"), TURNSTILE_SECRET_KEY: "ts" };
const site = { origin: "https://beta.polingual.com", ip: "1.2.3.4", token: "tok" };
const fresh = () => ({ ip: new RateLimiter(5, 600_000), email: new RateLimiter(3, 3_600_000), global: new RateLimiter(60, 3_600_000) });
const ASC = "https://api.appstoreconnect.apple.com/v1";
const COUNT = `${ASC}/betaGroups/${BETA_GROUP_ID}/betaTesters?limit=1`;

type Reply = { status: number; body?: unknown };

function fake(replies: Reply[], opts: { human?: unknown; total?: number; rpc?: Reply } = {}) {
  const calls: { method: string; url: string; body: unknown; auth: string }[] = [];
  const checks: string[] = [];
  const rpcs: { url: string; body: Record<string, string>; headers: Record<string, string> }[] = [];
  const send = async (url: string, init: RequestInit) => {
    if (url.includes("/rest/v1/rpc/")) {
      rpcs.push({ url, body: JSON.parse(String(init.body)), headers: init.headers as Record<string, string> });
      return new Response(JSON.stringify(opts.rpc?.body ?? true), { status: opts.rpc?.status ?? 200 });
    }
    if (url.includes("turnstile/v0/siteverify")) {
      checks.push(String(init.body));
      return new Response(JSON.stringify(opts.human ?? { success: true, hostname: "beta.polingual.com" }), { status: 200 });
    }
    if (url === COUNT) return new Response(JSON.stringify({ data: [], meta: { paging: { total: opts.total ?? 10, limit: 1 } } }), { status: 200 });
    const headers = init.headers as Record<string, string>;
    calls.push({ method: String(init.method), url, body: init.body ? JSON.parse(String(init.body)) : null, auth: headers?.Authorization ?? "" });
    const r = replies[calls.length - 1] ?? { status: 200 };
    return new Response(r.status === 204 ? null : JSON.stringify(r.body ?? {}), { status: r.status });
  };
  return { calls, checks, rpcs, send };
}

const invite = (f: ReturnType<typeof fake>, e: Record<string, string> = env, req: { origin?: string; ip?: string; token?: string } = site, limits = fresh()) =>
  inviteTester({ email: "Ana@Example.com" }, e, f.send, req, limits);
const emailQ = `filter[email]=${encodeURIComponent("ana@example.com")}`;

test("ascToken signs an ES256 JWT Apple accepts", () => {
  const now = 1_800_000_000_000;
  const jwt = ascToken({ keyId: "KEY123", issuerId: "issuer-1", privateKey: pem }, now);
  const [h, c, s] = jwt.split(".");
  const header = JSON.parse(Buffer.from(h, "base64url").toString());
  const claims = JSON.parse(Buffer.from(c, "base64url").toString());
  assert.deepEqual(header, { alg: "ES256", kid: "KEY123", typ: "JWT" });
  assert.equal(claims.iss, "issuer-1");
  assert.equal(claims.aud, "appstoreconnect-v1");
  assert.equal(claims.iat, now / 1000);
  assert.ok(claims.exp - claims.iat <= 20 * 60);
  const sig = Buffer.from(s, "base64url");
  assert.equal(sig.length, 64);
  assert.equal(verify("sha256", Buffer.from(`${h}.${c}`), { key: publicKey, dsaEncoding: "ieee-p1363" }, sig), true);
});

test("a new tester is created in the beta group after the Turnstile check and group count", async () => {
  const f = fake([{ status: 201 }]);
  const r = await invite(f);
  assert.equal(r.status, 200);
  assert.equal(r.body.join, TESTFLIGHT_JOIN_URL);
  assert.equal(f.checks.length, 1);
  const form = new URLSearchParams(f.checks[0]);
  assert.equal(form.get("secret"), "ts");
  assert.equal(form.get("response"), "tok");
  assert.equal(f.calls.length, 1);
  assert.equal(f.calls[0].url, `${ASC}/betaTesters`);
  assert.match(f.calls[0].auth, /^Bearer [\w-]+\.[\w-]+\.[\w-]+$/);
  const data = (f.calls[0].body as { data: { attributes: { email: string }; relationships: { betaGroups: { data: { id: string }[] } } } }).data;
  assert.equal(data.attributes.email, "ana@example.com");
  assert.equal(data.relationships.betaGroups.data[0].id, BETA_GROUP_ID);
});

test("an existing tester already in the group gets success without a resend", async () => {
  const f = fake([{ status: 409 }, { status: 200, body: { data: [{ id: "tester-9" }] } }]);
  const r = await invite(f);
  assert.equal(r.status, 200);
  assert.equal(f.calls.length, 2);
  assert.equal(f.calls[1].url, `${ASC}/betaTesters?${emailQ}&filter[betaGroups]=${BETA_GROUP_ID}&limit=1`);
  assert.equal(f.calls.some((c) => c.url.endsWith("/betaTesterInvitations")), false);
});

test("an existing tester missing from the group is added and sent a fresh invite", async () => {
  const f = fake([{ status: 409 }, { status: 200, body: { data: [] } }, { status: 200, body: { data: [{ id: "tester-9" }] } }, { status: 204 }, { status: 201 }]);
  const r = await invite(f);
  assert.equal(r.status, 200);
  assert.deepEqual(f.calls.map((c) => c.method), ["POST", "GET", "GET", "POST", "POST"]);
  assert.equal(f.calls[2].url, `${ASC}/betaTesters?${emailQ}&limit=1`);
  assert.equal(f.calls[3].url, `${ASC}/betaGroups/${BETA_GROUP_ID}/relationships/betaTesters`);
  assert.deepEqual(f.calls[3].body, { data: [{ type: "betaTesters", id: "tester-9" }] });
  assert.equal(f.calls[4].url, `${ASC}/betaTesterInvitations`);
  assert.deepEqual(f.calls[4].body, { data: { type: "betaTesterInvitations", relationships: { app: { data: { type: "apps", id: APP_ID } }, betaTester: { data: { type: "betaTesters", id: "tester-9" } } } } });
});

test("an already invited reply on resend counts as success", async () => {
  const f = fake([{ status: 409 }, { status: 200, body: { data: [] } }, { status: 200, body: { data: [{ id: "t" }] } }, { status: 409 }, { status: 422, body: { errors: [{ detail: "Tester has already been invited" }] } }]);
  assert.equal((await invite(f)).status, 200);
});

test("missing ASC or Turnstile env returns 503 and calls nothing", async () => {
  for (const e of [{ ASC_KEY_ID: "k", TURNSTILE_SECRET_KEY: "ts" }, { ...env, TURNSTILE_SECRET_KEY: "" }] as Record<string, string>[]) {
    const f = fake([]);
    const r = await invite(f, e);
    assert.equal(r.status, 503);
    assert.ok(r.body.error);
    assert.equal(f.calls.length + f.checks.length, 0);
  }
});

test("a missing or failed Turnstile token is refused before Apple", async () => {
  const none = fake([]);
  assert.equal((await invite(none, env, { origin: site.origin, ip: "1" })).status, 403);
  assert.equal(none.calls.length, 0);
  const failed = fake([], { human: { success: false } });
  assert.equal((await invite(failed)).status, 403);
  assert.equal(failed.calls.length, 0);
  const foreign = fake([], { human: { success: true, hostname: "evil.example" } });
  assert.equal((await invite(foreign)).status, 403);
  assert.equal(foreign.calls.length, 0);
});

test("a bad origin is refused before any call", async () => {
  const f = fake([]);
  assert.equal((await invite(f, env, { origin: "https://evil.example", ip: "1", token: "tok" })).status, 403);
  assert.equal((await invite(f, env, { ip: "2", token: "tok" })).status, 403);
  assert.equal(f.calls.length + f.checks.length, 0);
});

test("per-IP, per-email and global limits return 429", async () => {
  const limits = fresh();
  const ip = fake([]);
  for (let i = 0; i < 3; i++) assert.equal((await inviteTester({ email: `a${i}@b.co` }, env, ip.send, site, limits)).status, 200);
  assert.equal((await invite(ip, env, site, limits)).status, 200);
  assert.equal((await invite(ip, env, site, limits)).status, 200);
  assert.equal((await inviteTester({ email: "z@b.co" }, env, ip.send, site, limits)).status, 429);

  const mail = fresh();
  for (let i = 0; i < 3; i++) assert.equal((await invite(fake([]), env, { ...site, ip: `m${i}` }, mail)).status, 200);
  assert.equal((await invite(fake([]), env, { ...site, ip: "m9" }, mail)).status, 429);

  const global = { ...fresh(), global: new RateLimiter(1, 3_600_000) };
  assert.equal((await inviteTester({ email: "g1@b.co" }, env, fake([]).send, { ...site, ip: "g1" }, global)).status, 200);
  const blocked = fake([]);
  assert.equal((await inviteTester({ email: "g2@b.co" }, env, blocked.send, { ...site, ip: "g2" }, global)).status, 429);
  assert.equal(blocked.calls.length, 0);
});

test("a full beta group stops new testers before Apple creates one", async () => {
  const f = fake([], { total: 9000 });
  assert.equal((await invite(f)).status, 503);
  assert.equal(f.calls.length, 0);
  const custom = fake([{ status: 201 }], { total: 9000 });
  assert.equal((await invite(custom, { ...env, TESTFLIGHT_MAX_TESTERS: "9500" })).status, 200);
});

test("an Apple error returns 502 and logs only the status", async () => {
  const logged: unknown[][] = [];
  const original = console.error;
  console.error = (...args: unknown[]) => void logged.push(args);
  try {
    assert.equal((await invite(fake([{ status: 500 }]))).status, 502);
    assert.equal((await invite(fake([{ status: 409 }, { status: 500 }]))).status, 502);
    assert.equal((await invite(fake([{ status: 409 }, { status: 200, body: { data: [] } }, { status: 200, body: { data: [] } }]))).status, 502);
    assert.equal((await invite(fake([{ status: 409 }, { status: 200, body: { data: [] } }, { status: 200, body: { data: [{ id: "t" }] } }, { status: 204 }, { status: 403 }]))).status, 502);
  } finally {
    console.error = original;
  }
  assert.ok(logged.length >= 4);
  assert.equal(JSON.stringify(logged).includes("example.com"), false);
});

test("the honeypot answers success without calling Apple", async () => {
  const f = fake([]);
  const r = await inviteTester({ email: "a@b.co", website: "spam" }, env, f.send, site, fresh());
  assert.equal(r.status, 200);
  assert.equal(f.calls.length + f.checks.length, 0);
});

test("the shared database limit decides when POLINGUAL_DB is set", async () => {
  const db = { ...env, POLINGUAL_DB_URL: "https://db.example", POLINGUAL_DB_SERVICE_KEY: "svc", FOUNDING_IP_SALT: "salt" };
  const limits = { ...fresh(), global: new RateLimiter(0, 3_600_000) };
  const allowed = fake([{ status: 201 }], { rpc: { status: 200, body: true } });
  assert.equal((await invite(allowed, db, site, limits)).status, 200);
  assert.equal(allowed.rpcs.length, 1);
  assert.equal(allowed.rpcs[0].url, "https://db.example/rest/v1/rpc/record_testflight_attempt");
  assert.equal(allowed.rpcs[0].headers["Content-Profile"], "polingual");
  assert.equal(allowed.rpcs[0].headers.apikey, "svc");
  assert.match(allowed.rpcs[0].body.p_ip_hash, /^[0-9a-f]{64}$/);
  assert.match(allowed.rpcs[0].body.p_email_hash, /^[0-9a-f]{64}$/);
  assert.equal(JSON.stringify(allowed.rpcs[0].body).includes("example.com"), false);
  assert.equal(JSON.stringify(allowed.rpcs[0].body).includes("1.2.3.4"), false);

  const denied = fake([{ status: 201 }], { rpc: { status: 200, body: false } });
  assert.equal((await invite(denied, db, site, fresh())).status, 429);
  assert.equal(denied.calls.length, 0);

  const original = console.error;
  console.error = () => {};
  try {
    const broken = fake([{ status: 201 }], { rpc: { status: 500 } });
    assert.equal((await invite(broken, db, site, fresh())).status, 200);
    const brokenAndLocalFull = fake([{ status: 201 }], { rpc: { status: 500 } });
    assert.equal((await invite(brokenAndLocalFull, db, site, limits)).status, 429);
    assert.equal(brokenAndLocalFull.calls.length, 0);
  } finally {
    console.error = original;
  }
});

test("email signup enrolls the tester in the group without Turnstile", async () => {
  const f = fake([{ status: 201 }]);
  assert.equal(await enrollAfterEmail("ana@example.com", "1.2.3.4", { ASC_KEY_ID: env.ASC_KEY_ID, ASC_ISSUER_ID: env.ASC_ISSUER_ID, ASC_PRIVATE_KEY: env.ASC_PRIVATE_KEY }, f.send, fresh()), "sent");
  assert.equal(f.checks.length, 0);
  assert.equal(f.calls[0].url, `${ASC}/betaTesters`);
});

test("email signup skips enrollment when the Apple key is missing", async () => {
  const f = fake([]);
  assert.equal(await enrollAfterEmail("ana@example.com", "1.2.3.4", {}, f.send, fresh()), "skipped");
  assert.equal(f.calls.length, 0);
});

test("email signup enrollment respects the rate limit", async () => {
  const f = fake([]);
  const limits = { ip: new RateLimiter(0, 600_000), email: new RateLimiter(3, 3_600_000), global: new RateLimiter(60, 3_600_000) };
  assert.equal(await enrollAfterEmail("ana@example.com", "1.2.3.4", env, f.send, limits), "skipped");
  assert.equal(f.calls.length, 0);
});

const NOW = 1_800_000_000_000;

test("a signed join link verifies for its email until it expires", () => {
  const t = signLink("ana@example.com", "secret", NOW);
  assert.equal(verifyLink("ana@example.com", t, "secret", NOW + LINK_TTL_MS - 1000), true);
  assert.equal(verifyLink("ana@example.com", t, "secret", NOW + LINK_TTL_MS + 1000), false);
  assert.equal(verifyLink("bob@example.com", t, "secret", NOW), false);
  assert.equal(verifyLink("ana@example.com", t, "other", NOW), false);
  assert.equal(verifyLink("ana@example.com", `${t}x`, "secret", NOW), false);
  assert.equal(verifyLink("ana@example.com", "garbage", "secret", NOW), false);
});

test("the link key prefers BETA_LINK_SECRET, derives from the service key, and falls back to the public link", () => {
  assert.equal(linkKey({ BETA_LINK_SECRET: "s" }), "s");
  assert.ok(linkKey({ POLINGUAL_DB_SERVICE_KEY: "svc" }));
  assert.notEqual(linkKey({ POLINGUAL_DB_SERVICE_KEY: "svc" }), "svc");
  assert.equal(linkKey({}), null);
  assert.equal(betaLink("ana@example.com", {}), TESTFLIGHT_JOIN_URL);
  assert.match(betaLink("ana@example.com", { BETA_LINK_SECRET: "s" }, NOW), /\/api\/beta\/join\?e=ana%40example\.com&t=\d+\./);
});

test("a confirmed join link enrolls the tester", async () => {
  const f = fake([{ status: 201 }]);
  const e = { ...env, BETA_LINK_SECRET: "s" };
  assert.equal(await confirmJoin("ana@example.com", signLink("ana@example.com", "s", NOW), "1.2.3.4", e, f.send, fresh(), NOW), "sent");
  assert.equal(f.calls[0].url, `${ASC}/betaTesters`);
});

test("a bad or missing join token enrolls nobody", async () => {
  const f = fake([]);
  const e = { ...env, BETA_LINK_SECRET: "s" };
  assert.equal(await confirmJoin("ana@example.com", signLink("ana@example.com", "wrong", NOW), "1.2.3.4", e, f.send, fresh(), NOW), "skipped");
  assert.equal(await confirmJoin("ana@example.com", null, "1.2.3.4", e, f.send, fresh(), NOW), "skipped");
  assert.equal(await confirmJoin("ana@example.com", signLink("ana@example.com", "s", NOW), "1.2.3.4", env, f.send, fresh(), NOW), "skipped");
  assert.equal(f.calls.length + f.rpcs.length, 0);
});

async function hitJoin(query: string, e: Record<string, string>, f: ReturnType<typeof fake>) {
  const { GET } = await import("../app/api/beta/join/route");
  const { NextRequest } = await import("next/server");
  const saved = { env: { ...process.env }, fetch: globalThis.fetch };
  Object.assign(process.env, e);
  globalThis.fetch = f.send as typeof fetch;
  try {
    return await GET(new NextRequest(`https://www.polingual.com/api/beta/join?${query}`, { headers: { "x-real-ip": "9.9.9.9" } }));
  } finally {
    for (const k of Object.keys(e)) if (!(k in saved.env)) delete process.env[k];
    Object.assign(process.env, saved.env);
    globalThis.fetch = saved.fetch;
  }
}

test("the join route enrolls a valid link and redirects to TestFlight", async () => {
  const f = fake([{ status: 201 }]);
  const t = signLink("ana@example.com", "s");
  const r = await hitJoin(`e=ana%40example.com&t=${encodeURIComponent(t)}`, { ...env, BETA_LINK_SECRET: "s" }, f);
  assert.equal(r.status, 302);
  assert.equal(r.headers.get("location"), TESTFLIGHT_JOIN_URL);
  assert.equal(f.calls[0].url, `${ASC}/betaTesters`);
});

test("the join route redirects a bad token without enrolling", async () => {
  const f = fake([]);
  const r = await hitJoin("e=ana%40example.com&t=1.bad", { ...env, BETA_LINK_SECRET: "s" }, f);
  assert.equal(r.status, 302);
  assert.equal(r.headers.get("location"), TESTFLIGHT_JOIN_URL);
  assert.equal(f.calls.length, 0);
});

const mailEnv = { RESEND_API_KEY: "k", RESEND_BETA_AUDIENCE_ID: "aud", TURNSTILE_SECRET_KEY: "ts" };
const mailFresh = () => ({ ip: new RateLimiter(5, 600_000), email: new RateLimiter(2, 3_600_000), global: new RateLimiter(60, 3_600_000) });

test("an email invite without Turnstile is refused when the secret is set", async () => {
  const f = fake([]);
  const r = await requestInvite({ email: "ana@example.com", kind: "testflight" }, mailEnv, f.send, { origin: "https://beta.polingual.com", ip: "1.2.3.4" }, mailFresh());
  assert.equal(r.status, 403);
  assert.equal(f.calls.length, 0);
});

test("an email invite passes Turnstile once and sends without enrolling", async () => {
  const f = fake([{ status: 404 }, { status: 200 }, { status: 200 }]);
  const r = await requestInvite({ email: "ana@example.com", kind: "testflight" }, mailEnv, f.send, site, mailFresh());
  assert.equal(r.status, 200);
  assert.equal(f.checks.length, 1);
  assert.equal(f.calls.length, 3);
  assert.ok(f.calls.every((c) => c.url.startsWith("https://api.resend.com")));
});

test("email invites use the shared limit under their own scope", async () => {
  const f = fake([], { rpc: { status: 200, body: false } });
  const e = { ...mailEnv, POLINGUAL_DB_URL: "https://db.example", POLINGUAL_DB_SERVICE_KEY: "svc", FOUNDING_IP_SALT: "salt" };
  const r = await requestInvite({ email: "ana@example.com", kind: "testflight" }, e, f.send, site, mailFresh());
  assert.equal(r.status, 429);
  assert.equal(f.rpcs.length, 1);
  assert.equal(f.calls.length, 0);
});

test("a throttled signup never reaches the Turnstile check", async () => {
  const ipFull = { ...fresh(), ip: new RateLimiter(0, 600_000) };
  const blocked = fake([]);
  assert.equal((await invite(blocked, env, site, ipFull)).status, 429);
  assert.equal(blocked.checks.length, 0);
});

test("a failed Turnstile check spends no shared, email or global quota", async () => {
  const limits = { ip: new RateLimiter(100, 600_000), email: new RateLimiter(1, 3_600_000), global: new RateLimiter(1, 3_600_000) };
  const db = { ...env, POLINGUAL_DB_URL: "https://db.example", POLINGUAL_DB_SERVICE_KEY: "svc", FOUNDING_IP_SALT: "salt" };
  for (let i = 0; i < 20; i++) {
    const junk = fake([], { human: { success: false } });
    assert.equal((await invite(junk, db, { ...site, ip: `r${i}` }, limits)).status, 403);
    assert.equal(junk.rpcs.length, 0);
  }
  const real = fake([{ status: 201 }], { rpc: { status: 500 } });
  const original = console.error;
  console.error = () => {};
  try {
    assert.equal((await invite(real, db, site, limits)).status, 200);
  } finally {
    console.error = original;
  }
});

test("without FOUNDING_IP_SALT the shared limit is skipped and production signups go offline", async () => {
  const db = { ...env, POLINGUAL_DB_URL: "https://db.example", POLINGUAL_DB_SERVICE_KEY: "svc" };
  const local = fake([{ status: 201 }]);
  assert.equal((await invite(local, db)).status, 200);
  assert.equal(local.rpcs.length, 0);
  for (const prod of [{ VERCEL_ENV: "production" }, { NODE_ENV: "production" }] as Record<string, string>[]) {
    const f = fake([]);
    assert.equal((await invite(f, { ...db, ...prod })).status, 503);
    assert.equal(f.calls.length + f.checks.length + f.rpcs.length, 0);
    assert.equal(await enrollAfterEmail("ana@example.com", "1.2.3.4", { ...env, ...prod }, f.send, fresh()), "skipped");
  }
  const salted = fake([{ status: 201 }], { rpc: { status: 200, body: true } });
  assert.equal((await invite(salted, { ...db, VERCEL_ENV: "production", FOUNDING_IP_SALT: "salt" })).status, 200);
  assert.equal(salted.rpcs.length, 1);
});
