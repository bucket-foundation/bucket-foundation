import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import InstallBlocksV3 from "../src/components/download/InstallBlocksV3";
import { APPIMAGE_WARNING_SHORT, INSTALL_COMMAND } from "../src/lib/download/install";
import { installersForV2, windowedInstallers } from "../src/lib/download/release-v2";
import type { ReleaseAsset } from "../src/lib/download/release";

const assets: ReleaseAsset[] = JSON.parse(fs.readFileSync(path.join(__dirname, "../src/lib/download/__fixtures__/bkt-v0.4.0.json"), "utf8"));
const installers = installersForV2(assets);

function words(html: string): number {
  return html.replace(/<[^>]*>/g, " ").split(/\s+/).filter(Boolean).length;
}

test("the matched os leads and the others sit inside Other platforms", () => {
  const html = renderToStaticMarkup(InstallBlocksV3({ os: "macos", installers }));
  const details = html.indexOf("<details");
  assert.ok(html.indexOf('data-os="macos"') < details);
  assert.ok(html.indexOf('data-os="windows"') > details);
  assert.ok(html.indexOf('data-os="linux"') > details);
  assert.match(html, /Other platforms/);
  assert.match(html, /aria-label="Copy macOS install command"/);
});

test("linux shows the one-line terminal warning and the pinned command", () => {
  const html = renderToStaticMarkup(InstallBlocksV3({ os: "linux", installers }));
  assert.ok(html.includes(APPIMAGE_WARNING_SHORT));
  assert.match(html, /pinned|install\.sh/);
  assert.match(APPIMAGE_WARNING_SHORT, /terminal/);
  assert.match(APPIMAGE_WARNING_SHORT, /Disks/);
});

test("renders the plain one-liners with no release and drops the long copy", () => {
  const html = renderToStaticMarkup(InstallBlocksV3({ os: "linux", installers: [] }));
  assert.ok(html.includes("install.sh"));
  assert.ok(html.includes(INSTALL_COMMAND.windows.slice(0, 20)));
  assert.doesNotMatch(html, /checks the signature|Paste this into|sha256/);
  assert.ok(words(html) < 70);
});

const tauri: ReleaseAsset[] = JSON.parse(fs.readFileSync(path.join(__dirname, "../src/lib/download/__fixtures__/bkt-v0.5.0-tauri.json"), "utf8"));

test("each system links its windowed installer above the terminal command", () => {
  const html = renderToStaticMarkup(InstallBlocksV3({ os: "macos", installers: installersForV2(tauri), windowed: windowedInstallers(tauri) }));
  const at = (name: string) => html.indexOf(`/bkt-v0.5.0/Bucket-desktop-0.5.0-${name}"`);
  const details = html.indexOf("<details");
  assert.ok(at("macos-arm64.dmg") > 0 && at("macos-arm64.dmg") < at("macos-x64.dmg"));
  assert.ok(at("macos-x64.dmg") < html.indexOf("install.sh") && at("macos-x64.dmg") < details);
  assert.ok(at("windows-x64.msi") > details);
  assert.ok(at("linux-x64.AppImage") > details);
  assert.equal(at("linux-x64.deb"), -1);
  assert.match(html, /Download the macOS app, Apple silicon/);
  assert.match(html, /Download the macOS app, Intel/);
  assert.match(html, /Download the Windows app</);
  assert.ok(words(html) < 70);
});

test("the linux command still installs the signed AppImage when a windowed one ships", () => {
  const html = renderToStaticMarkup(InstallBlocksV3({ os: "linux", installers: installersForV2(tauri), windowed: windowedInstallers(tauri) }));
  assert.ok(html.includes("/bkt-v0.5.0/Bucket-0.5.0-x86_64.AppImage&#x27;"));
  assert.equal((html.match(/data-windowed-installer="linux-x64"/g) ?? []).length, 1);
});

test("a release without Tauri bundles renders no installer link", () => {
  const html = renderToStaticMarkup(InstallBlocksV3({ os: "windows", installers }));
  assert.doesNotMatch(html, /data-windowed-installer/);
});
