import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { RELEASE_PUBKEY, verifySshSig } from "../src/sshsig";
import { assetName, checkUpdate, describeUpdate, newer, parseManifest } from "../src/update";

let dir: string;
let pub: string;
const sign = (text: string, ns = "bucket-release", key = join(dir, "k")) => {
  const f = join(dir, `m-${Math.random()}`);
  writeFileSync(f, text);
  const r = Bun.spawnSync(["ssh-keygen", "-q", "-Y", "sign", "-f", key, "-n", ns, f]);
  if (r.exitCode !== 0) throw new Error(r.stderr.toString());
  return readFileSync(`${f}.sig`, "utf8");
};

beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), "bkt-sig-"));
  Bun.spawnSync(["ssh-keygen", "-q", "-t", "ed25519", "-N", "", "-C", "t", "-f", join(dir, "k")]);
  Bun.spawnSync(["ssh-keygen", "-q", "-t", "ed25519", "-N", "", "-C", "o", "-f", join(dir, "other")]);
  pub = readFileSync(join(dir, "k.pub"), "utf8");
});
afterAll(() => rmSync(dir, { recursive: true, force: true }));

describe("sshsig", () => {
  test("pins the published release key", () => {
    expect(RELEASE_PUBKEY + "\n").toBe(readFileSync(join(import.meta.dir, "../../../release/bucket-release.pub"), "utf8"));
  });

  test("accepts a signature from the pinned key", () => {
    expect(verifySshSig("hello\n", sign("hello\n"), pub)).toBe(true);
  });

  test("rejects a changed message, another namespace, another key and garbage", () => {
    const sig = sign("hello\n");
    expect(verifySshSig("hellO\n", sig, pub)).toBe(false);
    expect(verifySshSig("hello\n", sign("hello\n", "other"), pub)).toBe(false);
    expect(verifySshSig("hello\n", sign("hello\n", "bucket-release", join(dir, "other")), pub)).toBe(false);
    expect(verifySshSig("hello\n", sig, RELEASE_PUBKEY)).toBe(false);
    expect(verifySshSig("hello\n", "-----BEGIN SSH SIGNATURE-----\nAAAA\n-----END SSH SIGNATURE-----", pub)).toBe(false);
    expect(verifySshSig("hello\n", "", pub)).toBe(false);
  });
});

describe("update check", () => {
  const manifest = (v: string, name = "bkt-linux-x64", expires = 4_000_000_000) =>
    `name=${name}\nversion=${v}\nsha256=${"a".repeat(64)}\nexpires=${expires}\n`;
  const fake = (files: Record<string, string>) =>
    (async (url: string) => {
      const body = files[String(url)];
      return new Response(body ?? "missing", { status: body === undefined ? 404 : 200 });
    }) as unknown as typeof fetch;
  const API = "https://api.github.com/repos/bucket-foundation/bucket-foundation/releases?per_page=30";
  const BASE = "https://github.com/bucket-foundation/bucket-foundation/releases/download/bkt-v0.4.0/bkt-linux-x64";
  const releases = JSON.stringify([{ tag_name: "bkt-v0.4.0", draft: false, prerelease: false }]);
  const deps = (m: string, sig: string, current = "0.3.0") => ({
    fetch: fake({ [API]: releases, [`${BASE}.manifest`]: m, [`${BASE}.manifest.sig`]: sig }),
    now: () => 1_000_000_000_000,
    current,
    asset: "bkt-linux-x64",
    pubkey: pub,
  });

  test("offers a newer release only after the signature verifies", async () => {
    const m = manifest("0.4.0");
    const r = await checkUpdate(deps(m, sign(m)));
    expect(r.status).toBe("available");
    expect(describeUpdate(r, "linux")).toContain("signature verified");
    expect((await checkUpdate(deps(m, sign(m), "0.4.0"))).status).toBe("current");
  });

  test("refuses a bad signature, a renamed asset, a version mismatch and an expired manifest", async () => {
    const m = manifest("0.4.0");
    const forged = await checkUpdate(deps(manifest("0.5.0"), sign(m)));
    expect(forged).toEqual({ status: "error", error: "signature check failed for bkt-linux-x64 in bkt-v0.4.0" });
    const renamed = manifest("0.4.0", "bkt-darwin-arm64");
    expect((await checkUpdate(deps(renamed, sign(renamed)))).status).toBe("error");
    const mismatch = manifest("0.9.0");
    expect(await checkUpdate(deps(mismatch, sign(mismatch)))).toMatchObject({ status: "error", error: expect.stringContaining("does not match") });
    const old = manifest("0.4.0", "bkt-linux-x64", 1);
    expect(await checkUpdate(deps(old, sign(old)))).toMatchObject({ status: "error", error: expect.stringContaining("expired") });
  });

  test("a missing signature is an error", async () => {
    const d = deps(manifest("0.4.0"), "");
    d.fetch = fake({ [API]: releases, [`${BASE}.manifest`]: manifest("0.4.0") });
    expect((await checkUpdate(d)).status).toBe("error");
  });

  test("asset names, versions and manifests", () => {
    expect(assetName("darwin", "arm64")).toBe("bkt-darwin-arm64");
    expect(assetName("win32", "x64")).toBe("bkt-windows-x64.exe");
    expect(assetName("linux", "arm64")).toBe("bkt-linux-arm64");
    expect(() => assetName("freebsd", "x64")).toThrow("no bkt build");
    expect(newer("0.10.0", "0.9.9")).toBe(true);
    expect(newer("0.4.0", "0.4.0")).toBe(false);
    expect(() => parseManifest("version=1\n")).toThrow("malformed");
  });
});
