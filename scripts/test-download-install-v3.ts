import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import InstallBlocksV3 from "../src/components/download/InstallBlocksV3";
import { APPIMAGE_WARNING_SHORT, INSTALL_COMMAND } from "../src/lib/download/install";
import { installersForV2 } from "../src/lib/download/release-v2";
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
