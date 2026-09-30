import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { APPIMAGE_RUN_STEPS, APPIMAGE_WARNING, INSTALL_COMMAND, siteVersion } from "../src/lib/download/install";

const root = path.join(__dirname, "..");
const PAGE = fs.readFileSync(path.join(root, "src/app/download/page.tsx"), "utf8");
const FOOTER = fs.readFileSync(path.join(root, "src/components/Footer.tsx"), "utf8");

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


test("linux block renders the one-liner before the AppImage link and run block", () => {
  const command = PAGE.indexOf("INSTALL_COMMAND[o]");
  const link = PAGE.indexOf("or download the AppImage");
  const run = PAGE.indexOf("data-appimage-run");
  const warning = PAGE.indexOf("{APPIMAGE_WARNING}");
  assert.ok(command > 0 && command < link && link < run && run < warning);
  assert.match(PAGE, /<CopyBlock text=\{INSTALL_COMMAND\[o\]\}/);
  assert.match(PAGE, /APPIMAGE_RUN_STEPS\.join/);
});

test("the AppImage is no longer the primary action", () => {
  assert.doesNotMatch(PAGE, /PRIMARY/);
  assert.doesNotMatch(PAGE, /Download for/);
});

test("siteVersion prefers the release tag and falls back to package.json", () => {
  assert.equal(siteVersion("bkt-v0.4.0", "0.2.0"), "v0.4.0");
  assert.equal(siteVersion(undefined, "0.2.0"), "v0.2.0");
  assert.equal(siteVersion(null, "0.2.0"), "v0.2.0");
});

test("footer no longer hardcodes a version", () => {
  assert.doesNotMatch(FOOTER, /v0\.\d+\.\d+/);
  assert.match(FOOTER, /<FooterVersion \/>/);
});
