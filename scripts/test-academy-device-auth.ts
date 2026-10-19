import test from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync, sign } from "node:crypto";
import { verifyDevice, type DeviceAuthDeps, type DeviceRecord } from "../src/lib/academy/device-auth";
import { createDeviceFlow, deviceIdFor, hashCode, tokenProofMessage, type CodeRow, type DeviceFlowDeps } from "../src/lib/academy/device-flow";
import { canonicalRequest, DEVICE_HEADER, formatDeviceHeader } from "../src/lib/academy/device-sign";

const NOW = Date.UTC(2026, 9, 19, 12);
const URL_ = "https://bucket.foundation/api/academy/review-log";

function keypair() {
  const { privateKey, publicKey } = generateKeyPairSync("ed25519");
  const der = publicKey.export({ type: "spki", format: "der" });
  const pub = Buffer.from(der.subarray(der.length - 32)).toString("base64");
  return { pub, id: deviceIdFor(pub), sign: (m: string) => sign(null, Buffer.from(m), privateKey).toString("base64") };
}

const k = keypair();
const other = keypair();

function jwt(claims: Record<string, unknown>): string {
  const b = (o: unknown) => Buffer.from(JSON.stringify(o)).toString("base64url");
  return `${b({ alg: "HS256" })}.${b(claims)}.sig`;
}

function signedReq(o: { method?: string; body?: string; ts?: number; nonce?: string; signer?: typeof k; id?: string; path?: string; header?: string; token?: string } = {}): Request {
  const method = o.method ?? "POST";
  const body = o.body ?? '{"reviews":[]}';
  const ts = o.ts ?? NOW;
  const nonce = o.nonce ?? "n0nce-n0nce-n0nce-1";
  const path = o.path ?? "/api/academy/review-log";
  const sig = (o.signer ?? k).sign(canonicalRequest(method, path, ts, nonce, body));
  const headers: Record<string, string> = { authorization: `Bearer ${o.token ?? jwt({ session_id: "s-device" })}` };
  if (o.header !== "") headers[DEVICE_HEADER] = o.header ?? formatDeviceHeader({ deviceId: o.id ?? k.id, ts, nonce, sig });
  return new Request(URL_, { method, headers, body: method === "GET" ? undefined : body });
}

function deps(over: Partial<DeviceAuthDeps> & { record?: DeviceRecord | null } = {}): DeviceAuthDeps & { nonces: Set<string> } {
  const nonces = new Set<string>();
  const record = over.record === undefined ? { public_key: k.pub, revoked_at: null } : over.record;
  return {
    nonces,
    now: () => NOW,
    lookup: async () => record,
    useNonce: async (_u, d, n) => (nonces.has(`${d}/${n}`) ? false : (nonces.add(`${d}/${n}`), true)),
    deviceSession: async (_u, sid) => sid === "s-device",
    ...over,
  };
}

const body = '{"reviews":[]}';

test("a signed request from a registered device passes and names the device", async () => {
  assert.deepEqual(await verifyDevice(signedReq(), "u1", body, deps()), { ok: true, deviceId: k.id });
});

test("a web request with no device header passes", async () => {
  assert.deepEqual(await verifyDevice(signedReq({ header: "", token: jwt({ session_id: "s-web" }) }), "u1", body, deps()), { ok: true, deviceId: null });
});

const failures: [string, () => Promise<unknown>][] = [
  ["header_required", () => verifyDevice(signedReq({ header: "" }), "u1", body, deps())],
  ["malformed", () => verifyDevice(signedReq({ header: "v1;id=x" }), "u1", body, deps())],
  ["malformed", () => verifyDevice(signedReq({ header: "v2;id=a;ts=1;nonce=aaaaaaaaaaaaaaaa;sig=x" }), "u1", body, deps())],
  ["stale", () => verifyDevice(signedReq({ ts: NOW - 61_000 }), "u1", body, deps())],
  ["stale", () => verifyDevice(signedReq({ ts: NOW + 61_000 }), "u1", body, deps())],
  ["unknown_device", () => verifyDevice(signedReq(), "u1", body, deps({ record: null }))],
  ["unknown_device", () => verifyDevice(signedReq(), "u1", body, deps({ record: { public_key: null, revoked_at: null } }))],
  ["revoked", () => verifyDevice(signedReq(), "u1", body, deps({ record: { public_key: k.pub, revoked_at: "2026-10-19T00:00:00Z" } }))],
  ["bad_signature", () => verifyDevice(signedReq({ signer: other }), "u1", body, deps())],
  ["bad_signature", () => verifyDevice(signedReq(), "u1", '{"reviews":[1]}', deps())],
  ["bad_signature", () => verifyDevice(signedReq({ path: "/api/academy/progress" }), "u1", body, deps())],
  ["lookup_failed", () => verifyDevice(signedReq(), "u1", body, deps({ lookup: async () => Promise.reject(new Error("db down")) }))],
  ["lookup_failed", () => verifyDevice(signedReq(), "u1", body, deps({ useNonce: async () => Promise.reject(new Error("db down")) }))],
];

for (const [reason, run] of failures) {
  test(`verifyDevice refuses with ${reason}`, async () => {
    assert.deepEqual(await run(), { ok: false, reason });
  });
}

test("verifyDevice refuses a replayed nonce", async () => {
  const d = deps();
  assert.equal((await verifyDevice(signedReq(), "u1", body, d)).ok, true);
  assert.deepEqual(await verifyDevice(signedReq(), "u1", body, d), { ok: false, reason: "replay" });
});

test("a bad signature does not burn the nonce", async () => {
  const d = deps();
  await verifyDevice(signedReq({ signer: other }), "u1", body, d);
  assert.equal(d.nonces.size, 0);
});

function flowWorld(over: Partial<DeviceFlowDeps> = {}) {
  const codes = new Map<string, CodeRow>();
  const calls: string[] = [];
  let t = NOW;
  const d: DeviceFlowDeps = {
    now: () => t,
    insertCode: async (row) => void codes.set(row.device_code_hash, { ...row }),
    pendingFor: async (id, nowIso) => Array.from(codes.values()).filter((r) => r.device_id === id && r.status === "pending" && r.expires_at > nowIso).length,
    peekCode: async (uc, nowIso) => Array.from(codes.values()).find((r) => r.user_code === uc && r.status === "pending" && r.expires_at > nowIso) ?? null,
    unconsumeCode: async (h) => {
      const row = codes.get(h);
      if (row?.status === "consumed") row.status = "approved";
    },
    approveCode: async (uc, uid, nowIso) => {
      const row = Array.from(codes.values()).find((r) => r.user_code === uc && r.status === "pending" && r.expires_at > nowIso);
      if (!row) return null;
      Object.assign(row, { status: "approved", user_id: uid });
      return row;
    },
    findCode: async (h) => codes.get(h) ?? null,
    consumeCode: async (h) => {
      const row = codes.get(h);
      if (!row || row.status !== "approved") return null;
      row.status = "consumed";
      return row;
    },
    registerDevice: async (uid, row, sid) => (calls.push(`register ${uid} ${row.device_id} ${sid}`), true),
    endSession: async (uid, sid) => void calls.push(`end ${uid} ${sid}`),
    mintSession: async () => ({ access_token: "at", refresh_token: "rt", expires_at: 1, session_id: "sid" }),
    revokeDevice: async (_u, id) => (id === k.id ? 2 : null),
    signOutOthers: async (tok) => void calls.push(`signout ${tok}`),
    publicConfig: () => ({ supabase_url: "http://sb", anon_key: "anon" }),
    ...over,
  };
  return { flow: createDeviceFlow(d), codes, calls, tick: (ms: number) => (t += ms) };
}

test("device-code flow: start, pending, approve, token, then the code is spent", async () => {
  const w = flowWorld();
  const s = await w.flow.start({ device_id: k.id, public_key: k.pub, kind: "cli", label: "laptop" }, "https://bucket.foundation/device");
  assert.equal(s.status, 200);
  const dc = s.body.device_code as string;
  const proof = (ts: number, signer = k) => ({ device_code: dc, ts, sig: signer.sign(tokenProofMessage(dc, ts)) });
  assert.equal((await w.flow.token(proof(NOW))).status, 428);
  assert.equal((await w.flow.token(proof(NOW, other))).status, 401);
  assert.equal((await w.flow.approve("u1", { user_code: (s.body.user_code as string).toLowerCase() })).status, 200);
  const t = await w.flow.token(proof(NOW));
  assert.equal(t.status, 200);
  assert.equal(t.body.access_token, "at");
  assert.equal(t.body.session_id, undefined);
  assert.deepEqual(w.calls, [`register u1 ${k.id} sid`]);
  assert.equal((await w.flow.token(proof(NOW))).status, 400);
  assert.equal(w.codes.get(hashCode(dc))!.status, "consumed");
});

test("device-code flow refuses a device id that is not derived from the key, stale proofs and expired codes", async () => {
  const w = flowWorld();
  assert.equal((await w.flow.start({ device_id: other.id, public_key: k.pub, kind: "cli" }, "x")).status, 400);
  const s = await w.flow.start({ device_id: k.id, public_key: k.pub, kind: "desktop" }, "x");
  const dc = s.body.device_code as string;
  assert.equal((await w.flow.token({ device_code: dc, ts: NOW - 120_000, sig: k.sign(tokenProofMessage(dc, NOW - 120_000)) })).status, 400);
  w.tick(11 * 60_000);
  assert.equal((await w.flow.approve("u1", { user_code: s.body.user_code })).status, 404);
  assert.equal((await w.flow.token({ device_code: dc, ts: NOW + 11 * 60_000, sig: k.sign(tokenProofMessage(dc, NOW + 11 * 60_000)) })).body.error, "expired_token");
});

test("a revoked device cannot sign in again and its minted session is ended", async () => {
  const w = flowWorld({ registerDevice: async () => false });
  const s = await w.flow.start({ device_id: k.id, public_key: k.pub, kind: "cli" }, "x");
  await w.flow.approve("u1", { user_code: s.body.user_code });
  const dc = s.body.device_code as string;
  const t = await w.flow.token({ device_code: dc, ts: NOW, sig: k.sign(tokenProofMessage(dc, NOW)) });
  assert.equal(t.status, 403);
  assert.deepEqual(w.calls, ["end u1 sid"]);
});

test("revoke marks the device and signs out the other sessions", async () => {
  const w = flowWorld();
  const r = await w.flow.revoke("u1", "web-token", { device_id: k.id });
  assert.equal(r.status, 200);
  assert.equal(r.body.signed_out_others, true);
  assert.equal(r.body.sessions_ended, 2);
  assert.deepEqual(w.calls, ["signout web-token"]);
  assert.equal((await w.flow.revoke("u1", "web-token", { device_id: other.id })).status, 404);
});

test("revoke reports a failed sign-out of the other sessions", async () => {
  const w = flowWorld({ signOutOthers: async () => Promise.reject(new Error("auth down")) });
  const r = await w.flow.revoke("u1", "web-token", { device_id: k.id });
  assert.equal(r.status, 200);
  assert.equal(r.body.signed_out_others, false);
});

test("a device may hold five open codes at most", async () => {
  const w = flowWorld();
  for (let i = 0; i < 5; i++) assert.equal((await w.flow.start({ device_id: k.id, public_key: k.pub, kind: "cli" }, "x")).status, 200);
  assert.equal((await w.flow.start({ device_id: k.id, public_key: k.pub, kind: "cli" }, "x")).status, 429);
});

test("peek names the waiting device, and a failed mint leaves the code redeemable", async () => {
  let fail = true;
  const w = flowWorld({ mintSession: async () => (fail ? Promise.reject(new Error("auth down")) : { access_token: "at", refresh_token: "rt", expires_at: 1, session_id: "sid" }) });
  const s = await w.flow.start({ device_id: k.id, public_key: k.pub, kind: "desktop", label: "studio mac" }, "x");
  const p = await w.flow.peek(s.body.user_code);
  assert.deepEqual(p.body, { kind: "desktop", label: "studio mac", device_id: k.id });
  await w.flow.approve("u1", { user_code: s.body.user_code });
  assert.equal((await w.flow.peek(s.body.user_code)).status, 404);
  const dc = s.body.device_code as string;
  const proof = () => ({ device_code: dc, ts: NOW, sig: k.sign(tokenProofMessage(dc, NOW)) });
  await assert.rejects(w.flow.token(proof()), /auth down/);
  fail = false;
  assert.equal((await w.flow.token(proof())).status, 200);
});
