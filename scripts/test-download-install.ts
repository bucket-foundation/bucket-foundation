import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import InstallBlocks, { osOrder } from "../src/components/download/InstallBlocks";
import { APPIMAGE_RUN_STEPS, APPIMAGE_WARNING, INSTALL_COMMAND, detectLinuxDistro, executableStep, linuxInstallCommand } from "../src/lib/download/install";
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

test("the linux block leads with the one-line install, then the run steps, warning and link under Other ways", () => {
  const html = renderToStaticMarkup(InstallBlocks({ os: "linux", distro: "fedora", installers }));
  const linux = html.slice(html.indexOf('data-os="linux"'), html.indexOf('data-os="macos"'));
  const command = linux.indexOf("release/install.sh");
  const other = linux.indexOf("Other ways");
  const run = linux.indexOf("chmod +x Bucket-*.AppImage");
  const step = linux.indexOf("Properties, then Permissions, and tick Executable as Program");
  const warning = linux.indexOf("Opening it with Disks offers to overwrite your whole drive.");
  const link = linux.indexOf("or download the AppImage");
  const sum = linux.indexOf("sha256 checksum for Bucket-0.4.0-x86_64.AppImage");
  assert.ok(command > 0 && command < other && other < run && run < step && step < warning && warning < link && link < sum, `order ${command} ${other} ${run} ${step} ${warning} ${link} ${sum}`);
  assert.match(linux, /Fedora: In your file manager/);
  assert.match(linux, /on Fedora/);
  assert.match(linux, /href="https:[^"]*Bucket-0\.4\.0-x86_64\.AppImage"/);
  assert.match(linux, /aria-label="Copy Linux install command"/);
});

test("the linux install command passes the canonical AppImage url to install.sh", () => {
  const url = "https://github.com/bucket-foundation/bucket-foundation/releases/download/bkt-v0.4.0/Bucket-0.4.0-x86_64.AppImage";
  assert.equal(
    linuxInstallCommand(url),
    `curl -fsSL https://raw.githubusercontent.com/bucket-foundation/bucket-foundation/main/scripts/release/install.sh | bash -s -- ${url}`,
  );
  assert.equal(linuxInstallCommand(null), INSTALL_COMMAND.linux);
  const html = renderToStaticMarkup(InstallBlocks({ os: "linux", installers }));
  assert.ok(html.includes(url));
  assert.doesNotMatch(url, /\s/);
});

test("release assets with spaces in the name are never linked", () => {
  const spaced: ReleaseAsset[] = [{ name: "Bucket-0.4.0-x86_64 (1).AppImage", browser_download_url: "https://example.com/a", size: 1 }];
  assert.deepEqual(installersForV2(spaced), []);
  for (const i of installers) assert.doesNotMatch(i.name, /\s/);
});

test("linux distro detection reads the user agent", () => {
  assert.equal(detectLinuxDistro("Mozilla/5.0 (X11; Fedora; Linux x86_64; rv:130.0) Gecko/20100101 Firefox/130.0"), "fedora");
  assert.equal(detectLinuxDistro("Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:130.0) Gecko/20100101 Firefox/130.0"), "ubuntu");
  assert.equal(detectLinuxDistro("Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/130.0 Safari/537.36"), null);
  assert.equal(detectLinuxDistro(null), null);
  assert.match(executableStep("fedora"), /^Fedora: /);
  assert.match(executableStep(null), /^In your file manager/);
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
