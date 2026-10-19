import test from "node:test";
import assert from "node:assert/strict";
import { DEVICES, LEARN_PATH, allLinks, detectDevice, detectFromHints, deviceLinks, linkFor, testflightUrl, type DeviceSources } from "../src/lib/download/device";
import { RELEASES_PAGE } from "../src/lib/download/release";
import { pickLatestV2, signedApk, windowedInstallers } from "../src/lib/download/release-v2";

const asset = (name: string) => ({ name, browser_download_url: `https://example.org/${name}`, size: 1 });
const v = "0.6.0";
const assets = [
  `Bucket-desktop-${v}-macos-arm64.dmg`,
  `Bucket-desktop-${v}-macos-x64.dmg`,
  `Bucket-desktop-${v}-windows-x64.msi`,
  `Bucket-desktop-${v}-linux-x64.deb`,
  `Bucket-desktop-${v}-linux-x64.AppImage`,
  `Bucket-desktop-${v}-linux-x64.AppImage.tar.gz`,
  "Bucket-android-unsigned.apk",
  "Bucket-android-bkt-v0.6.0.apk",
].map(asset);
const full: DeviceSources = { windowed: windowedInstallers(assets), apk: signedApk(assets), testflight: "https://testflight.apple.com/join/AbC123" };
const empty: DeviceSources = { windowed: [], apk: null, testflight: null };

test("detectDevice maps user agents to one device", () => {
  assert.equal(detectDevice("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)"), "ios");
  assert.equal(detectDevice("Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)"), "ios");
  assert.equal(detectDevice("Mozilla/5.0 (Linux; Android 14; Pixel 8)"), "android");
  assert.equal(detectDevice("Mozilla/5.0 (Windows NT 10.0; Win64; x64)"), "windows");
  assert.equal(detectDevice("Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5)"), "macos");
  assert.equal(detectDevice("Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5)", '"x86"'), "macos-x64");
  assert.equal(detectDevice("Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5)", '"arm"'), "macos-arm64");
  assert.equal(detectDevice("Mozilla/5.0 (X11; Linux x86_64) Gecko"), "linux");
  assert.equal(detectDevice("Mozilla/5.0 (X11; Linux aarch64)", '"arm"'), "linux-arm64");
  assert.equal(detectDevice("Mozilla/5.0 (X11; CrOS x86_64 14541.0.0)"), "web");
  assert.equal(detectDevice("Mozilla/5.0 (X11; CrOS aarch64 14541.0.0)", '"arm"'), "web");
  assert.equal(detectDevice("curl/8.0"), "web");
  assert.equal(detectDevice(null), "web");
});

test("signedApk takes the signed release APK and skips the unsigned one", () => {
  assert.equal(signedApk(assets), "https://example.org/Bucket-android-bkt-v0.6.0.apk");
  assert.equal(signedApk([asset("Bucket-android-unsigned.apk"), asset("Bucket-android-bkt-v0.6.0.aab")]), null);
  assert.equal(pickLatestV2([{ tag_name: "bkt-v0.6.0", name: "", html_url: "https://example.org", draft: false, prerelease: false, assets }])?.apk, "https://example.org/Bucket-android-bkt-v0.6.0.apk");
});

test("linkFor picks the installer for each device", () => {
  assert.equal(linkFor("macos-arm64", full).href, `https://example.org/Bucket-desktop-${v}-macos-arm64.dmg`);
  assert.equal(linkFor("macos-x64", full).href, `https://example.org/Bucket-desktop-${v}-macos-x64.dmg`);
  assert.equal(linkFor("windows", full).href, `https://example.org/Bucket-desktop-${v}-windows-x64.msi`);
  assert.equal(linkFor("linux-arm64", full).href, RELEASES_PAGE);
  assert.equal(linkFor("linux", full).href, `https://example.org/Bucket-desktop-${v}-linux-x64.AppImage.tar.gz`);
  assert.equal(linkFor("android", full).href, "https://example.org/Bucket-android-bkt-v0.6.0.apk");
  assert.equal(linkFor("ios", full).href, "https://testflight.apple.com/join/AbC123");
  assert.equal(linkFor("web", full).href, LEARN_PATH);
});

test("linkFor falls back when an asset is missing", () => {
  assert.deepEqual([linkFor("ios", empty).href, linkFor("ios", empty).action], [null, "Bucket for iPhone is coming soon"]);
  assert.deepEqual([linkFor("android", empty).href, linkFor("android", empty).action], [null, "Bucket for Android is coming soon"]);
  assert.equal(linkFor("macos-arm64", empty).href, RELEASES_PAGE);
  assert.equal(linkFor("web", empty).href, LEARN_PATH);
  const debOnly = windowedInstallers([asset(`Bucket-desktop-${v}-linux-x64.deb`)]);
  assert.equal(linkFor("linux", { ...empty, windowed: debOnly }).href, `https://example.org/Bucket-desktop-${v}-linux-x64.deb`);
});

test("deviceLinks puts the detected device first and lists every other device once", () => {
  const links = allLinks(full);
  for (const d of DEVICES) {
    const got = deviceLinks(d, links);
    assert.equal(got.primary.device, d);
    assert.equal(got.alt, null);
    assert.deepEqual([got.primary, ...got.others].map((l) => l.device).sort(), [...DEVICES].sort());
  }
  const mac = deviceLinks("macos", links);
  assert.equal(mac.primary.href, `https://example.org/Bucket-desktop-${v}-macos-arm64.dmg`);
  assert.equal(mac.primary.action, "Download Bucket for Mac");
  assert.equal(mac.alt?.href, `https://example.org/Bucket-desktop-${v}-macos-x64.dmg`);
  assert.ok(!mac.others.some((l) => l.device.startsWith("macos")));
});

const CHROME_MAC = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36";
const BRAVE_MAC = CHROME_MAC;

test("Chrome and Brave on macOS detect as Mac from the UA or the platform hint", () => {
  assert.equal(detectFromHints(CHROME_MAC, null), "macos");
  assert.equal(detectFromHints(BRAVE_MAC, '"macOS"'), "macos");
  assert.equal(detectFromHints(BRAVE_MAC, '"macOS"', '"arm"'), "macos-arm64");
  assert.equal(detectFromHints("Mozilla/5.0 (X11; Linux x86_64)", '"macOS"'), "macos");
  assert.equal(detectFromHints(CHROME_MAC, '"Windows"'), "windows");
  assert.equal(detectFromHints(CHROME_MAC, '"Linux"'), "linux");
  assert.equal(detectFromHints("x", '"Android"'), "android");
  assert.equal(detectFromHints(CHROME_MAC, '"Unknown"'), "macos");
});

test("every desktop button reads Download Bucket for its OS", () => {
  assert.equal(linkFor("windows", full).action, "Download Bucket for Windows");
  assert.equal(linkFor("linux", full).action, "Download Bucket for Linux");
  assert.equal(linkFor("macos-arm64", empty).action, "Download Bucket for Mac");
});

test("testflightUrl accepts only a TestFlight join link", () => {
  assert.equal(testflightUrl(" https://testflight.apple.com/join/AbC123 "), "https://testflight.apple.com/join/AbC123");
  assert.equal(testflightUrl("https://evil.example/join/AbC123"), null);
  assert.equal(testflightUrl("javascript:alert(1)"), null);
  assert.equal(testflightUrl(""), null);
  assert.equal(testflightUrl(undefined), null);
});
