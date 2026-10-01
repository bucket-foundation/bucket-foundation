import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dir, "../src-tauri");
const conf = JSON.parse(readFileSync(resolve(root, "tauri.conf.json"), "utf8"));
const cargo = readFileSync(resolve(root, "Cargo.toml"), "utf8");
const caps = JSON.parse(readFileSync(resolve(root, "capabilities/default.json"), "utf8"));

test("release builds ship without devtools", () => {
  expect(cargo).not.toMatch(/devtools/);
  for (const w of conf.app.windows) expect(w.devtools).not.toBe(true);
});

test("csp allows only the bundled origin", () => {
  const csp = conf.app.security.csp as Record<string, string>;
  expect(csp["default-src"]).toBe("'self'");
  expect(csp["script-src"]).toBe("'self'");
  expect(csp["object-src"]).toBe("'none'");
  for (const v of Object.values(csp)) expect(v).not.toMatch(/https?:|\*|unsafe-eval|unsafe-inline/);
});

test("the window holds no ipc permissions and remote pages get none", () => {
  expect(caps.permissions).toEqual([]);
  expect(caps.remote).toBeUndefined();
  expect(conf.app.withGlobalTauri).toBe(false);
});

test("updates verify against a minisign public key over https", () => {
  const u = conf.plugins.updater;
  expect(Buffer.from(u.pubkey, "base64").toString()).toMatch(/minisign public key/);
  for (const e of u.endpoints) expect(e).toMatch(/^https:\/\//);
});

test("the sidecar is the only external binary", () => {
  expect(conf.bundle.externalBin).toEqual(["binaries/bkt"]);
});

test("the desktop shell carries the bkt version in every manifest", () => {
  const read = (p: string) => readFileSync(resolve(root, p), "utf8");
  const bkt = JSON.parse(read("../../bkt/package.json")).version;
  expect(conf.version).toBe(bkt);
  expect(JSON.parse(read("../package.json")).version).toBe(bkt);
  expect(cargo.match(/^version = "(.+)"$/m)?.[1]).toBe(bkt);
  expect(read("Cargo.lock").match(/name = "bucket-desktop"\nversion = "(.+)"/)?.[1]).toBe(bkt);
});
