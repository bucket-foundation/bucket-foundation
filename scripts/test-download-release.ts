import test from "node:test";
import assert from "node:assert/strict";
import { detectOs, fetchLatestRelease, installersFor, orderFor, pickLatest, type GitHubRelease } from "../src/lib/download/release";

const asset = (name: string) => ({ name, browser_download_url: `https://example.org/${name}`, size: 38_091_256 });
const rel = (tag: string, names: string[], extra: Partial<GitHubRelease> = {}): GitHubRelease => ({
  tag_name: tag, name: `Bucket desktop ${tag}`, html_url: `https://example.org/${tag}`, draft: false, prerelease: false, assets: names.map(asset), ...extra,
});

test("detectOs reads desktop user agents and skips phones", () => {
  assert.equal(detectOs("Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit"), "macos");
  assert.equal(detectOs("Mozilla/5.0 (Windows NT 10.0; Win64; x64)"), "windows");
  assert.equal(detectOs("Mozilla/5.0 (X11; Linux x86_64) Gecko"), "linux");
  assert.equal(detectOs("Mozilla/5.0 (Linux; Android 14; Pixel 8)"), null);
  assert.equal(detectOs("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)"), null);
  assert.equal(detectOs(null), null);
});

test("installersFor keeps installers and drops checksums and signatures", () => {
  const got = installersFor(["Bucket-0.3.0-x86_64.AppImage.sha256", "Bucket-0.3.0-x86_64.AppImage.manifest.sig", "Bucket-0.3.0-x86_64.AppImage", "Bucket-0.3.0.dmg", "Bucket-0.3.0-setup.exe"].map(asset));
  assert.deepEqual(got.map((i) => [i.os, i.name]), [["macos", "Bucket-0.3.0.dmg"], ["windows", "Bucket-0.3.0-setup.exe"], ["linux", "Bucket-0.3.0-x86_64.AppImage"]]);
  assert.deepEqual(installersFor(["Bucket-0.3.0-x86_64.AppImage.sha256"].map(asset)), []);
});

test("pickLatest takes the newest published bkt-v release", () => {
  const got = pickLatest([rel("bkt-v0.4.0", [], { draft: true }), rel("bkt-v0.4.0-rc1", [], { prerelease: true }), rel("hte-v9", []), rel("bkt-v0.3.0", ["Bucket-0.3.0-x86_64.AppImage"]), rel("bkt-v0.2.0", [])]);
  assert.equal(got?.tag, "bkt-v0.3.0");
  assert.equal(got?.installers[0].os, "linux");
  assert.equal(pickLatest([rel("other", [])]), null);
});

test("orderFor puts the visitor's system first", () => {
  const list = installersFor(["a.dmg", "b.exe", "c.AppImage"].map(asset));
  assert.deepEqual(orderFor("linux", list).map((i) => i.os), ["linux", "macos", "windows"]);
  assert.deepEqual(orderFor(null, list).map((i) => i.os), ["macos", "windows", "linux"]);
});

test("fetchLatestRelease returns null when GitHub fails", async () => {
  assert.equal(await fetchLatestRelease((async () => new Response("", { status: 503 })) as typeof fetch), null);
  assert.equal(await fetchLatestRelease((async () => { throw new Error("offline"); }) as typeof fetch), null);
  const ok = await fetchLatestRelease((async () => Response.json([rel("bkt-v0.3.0", ["x.dmg"])])) as typeof fetch);
  assert.equal(ok?.installers[0].os, "macos");
});
