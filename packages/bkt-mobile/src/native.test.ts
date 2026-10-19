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
  const src = read("src/token.ts") + read("src/adapter.ts") + read("src/main.ts") + read("../../src/lib/academy/mobile-sync.ts") + read("../../src/lib/academy/token-store.ts");
  expect(src).toContain("@aparajita/capacitor-secure-storage");
  expect(src).not.toMatch(/localStorage|sessionStorage|indexedDB/);
  expect(read("src/main.ts")).toContain("const vault = new SecureStorageVault();");
});

test("only the review outbox uses web storage, and it holds no session", () => {
  expect(read("src/outbox-storage.ts")).toContain("window.localStorage");
  expect(read("../../src/lib/academy/review-sync.ts")).not.toMatch(/access_token|refresh_token/);
});

test("only the debug build may reach the emulator host over http, and it keeps the pins", () => {
  const release = read("android/app/src/main/res/xml/network_security_config.xml");
  expect(release).not.toContain("10.0.2.2");
  const debug = read("android/app/src/debug/res/xml/network_security_config.xml");
  expect(debug).toMatch(/<domain-config cleartextTrafficPermitted="true">\s*<domain includeSubdomains="false">10\.0\.2\.2<\/domain>\s*<\/domain-config>/);
  expect(debug.match(/cleartextTrafficPermitted="true"/g)).toHaveLength(1);
  for (const p of PINS) expect(debug).toContain(p);
});

test("the smoke hook loads only when the smoke flag is built in", () => {
  const main = read("src/main.ts");
  expect(main).toContain('const SMOKE = import.meta.env.VITE_BKT_SMOKE === "1";');
  expect(main).toContain("allowLocalHttp: SMOKE");
  expect(main).toMatch(/if \(SMOKE\) \{\s*const \{ runSyncSmoke \} = await import\("\.\/sync-smoke"\);/);
});
