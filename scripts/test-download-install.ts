import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import InstallBlocks, { osOrder } from "../src/components/download/InstallBlocks";
import { APPIMAGE_RUN_STEPS, APPIMAGE_WARNING, INSTALL_COMMAND } from "../src/lib/download/install";
import { installersForV2 } from "../src/lib/download/release-v2";
import type { ReleaseAsset } from "../src/lib/download/release";

const assets: ReleaseAsset[] = JSON.parse(fs.readFileSync(path.join(__dirname, "../src/lib/download/__fixtures__/bkt-v0.4.0.json"), "utf8"));
const installers = installersForV2(assets);

test("linux install command is the curl one-liner for install.sh on main", () => {
  assert.equal(
    INSTALL_COMMAND.linux,
    "curl -fsSL https://raw.githubusercontent.com/bucket-foundation/bucket-foundation/main/scripts/install.sh | sh",
  );
  assert.equal(INSTALL_COMMAND.macos, INSTALL_COMMAND.linux);
});

test("windows install command pipes install.ps1 to iex", () => {
  assert.equal(
    INSTALL_COMMAND.windows,
    "irm https://raw.githubusercontent.com/bucket-foundation/bucket-foundation/main/scripts/install.ps1 | iex",
  );
});

test("AppImage run steps and warning", () => {
  assert.deepEqual([...APPIMAGE_RUN_STEPS], ["chmod +x Bucket-*.AppImage", "./Bucket-*.AppImage"]);
  assert.match(APPIMAGE_WARNING, /terminal/);
  assert.match(APPIMAGE_WARNING, /Disks/);
});

test("the detected system sorts first", () => {
  assert.deepEqual(osOrder("linux"), ["linux", "macos", "windows"]);
  assert.deepEqual(osOrder("windows"), ["windows", "macos", "linux"]);
  assert.deepEqual(osOrder(null), ["macos", "windows", "linux"]);
});

test("the linux block renders the one-liner, then the AppImage link, then the run block and warning", () => {
  const html = renderToStaticMarkup(InstallBlocks({ os: "linux", installers }));
  const linux = html.slice(html.indexOf('data-os="linux"'), html.indexOf('data-os="macos"'));
  const command = linux.indexOf("install.sh");
  const link = linux.indexOf("or download the AppImage");
  const run = linux.indexOf("chmod +x Bucket-*.AppImage");
  const warning = linux.indexOf("Opening it with Disks offers to overwrite your whole drive.");
  assert.ok(command > 0 && command < link && link < run && run < warning, `order ${command} ${link} ${run} ${warning}`);
  assert.match(linux, /\.\/Bucket-\*\.AppImage/);
  assert.match(linux, /href="https:[^"]*Bucket-0\.4\.0-x86_64\.AppImage"/);
  assert.match(linux, /aria-label="Copy Linux install command"/);
});

test("macos and windows lead with their one-liners and list direct binaries second", () => {
  const html = renderToStaticMarkup(InstallBlocks({ os: "macos", installers }));
  const mac = html.slice(html.indexOf('data-os="macos"'), html.indexOf('data-os="windows"'));
  assert.ok(mac.indexOf("install.sh") < mac.indexOf("bkt-darwin-arm64"));
  assert.ok(mac.indexOf("Apple silicon") < mac.indexOf("Intel"));
  const win = html.slice(html.indexOf('data-os="windows"'), html.indexOf('data-os="linux"'));
  assert.ok(win.indexOf("install.ps1 | iex") < win.indexOf("bkt-windows-x64.exe"));
});

test("the one-liners render without any release", () => {
  const html = renderToStaticMarkup(InstallBlocks({ os: "linux", installers: [] }));
  assert.match(html, /install\.sh/);
  assert.match(html, /install\.ps1/);
  assert.doesNotMatch(html, /data-appimage-run/);
});

test("systems with no desktop installer say so", () => {
  const html = renderToStaticMarkup(InstallBlocks({ os: "macos", installers }));
  assert.match(html, /Desktop installer: next release\./);
});
