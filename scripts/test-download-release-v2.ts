import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fetchLatestReleaseV2, hasDesktop, installersForV2, pickLatestV2, preferArch, windowedInstallers } from "../src/lib/download/release-v2";
import type { GitHubRelease, ReleaseAsset } from "../src/lib/download/release";

const fixture = (name: string): ReleaseAsset[] => JSON.parse(fs.readFileSync(path.join(__dirname, "../src/lib/download/__fixtures__", name), "utf8"));
const terminal = fixture("bkt-v0.4.0.json");
const desktop = fixture("bkt-v0.5.0-desktop.json");
const tauri = fixture("bkt-v0.5.0-tauri.json");
const summary = (list: ReturnType<typeof installersForV2>) => list.map((i) => `${i.os}/${i.arch}/${i.kind}/${i.name}`);

test("0.4.0 maps the bare macOS binaries, the AppImage, and the terminal binaries once per OS and architecture", () => {
  assert.deepEqual(summary(installersForV2(terminal)), [
    "macos/arm64/terminal/bkt-darwin-arm64",
    "macos/x64/terminal/bkt-darwin-x64",
    "windows/x64/terminal/bkt-windows-x64.exe",
    "linux/arm64/terminal/bkt-linux-arm64",
    "linux/x64/desktop/Bucket-0.4.0-x86_64.AppImage",
  ]);
});

test("checksums, manifests and signatures never render as downloads", () => {
  for (const list of [installersForV2(terminal), installersForV2(desktop)]) {
    for (const i of list) assert.doesNotMatch(i.name, /\.(sha256|manifest|manifest\.sig|sig)$/);
  }
});

test("each installer links its sha256 sidecar when the release has one", () => {
  const mac = installersForV2(terminal).find((i) => i.name === "bkt-darwin-arm64");
  assert.equal(mac?.checksumUrl, terminal.find((a) => a.name === "bkt-darwin-arm64.sha256")?.browser_download_url);
});

test("desktop assets win over terminal binaries for the same OS and architecture", () => {
  assert.deepEqual(summary(installersForV2(desktop)), [
    "macos/arm64/desktop/Bucket-0.5.0-arm64.dmg",
    "macos/x64/desktop/Bucket-0.5.0-x64.dmg",
    "windows/x64/desktop/Bucket-0.5.0-setup.exe",
    "linux/arm64/terminal/bkt-linux-arm64",
    "linux/x64/desktop/Bucket-0.5.0-x86_64.AppImage",
  ]);
});

test("hasDesktop tells which systems still wait for a desktop installer", () => {
  const list = installersForV2(terminal);
  assert.equal(hasDesktop(list, "linux"), true);
  assert.equal(hasDesktop(list, "macos"), false);
  assert.equal(hasDesktop(list, "windows"), false);
});

test("preferArch puts the detected architecture first", () => {
  const mac = installersForV2(terminal).filter((i) => i.os === "macos");
  assert.deepEqual(preferArch(mac, "x64").map((i) => i.arch), ["x64", "arm64"]);
  assert.deepEqual(preferArch(mac, null).map((i) => i.arch), ["arm64", "x64"]);
});

test("pickLatestV2 takes the newest published bkt-v release", () => {
  const rel = (tag: string, assets: ReleaseAsset[], extra: Partial<GitHubRelease> = {}): GitHubRelease => ({
    tag_name: tag, name: `Bucket ${tag}`, html_url: `https://example.org/${tag}`, draft: false, prerelease: false, assets, ...extra,
  });
  const got = pickLatestV2([rel("bkt-v0.5.0", [], { draft: true }), rel("hte-v9", []), rel("bkt-v0.4.0", terminal)]);
  assert.equal(got?.tag, "bkt-v0.4.0");
  assert.equal(got?.installers.length, 5);
  assert.equal(pickLatestV2([rel("other", [])]), null);
});

test("fetchLatestReleaseV2 returns null when GitHub fails", async () => {
  assert.equal(await fetchLatestReleaseV2((async () => new Response("", { status: 503 })) as typeof fetch), null);
  assert.equal(await fetchLatestReleaseV2((async () => { throw new Error("offline"); }) as typeof fetch), null);
});

test("a release with the Tauri bundles hands each system its windowed installer", () => {
  assert.deepEqual(windowedInstallers(tauri).map((w) => `${w.os}/${w.arch}/${w.format}/${w.name}`), [
    "macos/arm64/dmg/Bucket-desktop-0.5.0-macos-arm64.dmg",
    "macos/x64/dmg/Bucket-desktop-0.5.0-macos-x64.dmg",
    "windows/x64/msi/Bucket-desktop-0.5.0-windows-x64.msi",
    "linux/x64/AppImage/Bucket-desktop-0.5.0-linux-x64.AppImage",
  ]);
  for (const w of windowedInstallers(tauri)) assert.equal(w.checksumUrl, `${w.url}.sha256`);
});

test("the Tauri bundles leave the terminal installers and the signed AppImage command untouched", () => {
  assert.deepEqual(summary(installersForV2(tauri)), summary(installersForV2(terminal)).map((s) => s.replace("0.4.0", "0.5.0")));
  assert.deepEqual(windowedInstallers(terminal), []);
  assert.deepEqual(windowedInstallers(desktop), []);
});

test("pickLatestV2 carries the windowed installers of the release it picks", () => {
  const got = pickLatestV2([{ tag_name: "bkt-v0.5.0", name: "Bucket 0.5.0", html_url: "https://example.org", draft: false, prerelease: false, assets: tauri }]);
  assert.equal(got?.windowed.length, 4);
});
