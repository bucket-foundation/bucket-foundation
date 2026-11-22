import assert from "node:assert/strict";
import { generateKeyPairSync, verify } from "node:crypto";
import { test } from "node:test";
import { RateLimiter } from "./beta";
import { APP_ID, ascToken, BETA_GROUP_ID, inviteTester, TESTFLIGHT_JOIN_URL } from "./testflight";

const { privateKey, publicKey } = generateKeyPairSync("ec", { namedCurve: "P-256" });
const pem = privateKey.export({ type: "pkcs8", format: "pem" }).toString();
const env = { ASC_KEY_ID: "KEY123", ASC_ISSUER_ID: "issuer-1", ASC_PRIVATE_KEY: pem.replace(/\n/g, "\\n") };
const site = { origin: "https://beta.polingual.com", ip: "1.2.3.4" };
const fresh = () => ({ ip: new RateLimiter(5, 600_000), email: new RateLimiter(3, 3_600_000) });

type Reply = { status: number; body?: unknown };

function fake(replies: Reply[]) {
  const calls: { method: string; url: string; body: unknown; auth: string }[] = [];
  const send = async (url: string, init: RequestInit) => {
    const headers = init.headers as Record<string, string>;
    calls.push({ method: String(init.method), url, body: init.body ? JSON.parse(String(init.body)) : null, auth: headers?.Authorization ?? "" });
    const r = replies[calls.length - 1] ?? { status: 200 };
    return new Response(r.status === 204 ? null : JSON.stringify(r.body ?? {}), { status: r.status });
  };
  return { calls, send };
}

const invite = (f: ReturnType<typeof fake>, e: Record<string, string> = env, req: { origin?: string; ip?: string } = site) =>
  inviteTester({ email: "Ana@Example.com" }, e, f.send, req, fresh());

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

test("a new tester is created in the beta group with one call", async () => {
  const f = fake([{ status: 201 }]);
  const r = await invite(f);
  assert.equal(r.status, 200);
  assert.equal(r.body.join, TESTFLIGHT_JOIN_URL);
  assert.equal(f.calls.length, 1);
  assert.equal(f.calls[0].url, "https://api.appstoreconnect.apple.com/v1/betaTesters");
  assert.match(f.calls[0].auth, /^Bearer [\w-]+\.[\w-]+\.[\w-]+$/);
  const data = (f.calls[0].body as { data: { attributes: { email: string }; relationships: { betaGroups: { data: { id: string }[] } } } }).data;
  assert.equal(data.attributes.email, "ana@example.com");
  assert.equal(data.relationships.betaGroups.data[0].id, BETA_GROUP_ID);
});

test("an existing tester is looked up, added to the group and sent a fresh invite", async () => {
  const f = fake([{ status: 409, body: { errors: [{ code: "ENTITY_ERROR" }] } }, { status: 200, body: { data: [{ id: "tester-9" }] } }, { status: 204 }, { status: 201 }]);
  const r = await invite(f);
  assert.equal(r.status, 200);
  assert.deepEqual(f.calls.map((c) => c.method), ["POST", "GET", "POST", "POST"]);
  assert.equal(f.calls[1].url, `https://api.appstoreconnect.apple.com/v1/betaTesters?filter[email]=${encodeURIComponent("ana@example.com")}&limit=1`);
  assert.equal(f.calls[2].url, `https://api.appstoreconnect.apple.com/v1/betaGroups/${BETA_GROUP_ID}/relationships/betaTesters`);
  assert.deepEqual(f.calls[2].body, { data: [{ type: "betaTesters", id: "tester-9" }] });
  assert.equal(f.calls[3].url, "https://api.appstoreconnect.apple.com/v1/betaTesterInvitations");
  assert.deepEqual(f.calls[3].body, { data: { type: "betaTesterInvitations", relationships: { app: { data: { type: "apps", id: APP_ID } }, betaTester: { data: { type: "betaTesters", id: "tester-9" } } } } });
});

test("an already invited tester counts as success", async () => {
  const f = fake([{ status: 409 }, { status: 200, body: { data: [{ id: "t" }] } }, { status: 409 }, { status: 422, body: { errors: [{ detail: "Tester has already been invited" }] } }]);
  assert.equal((await invite(f)).status, 200);
});

test("missing ASC env returns 503 and calls nothing", async () => {
  const f = fake([]);
  const r = await invite(f, { ASC_KEY_ID: "k" });
  assert.equal(r.status, 503);
  assert.ok(r.body.error);
  assert.equal(f.calls.length, 0);
});

test("a bad origin is refused before any Apple call", async () => {
  const f = fake([]);
  assert.equal((await invite(f, env, { origin: "https://evil.example", ip: "1" })).status, 403);
  assert.equal((await invite(f, env, { ip: "2" })).status, 403);
  assert.equal(f.calls.length, 0);
});

test("an Apple error returns 502 and logs only the status", async () => {
  const logged: unknown[][] = [];
  const original = console.error;
  console.error = (...args: unknown[]) => void logged.push(args);
  try {
    const r = await invite(fake([{ status: 500 }]));
    assert.equal(r.status, 502);
    assert.ok(r.body.error);
    const lookup = await invite(fake([{ status: 409 }, { status: 200, body: { data: [] } }]));
    assert.equal(lookup.status, 502);
    const resend = await invite(fake([{ status: 409 }, { status: 200, body: { data: [{ id: "t" }] } }, { status: 204 }, { status: 403 }]));
    assert.equal(resend.status, 502);
  } finally {
    console.error = original;
  }
  assert.ok(logged.length >= 3);
  assert.equal(JSON.stringify(logged).includes("example.com"), false);
});

test("the honeypot answers success without calling Apple", async () => {
  const f = fake([]);
  const r = await inviteTester({ email: "a@b.co", website: "spam" }, env, f.send, site, fresh());
  assert.equal(r.status, 200);
  assert.equal(f.calls.length, 0);
});
