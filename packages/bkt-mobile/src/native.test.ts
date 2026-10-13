import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import config from "../capacitor.config";

const root = resolve(import.meta.dir, "..");
const read = (p: string) => readFileSync(resolve(root, p), "utf8");
const PINS = ["C5+lpZ7tcVwmwQIMcRtPbsQtWLABXhQzejna0wHFr8M=", "diGVwiVYbubAI3RW4hB9xU8e/CH2GnkuvVFZE8zmgzI=", "fk6IOKit1ild5647BH06ujSIq5XbCgqlbYl6ANhhi88="];

test("capacitor serves https with debugging and cleartext off", () => {
  expect(config.server?.androidScheme).toBe("https");
  expect(config.server?.cleartext).toBe(false);
  expect(config.android?.allowMixedContent).toBe(false);
  expect(config.android?.webContentsDebuggingEnabled).toBe(false);
  expect(config.ios?.webContentsDebuggingEnabled).toBe(false);
  expect(config.plugins?.CapacitorHttp).toEqual({ enabled: true });
});

test("android blocks cleartext and pins the sync api", () => {
  const manifest = read("android/app/src/main/AndroidManifest.xml");
  expect(manifest).toContain('android:usesCleartextTraffic="false"');
  expect(manifest).toContain('android:networkSecurityConfig="@xml/network_security_config"');
  expect(manifest).toContain('android:allowBackup="false"');
  const nsc = read("android/app/src/main/res/xml/network_security_config.xml");
  expect(nsc).not.toContain('cleartextTrafficPermitted="true"');
  expect(nsc).toContain("<domain includeSubdomains=\"true\">bucket.foundation</domain>");
  for (const p of PINS) expect(nsc).toContain(p);
});

test("ios keeps ats on and pins the sync api", () => {
  const plist = read("ios/App/App/Info.plist");
  expect(plist).toMatch(/<key>NSAllowsArbitraryLoads<\/key>\s*<false\/>/);
  expect(plist).not.toContain("NSExceptionAllowsInsecureHTTPLoads");
  for (const p of PINS) expect(plist).toContain(p);
});

test("the web bundle loads no remote script", () => {
  const html = read("index.html");
  expect(html).toMatch(/script-src 'self';/);
  expect(html).toContain("connect-src 'self' https://bucket.foundation;");
});

test("tokens go through secure storage and never web storage", () => {
  const src = read("src/token.ts") + read("src/adapter.ts") + read("src/main.ts");
  expect(src).toContain("@aparajita/capacitor-secure-storage");
  expect(src).not.toMatch(/localStorage|sessionStorage|indexedDB/);
});
