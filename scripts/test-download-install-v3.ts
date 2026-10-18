import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import InstallBlocksV3 from "../src/components/download/InstallBlocksV3";
import { APPIMAGE_WARNING_SHORT, DIRECT_FILE_STEP, DIRECT_FILE_STEP_RAW, DIRECT_FILE_SUMMARY, FIRST_OPEN, INSTALL_COMMAND, LINUX_INSTALL_NOTE, LINUX_PACKAGE_LABEL, appImageRunSteps } from "../src/lib/download/install";
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
  assert.ok(at("linux-x64.AppImage.tar.gz") > details);
  assert.ok(at("linux-x64.deb") > details && at("linux-x64.deb") < at("linux-x64.AppImage.tar.gz"));
  assert.match(html, /Download the macOS app, Apple silicon/);
  assert.match(html, /Download the macOS app, Intel/);
  assert.match(html, /Download the Windows app</);
  assert.ok(html.includes(`/bkt-v0.5.0/Bucket-desktop-0.5.0-macos-arm64.dmg.sha256"`));
  assert.equal((html.match(/data-checksum=/g) ?? []).length, 5);
});

test("an unsigned installer carries its first-open steps inside a disclosure", () => {
  const html = renderToStaticMarkup(InstallBlocksV3({ os: "macos", installers: installersForV2(tauri), windowed: windowedInstallers(tauri) }));
  assert.match(html, /<details data-first-open="macos"><summary[^>]*>First open on macOS<\/summary>/);
  assert.ok(html.includes(FIRST_OPEN.macos!.steps.replace("&", "&amp;")));
  assert.match(html, /<details data-first-open="windows">/);
  assert.match(FIRST_OPEN.macos!.steps, /Open Anyway/);
  assert.match(FIRST_OPEN.windows!.steps, /More info, then Run anyway/);
  assert.doesNotMatch(html, /data-first-open="linux"/);
  const visible = html.replace(/<details data-direct-file[\s\S]*?<\/details>/g, "").replace(/<details data-first-open[\s\S]*?<\/details>/g, (d) => d.replace(/<p[\s\S]*?<\/p>/, ""));
  assert.ok(words(visible) < 70);
});

test("a signed installer shows no first-open steps", () => {
  const signed = tauri.filter((a) => !a.name.endsWith(".unsigned"));
  const html = renderToStaticMarkup(InstallBlocksV3({ os: "macos", installers: installersForV2(signed), windowed: windowedInstallers(signed) }));
  assert.doesNotMatch(html, /data-first-open/);
  assert.match(html, /data-windowed-installer="macos-arm64"/);
});

const withRpm: ReleaseAsset[] = [...tauri, ...tauri.filter((a) => /linux-x64\.deb(\.sha256)?$/.test(a.name)).map((a) => ({ ...a, name: a.name.replace(".deb", ".rpm"), browser_download_url: a.browser_download_url.replace(".deb", ".rpm") }))];
const linuxHtml = (list: ReleaseAsset[]) => renderToStaticMarkup(InstallBlocksV3({ os: "linux", installers: installersForV2(list), windowed: windowedInstallers(list) }));
const linuxBlock = (html: string) => html.slice(html.indexOf('data-os="linux"'), html.indexOf("<details data-other-platforms"));

test("the linux command still installs the signed AppImage when a windowed one ships", () => {
  const html = linuxHtml(tauri);
  assert.ok(html.includes("/bkt-v0.5.0/Bucket-0.5.0-x86_64.AppImage&#x27;"));
  assert.equal((html.match(/data-windowed-installer="linux-x64"/g) ?? []).length, 2);
});

test("on linux the install command leads and says what it does", () => {
  const block = linuxBlock(linuxHtml(withRpm));
  const command = block.indexOf("release/install.sh");
  assert.ok(block.indexOf("data-primary-install") > 0 && block.indexOf("data-primary-install") < command);
  assert.ok(command < block.indexOf("<a "));
  assert.ok(block.includes(LINUX_INSTALL_NOTE));
  assert.equal((block.match(/install\.sh/g) ?? []).length, 1);
});

test("on linux the deb and rpm packages are the only visible downloads", () => {
  const block = linuxBlock(linuxHtml(withRpm));
  const visible = block.replace(/<details data-direct-file[\s\S]*?<\/details>/, "");
  assert.match(visible, /data-format="deb"[^>]*>Download the \.deb, Debian and Ubuntu</);
  assert.match(visible, /data-format="rpm"[^>]*>Download the \.rpm, Fedora and openSUSE</);
  assert.ok(visible.indexOf(LINUX_PACKAGE_LABEL.deb) < visible.indexOf(LINUX_PACKAGE_LABEL.rpm));
  assert.doesNotMatch(visible, /\.AppImage"/);
  assert.doesNotMatch(visible, /Download the Linux app/);
});

test("an older release without the tarball keeps the raw AppImage beside its chmod command", () => {
  const block = linuxBlock(linuxHtml(tauri.filter((a) => !a.name.includes(".tar.gz"))));
  const direct = /<details data-direct-file[^>]*>[\s\S]*?<\/details>/.exec(block)?.[0] ?? "";
  assert.ok(direct.includes("<summary") && direct.includes(DIRECT_FILE_SUMMARY));
  assert.doesNotMatch(direct, /^<details[^>]*\sopen/);
  const chmod = direct.indexOf("chmod +x ~/Downloads/Bucket-desktop-0.5.0-linux-x64.AppImage");
  const link = direct.indexOf('/bkt-v0.5.0/Bucket-desktop-0.5.0-linux-x64.AppImage"');
  assert.ok(chmod > 0 && chmod < link);
  assert.ok(direct.includes("Bucket-desktop-0.5.0-linux-x64.AppImage.sha256"));
  assert.ok(direct.includes(APPIMAGE_WARNING_SHORT));
  assert.equal(block.split(APPIMAGE_WARNING_SHORT).length, 2);
  assert.equal(appImageRunSteps("a.AppImage"), "chmod +x ~/Downloads/a.AppImage\n~/Downloads/a.AppImage");
  assert.ok(direct.includes(DIRECT_FILE_STEP_RAW));
});

test("the direct file is the AppImage tarball, so a double click never reaches Disks", () => {
  const block = linuxBlock(linuxHtml(tauri));
  const direct = /<details data-direct-file[^>]*>[\s\S]*?<\/details>/.exec(block)?.[0] ?? "";
  assert.ok(direct.includes('/bkt-v0.5.0/Bucket-desktop-0.5.0-linux-x64.AppImage.tar.gz"'));
  assert.ok(direct.includes("Bucket-desktop-0.5.0-linux-x64.AppImage.tar.gz.sha256"));
  assert.doesNotMatch(direct, /linux-x64\.AppImage"/);
  assert.doesNotMatch(direct, /chmod/);
  assert.ok(direct.includes("tar -xzf ~/Downloads/Bucket-desktop-0.5.0-linux-x64.AppImage.tar.gz -C ~/Downloads"));
  assert.ok(direct.includes(DIRECT_FILE_STEP));
  assert.equal(appImageRunSteps("a.AppImage.tar.gz"), "tar -xzf ~/Downloads/a.AppImage.tar.gz -C ~/Downloads\n~/Downloads/a.AppImage");
  assert.ok(block.includes("/bkt-v0.5.0/Bucket-0.5.0-x86_64.AppImage&#x27;"));
});

test("macOS and Windows keep the installer link above the command", () => {
  const html = renderToStaticMarkup(InstallBlocksV3({ os: "windows", installers: installersForV2(tauri), windowed: windowedInstallers(tauri) }));
  assert.ok(html.indexOf("windows-x64.msi") < html.indexOf("install.ps1"));
  assert.doesNotMatch(html.slice(0, html.indexOf("<details data-other-platforms")), /data-direct-file|data-primary-install/);
});

test("a release without Tauri bundles renders no installer link", () => {
  const html = renderToStaticMarkup(InstallBlocksV3({ os: "windows", installers }));
  assert.doesNotMatch(html, /data-windowed-installer/);
});
