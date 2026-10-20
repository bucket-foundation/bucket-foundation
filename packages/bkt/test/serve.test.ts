import { afterEach, describe, expect, test } from "bun:test";
import { startServe, type Serve } from "../src/serve";

const ME = 4242;
let clock = 1_000_000;
let peerUid = ME;
let s: Serve;

function boot() {
  clock = 1_000_000;
  peerUid = ME;
  s = startServe({ uid: ME, resolvePeerUid: () => peerUid, now: () => clock });
  return s;
}

afterEach(() => s?.stop());

const host = () => `127.0.0.1:${s.port}`;
const origin = () => `http://${host()}`;

function req(path: string, init: RequestInit & { headers?: Record<string, string> } = {}) {
  return fetch(`http://127.0.0.1:${s.port}${path}`, { ...init, headers: { host: host(), ...init.headers } });
}

async function nonceFromPage(): Promise<string> {
  const r = await req("/");
  expect(r.status).toBe(200);
  const m = (await r.text()).match(/"nonce":"([A-Za-z0-9_-]+)"/);
  expect(m).not.toBeNull();
  return m![1];
}

function postSession(nonce: string, headers: Record<string, string> = {}) {
  return req("/session", {
    method: "POST",
    headers: { origin: origin(), "content-type": "application/json", ...headers },
    body: JSON.stringify({ nonce }),
  });
}

async function token(): Promise<string> {
  const r = await postSession(await nonceFromPage());
  expect(r.status).toBe(200);
  return ((await r.json()) as { token: string }).token;
}

describe("bkt serve fails closed", () => {
  test("binds loopback only", () => {
    boot();
    expect(s.hostname).toBe("127.0.0.1");
  });

  test("page CSP is unchanged", async () => {
    boot();
    const csp = (await req("/")).headers.get("content-security-policy") ?? "";
    expect(csp.replace(/'sha256-[A-Za-z0-9+/=]+'/, "'sha256-HASH'")).toBe(
      "default-src 'none'; script-src 'self' 'sha256-HASH'; connect-src 'self'; worker-src 'self'; style-src 'self'; img-src 'self' data:; media-src 'self'; font-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
    );
    expect(csp).not.toContain("blob:");
  });

  test("page carries a strict CSP with a script hash and no cookies", async () => {
    boot();
    const r = await req("/");
    const csp = r.headers.get("content-security-policy") ?? "";
    expect(csp).toContain("default-src 'none'");
    expect(csp).toMatch(/script-src 'self' 'sha256-[A-Za-z0-9+/=]+';/);
    expect(csp).not.toContain("unsafe-inline");
    expect(r.headers.get("set-cookie")).toBeNull();
  });

  test("missing token is rejected", async () => {
    boot();
    await token();
    expect((await req("/local/ping")).status).toBe(401);
  });

  test("invalid token is rejected", async () => {
    boot();
    await token();
    expect((await req("/local/ping", { headers: { authorization: "Bucket nope" } })).status).toBe(401);
    expect((await req("/local/ping", { headers: { authorization: "Bearer nope" } })).status).toBe(401);
  });

  test("valid header token is accepted", async () => {
    boot();
    const t = await token();
    expect((await req("/local/ping", { headers: { authorization: `Bucket ${t}` } })).status).toBe(200);
  });

  test("cookie-only auth is rejected", async () => {
    boot();
    const t = await token();
    const r = await req("/local/ping", { headers: { cookie: `bucket=${t}; token=${t}; session=${t}` } });
    expect(r.status).toBe(401);
  });

  test("wrong Host is rejected", async () => {
    boot();
    const t = await token();
    for (const h of [`localhost:${s.port}`, "127.0.0.1", `127.0.0.1:${s.port + 1}`]) {
      expect((await req("/local/ping", { headers: { host: h, authorization: `Bucket ${t}` } })).status).toBe(403);
      expect((await req("/", { headers: { host: h } })).status).toBe(403);
    }
  });

  test("DNS-rebinding hostname is rejected before the nonce is served", async () => {
    boot();
    const r = await req("/", { headers: { host: `evil.example:${s.port}` } });
    expect(r.status).toBe(403);
    expect(await r.text()).not.toContain("nonce");
    await nonceFromPage();
  });

  test("bad Origin is rejected", async () => {
    boot();
    const n = await nonceFromPage();
    expect((await postSession(n, { origin: "http://evil.example" })).status).toBe(403);
    expect((await postSession(n, { origin: `http://localhost:${s.port}` })).status).toBe(403);
    const t = await token().catch(() => null);
    expect(t).toBeNull();
  });

  test("POST /session without Origin is rejected", async () => {
    boot();
    const n = await nonceFromPage();
    const r = await req("/session", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ nonce: n }) });
    expect(r.status).toBe(403);
  });

  test("authed route with foreign Origin is rejected", async () => {
    boot();
    const t = await token();
    const r = await req("/local/ping", { headers: { authorization: `Bucket ${t}`, origin: "http://evil.example" } });
    expect(r.status).toBe(403);
  });

  test("replayed nonce is rejected", async () => {
    boot();
    const n = await nonceFromPage();
    expect((await postSession(n)).status).toBe(200);
    expect((await postSession(n)).status).toBe(401);
  });

  test("the page serves the nonce once", async () => {
    boot();
    await nonceFromPage();
    const r = await req("/");
    expect(r.status).toBe(410);
    expect(await r.text()).not.toContain("nonce");
  });

  test("wrong nonce is rejected and does not burn the real one", async () => {
    boot();
    const n = await nonceFromPage();
    expect((await postSession("x".repeat(43))).status).toBe(401);
    expect((await postSession(n)).status).toBe(200);
  });

  test("expired nonce is rejected at the page", async () => {
    boot();
    clock += 30_001;
    const r = await req("/");
    expect(r.status).toBe(410);
    expect(await r.text()).not.toContain("nonce");
  });

  test("expired nonce is rejected at /session", async () => {
    boot();
    const n = await nonceFromPage();
    clock += 30_001;
    expect((await postSession(n)).status).toBe(401);
  });

  test("peer with another UID gets 403 at the page", async () => {
    boot();
    peerUid = ME + 1;
    const r = await req("/");
    expect(r.status).toBe(403);
    expect(await r.text()).not.toContain("nonce");
    peerUid = ME;
    await nonceFromPage();
  });

  test("peer with another UID gets 403 at /session", async () => {
    boot();
    const n = await nonceFromPage();
    peerUid = ME + 1;
    expect((await postSession(n)).status).toBe(403);
  });

  test("unresolvable peer UID fails closed", async () => {
    boot();
    s.stop();
    s = startServe({ uid: ME, resolvePeerUid: () => null, now: () => clock });
    expect((await req("/")).status).toBe(403);
  });

  test("the default resolver reads this process as the peer over /proc/net/tcp", async () => {
    s = startServe({});
    expect((await req("/")).status).toBe(200);
  });

  test("only one session token is ever minted", async () => {
    boot();
    await token();
    expect((await req("/")).status).toBe(410);
  });
});

describe("eSpeak clips route", () => {
  const KEY = "0123456789abcdef";
  function bootWithClips() {
    const { mkdirSync, mkdtempSync, writeFileSync } = require("node:fs") as typeof import("node:fs");
    const { join } = require("node:path") as typeof import("node:path");
    const dir = mkdtempSync(join(require("node:os").tmpdir(), "bkt-clips-"));
    mkdirSync(join(dir, "academy-app", "audio", "he"), { recursive: true });
    writeFileSync(join(dir, "academy-app", "audio", "index.json"), JSON.stringify({ he: [KEY] }));
    writeFileSync(join(dir, "academy-app", "audio", "he", `${KEY}.mp3`), new Uint8Array([0xff, 0xfb, 0x90, 0x00]));
    clock = 1_000_000;
    peerUid = ME;
    s = startServe({ uid: ME, resolvePeerUid: () => peerUid, now: () => clock, uiDir: dir });
  }

  test("a clip path returns 200 audio/mpeg with its bytes", async () => {
    bootWithClips();
    const r = await req(`/academy-app/audio/he/${KEY}.mp3`);
    expect(r.status).toBe(200);
    expect(r.headers.get("content-type")).toBe("audio/mpeg");
    expect((await r.arrayBuffer()).byteLength).toBe(4);
    const i = await req("/academy-app/audio/index.json");
    expect(i.status).toBe(200);
    expect(await i.json()).toEqual({ he: [KEY] });
  });

  test("traversal and non-clip paths are 404 even with a session", async () => {
    bootWithClips();
    const t = await token();
    for (const p of ["/academy-app/audio/he/%2e%2e%2findex.json", "/academy-app/audio/%2e%2e/corpus/index.json", "/academy-app/audio/he/fedcba9876543210.mp3", "/academy-app/audio/he/x.mp3", "/academy-app/audio/he/"]) {
      expect((await req(p, { headers: { authorization: `Bucket ${t}` } })).status).toBe(404);
    }
  });

  test("a foreign Host or Origin is refused", async () => {
    bootWithClips();
    const path = `/academy-app/audio/he/${KEY}.mp3`;
    expect((await req(path, { headers: { host: `localhost:${s.port}` } })).status).toBe(403);
    expect((await req(path, { headers: { origin: "http://evil.example" } })).status).toBe(403);
  });

  test("a peer owned by another user is refused", async () => {
    bootWithClips();
    peerUid = ME + 1;
    expect((await req(`/academy-app/audio/he/${KEY}.mp3`)).status).toBe(403);
  });
});
