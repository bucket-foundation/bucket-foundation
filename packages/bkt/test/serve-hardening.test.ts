import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { startServe, type Serve, type ServeOptions } from "../src/serve";

const ME = 4242;
let clock = 0;
let peerUid = ME;
let s: Serve;
let dir: string;

function boot(extra: ServeOptions = {}) {
  clock = 1_000_000;
  peerUid = ME;
  s = startServe({ uid: ME, resolvePeerUid: () => peerUid, now: () => clock, ...extra });
}

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "bkt-ui-"));
});
afterEach(() => {
  s?.stop();
  rmSync(dir, { recursive: true, force: true });
});

const origin = () => `http://127.0.0.1:${s.port}`;
function req(path: string, init: { method?: string; body?: string; headers?: Record<string, string> } = {}) {
  return fetch(`${origin()}${path}`, { method: init.method ?? "GET", body: init.body, headers: { host: `127.0.0.1:${s.port}`, ...init.headers } });
}
async function nonce(): Promise<string> {
  return (await (await req("/")).text()).match(/"nonce":"([A-Za-z0-9_-]+)"/)![1];
}
async function token(): Promise<string> {
  const r = await req("/session", { method: "POST", body: JSON.stringify({ nonce: await nonce() }), headers: { origin: origin() } });
  expect(r.status).toBe(200);
  return ((await r.json()) as { token: string }).token;
}

describe("re-mint for reload", () => {
  test("remint serves a fresh page and revokes the old token", async () => {
    boot();
    const old = await token();
    expect((await req("/")).status).toBe(410);
    s.remint();
    const fresh = await token();
    expect(fresh).not.toBe(old);
    expect((await req("/local/ping", { headers: { authorization: `Bucket ${old}` } })).status).toBe(401);
    expect((await req("/local/ping", { headers: { authorization: `Bucket ${fresh}` } })).status).toBe(200);
  });

  test("the TTL counts from each mint", async () => {
    boot();
    clock += 30_001;
    expect((await req("/")).status).toBe(410);
    s.remint();
    clock += 29_000;
    expect((await req("/")).status).toBe(200);
  });

  test("a used page tells the user how to reopen", async () => {
    boot();
    await nonce();
    const r = await req("/");
    expect(r.status).toBe(410);
    expect(await r.text()).toContain("bkt app");
  });
});

describe("request limits and errors", () => {
  test("an oversized body is refused", async () => {
    boot({ maxBodyBytes: 1024, routes: { "POST /local/echo": async (r) => new Response(await r.text()) } });
    const t = await token();
    const r = await req("/local/echo", { method: "POST", body: "x".repeat(4096), headers: { authorization: `Bucket ${t}`, "content-type": "application/json" } });
    expect(r.status).toBe(413);
  });

  test("an oversized /session body is refused", async () => {
    boot({ maxBodyBytes: 1024 });
    await nonce();
    const r = await req("/session", { method: "POST", body: JSON.stringify({ nonce: "x".repeat(4096) }), headers: { origin: origin() } });
    expect(r.status).toBe(413);
  });

  test("a throwing route answers 500 with no stack and reports the error", async () => {
    const seen: string[] = [];
    boot({
      onError: (e) => seen.push(e.message),
      routes: {
        "GET /local/boom": () => {
          throw new Error("secret-detail");
        },
      },
    });
    const t = await token();
    const r = await req("/local/boom", { headers: { authorization: `Bucket ${t}` } });
    expect(r.status).toBe(500);
    expect(await r.text()).toBe("");
    expect(seen).toEqual(["secret-detail"]);
  });
});

describe("ui assets", () => {
  test("the page links built assets and serves them to the same user only", async () => {
    mkdirSync(join(dir, "assets"));
    writeFileSync(join(dir, "assets", "app.js"), "console.log(1)");
    writeFileSync(join(dir, "assets", "app.css"), "body{}");
    writeFileSync(join(dir, "assets", "notes.txt"), "skip");
    writeFileSync(join(dir, "assets", "Globe3d.js"), "export default 1");
    mkdirSync(join(dir, "textures", "earth"), { recursive: true });
    writeFileSync(join(dir, "textures", "earth", "landmask-2k.bin"), "mask");
    writeFileSync(join(dir, "textures", "earth", "secret.txt"), "no");
    boot({ uiDir: dir });
    const html = await (await req("/")).text();
    expect(html).toContain('<script type="module" src="/assets/app.js">');
    expect(html).toContain('<link rel="stylesheet" href="/assets/app.css">');
    expect(html).not.toContain("Globe3d.js");
    expect((await req("/assets/Globe3d.js")).status).toBe(200);
    expect((await req("/textures/earth/landmask-2k.bin")).headers.get("content-type")).toBe("application/octet-stream");
    expect((await req("/textures/earth/secret.txt")).status).toBe(401);
    const js = await req("/assets/app.js");
    expect(js.status).toBe(200);
    expect(js.headers.get("content-type")).toContain("javascript");
    expect((await req("/assets/notes.txt")).status).toBe(401);
    expect((await req("/assets/../serve.ts")).status).toBe(401);
    peerUid = ME + 1;
    expect((await req("/assets/app.js")).status).toBe(403);
  });
});
