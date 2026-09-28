import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const SCANNER = path.join(__dirname, "check-client-bundle-secrets.mjs");

function jwt(payload: object): string {
  const part = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
  return `${part({ alg: "HS256", typ: "JWT" })}.${part(payload)}.c2lnbmF0dXJlLWZpeHR1cmU`;
}

function scanWith(content: string) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "bundle-scan-"));
  fs.mkdirSync(path.join(dir, "chunks"));
  fs.writeFileSync(path.join(dir, "chunks", "page.js"), content);
  const run = spawnSync("node", [SCANNER, dir], { encoding: "utf8" });
  fs.rmSync(dir, { recursive: true, force: true });
  return run;
}

test("a clean chunk passes", () => {
  const run = scanWith(`const url = "https://example.test"; const anon = "${jwt({ role: "anon" })}";`);
  assert.equal(run.status, 0, run.stderr);
});

test("a chunk naming the public private-key variable fails", () => {
  const run = scanWith(`const k = process.env.NEXT_PUBLIC_WALLET_PRIVATE_KEY;`);
  assert.equal(run.status, 1);
  assert.match(run.stderr, /public env name for a private key/);
});

test("a chunk carrying a 64-hex key fails without printing it", () => {
  const key = "0x" + "ab".repeat(32);
  const run = scanWith(`const k = "${key}";`);
  assert.equal(run.status, 1);
  assert.match(run.stderr, /64-hex literal/);
  assert.ok(!run.stderr.includes(key) && !run.stdout.includes(key));
});

test("a service_role JWT fails without printing it", () => {
  const token = jwt({ role: "service_role", iss: "supabase" });
  const run = scanWith(`const k = "${token}";`);
  assert.equal(run.status, 1);
  assert.match(run.stderr, /service_role JWT/);
  assert.ok(!run.stderr.includes(token) && !run.stdout.includes(token));
});

test("an empty build directory fails", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "bundle-scan-"));
  const run = spawnSync("node", [SCANNER, dir], { encoding: "utf8" });
  fs.rmSync(dir, { recursive: true, force: true });
  assert.equal(run.status, 1);
});
