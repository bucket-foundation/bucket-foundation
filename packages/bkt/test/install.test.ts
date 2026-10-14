import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { appImageName, detectInstall, installRelease, swapInto, updateNow, updateRoutes, type Install, type UpdateView } from "../src/install";

let dir: string;
let pub: string;
const sign = (text: string) => {
  const f = join(dir, `m-${Math.random()}`);
  writeFileSync(f, text);
  const r = Bun.spawnSync(["ssh-keygen", "-q", "-Y", "sign", "-f", join(dir, "k"), "-n", "bucket-release", f]);
  if (r.exitCode !== 0) throw new Error(r.stderr.toString());
  return readFileSync(`${f}.sig`, "utf8");
};
const sha = (b: string) => createHash("sha256").update(b).digest("hex");

beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), "bkt-install-"));
  Bun.spawnSync(["ssh-keygen", "-q", "-t", "ed25519", "-N", "", "-C", "t", "-f", join(dir, "k")]);
  pub = readFileSync(join(dir, "k.pub"), "utf8");
});
afterAll(() => rmSync(dir, { recursive: true, force: true }));

const API = "https://api.github.com/repos/bucket-foundation/bucket-foundation/releases?per_page=30";
const DL = "https://github.com/bucket-foundation/bucket-foundation/releases/download/bkt-v0.6.0";

function release(asset: string, payload: string, opts: { sum?: string; version?: string } = {}) {
  const m = `name=${asset}\nversion=${opts.version ?? "0.6.0"}\nsha256=${opts.sum ?? sha(payload)}\nexpires=4000000000\n`;
  const files: Record<string, string> = {
    [API]: JSON.stringify([{ tag_name: "bkt-v0.6.0", draft: false, prerelease: false }]),
    [`${DL}/${asset}`]: payload,
    [`${DL}/${asset}.manifest`]: m,
    [`${DL}/${asset}.manifest.sig`]: sign(m),
  };
  return (async (url: string) => new Response(files[String(url)] ?? "missing", { status: files[String(url)] === undefined ? 404 : 200 })) as unknown as typeof fetch;
}

function target(name: string, body = "old build") {
  const d = mkdtempSync(join(dir, "t-"));
  const p = join(d, name);
  writeFileSync(p, body, { mode: 0o755 });
  return { d, p };
}

const deps = (install: Install, f: typeof fetch, current = "0.5.0") => ({ fetch: f, install, current, pubkey: pub, arch: "x64", platform: "linux", now: () => 1_000 });

describe("install kind", () => {
  const base = { env: {}, execPath: "/home/u/.local/bin/bkt", platform: "linux", arch: "x64", flatpakInfo: false };
  test("reads the environment and the binary path", () => {
    expect(detectInstall(base)).toEqual({ kind: "binary", path: "/home/u/.local/bin/bkt" });
    expect(detectInstall({ ...base, env: { APPIMAGE: "/home/u/Apps/Bucket.AppImage" } })).toEqual({ kind: "appimage", path: "/home/u/Apps/Bucket.AppImage" });
    expect(detectInstall({ ...base, env: { BKT_SIDECAR: "1", APPIMAGE: "/x" } }).kind).toBe("desktop");
    expect(detectInstall({ ...base, flatpakInfo: true }).kind).toBe("flatpak");
    expect(detectInstall({ ...base, execPath: "/usr/bin/bkt" }).kind).toBe("package");
    expect(detectInstall({ ...base, execPath: "/home/u/.bun/bin/bun" }).kind).toBe("source");
  });

  test("names the AppImage asset after the release version", () => {
    expect(appImageName("0.6.0", "x64")).toBe("Bucket-0.6.0-x86_64.AppImage");
    expect(appImageName("0.6.0", "arm64")).toBe("Bucket-0.6.0-aarch64.AppImage");
  });
});

describe("update install", () => {
  test("replaces a binary after the checksum verifies and keeps its mode", async () => {
    const { d, p } = target("bkt");
    const o = await updateNow(deps({ kind: "binary", path: p }, release("bkt-linux-x64", "new build")));
    expect(o).toEqual({ status: "installed", version: "0.6.0" });
    expect(readFileSync(p, "utf8")).toBe("new build");
    expect(statSync(p).mode & 0o777).toBe(0o755);
    expect(readdirSync(d)).toEqual(["bkt"]);
  });

  test("replaces an AppImage with the versioned AppImage asset", async () => {
    const { p } = target("Bucket.AppImage");
    const o = await updateNow(deps({ kind: "appimage", path: p }, release("Bucket-0.6.0-x86_64.AppImage", "new image")));
    expect(o.status).toBe("installed");
    expect(readFileSync(p, "utf8")).toBe("new image");
  });

  test("a checksum mismatch leaves the old file and no partial download", async () => {
    const { d, p } = target("bkt");
    const o = await updateNow(deps({ kind: "binary", path: p }, release("bkt-linux-x64", "tampered", { sum: sha("signed build") })));
    expect(o).toMatchObject({ status: "error", error: expect.stringContaining("does not match the signed checksum") });
    expect(readFileSync(p, "utf8")).toBe("old build");
    expect(readdirSync(d)).toEqual(["bkt"]);
  });

  test("a bad manifest signature downloads nothing", async () => {
    const { p } = target("bkt");
    const asked: string[] = [];
    const good = release("bkt-linux-x64", "new build");
    const forged = (async (url: string) => {
      asked.push(String(url));
      if (String(url).endsWith(".manifest")) return new Response(`name=bkt-linux-x64\nversion=0.6.0\nsha256=${"b".repeat(64)}\nexpires=4000000000\n`);
      return good(url);
    }) as unknown as typeof fetch;
    const o = await updateNow(deps({ kind: "binary", path: p }, forged));
    expect(o).toMatchObject({ status: "error", error: expect.stringContaining("signature check failed") });
    expect(asked).not.toContain(`${DL}/bkt-linux-x64`);
    expect(readFileSync(p, "utf8")).toBe("old build");
  });

  test("a download over the size cap is refused", async () => {
    const { p } = target("bkt");
    const r = { status: "available" as const, version: "0.6.0", tag: "bkt-v0.6.0", asset: "bkt-linux-x64", sha256: sha("x".repeat(64)), url: `${DL}/bkt-linux-x64` };
    const f = (async () => new Response("x".repeat(64))) as unknown as typeof fetch;
    await expect(installRelease(r, p, { fetch: f, maxBytes: 10 })).rejects.toThrow("larger than");
    expect(readFileSync(p, "utf8")).toBe("old build");
  });

  test("the swap restores the old file when the new one cannot move in", () => {
    const { p } = target("bkt");
    expect(() => swapInto(p, join(dir, "no-such-file"))).toThrow();
    expect(readFileSync(p, "utf8")).toBe("old build");
    expect(existsSync(`${p}.old`)).toBe(false);
  });

  test("current, and installs that update elsewhere", async () => {
    const f = release("bkt-linux-x64", "new build");
    expect(await updateNow(deps({ kind: "binary", path: "/nope" }, f, "0.6.0"))).toEqual({ status: "current", version: "0.6.0" });
    expect(await updateNow(deps({ kind: "flatpak", path: null }, f))).toMatchObject({ status: "manual", version: "0.6.0", instruction: "Update Bucket with: flatpak update" });
    expect(await updateNow(deps({ kind: "desktop", path: null }, f))).toMatchObject({ status: "manual", instruction: expect.stringContaining("desktop app") });
  });
});

describe("update routes", () => {
  test("GET reports the check and POST installs", async () => {
    const { p } = target("bkt");
    const r = updateRoutes(deps({ kind: "binary", path: p }, release("bkt-linux-x64", "new build")));
    const u = new URL("http://127.0.0.1/local/update");
    const view = (await (await r["GET /local/update"](new Request(u), u)).json()) as UpdateView;
    expect(view).toMatchObject({ current: "0.5.0", kind: "binary", selfUpdate: true, instruction: null, result: { status: "available", version: "0.6.0" } });
    const res = await r["POST /local/update/install"](new Request(u, { method: "POST", body: "{}" }), u);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "installed", version: "0.6.0" });
  });
});
