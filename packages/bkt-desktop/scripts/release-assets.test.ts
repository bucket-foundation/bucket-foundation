import { expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { collect, hostArch, hostOs, releaseName } from "./release-assets";

test("every tauri bundle gets one release name per os and architecture", () => {
  expect(releaseName("Bucket_0.1.0_aarch64.dmg", "0.5.0", "macos", "arm64")).toBe("Bucket-desktop-0.5.0-macos-arm64.dmg");
  expect(releaseName("Bucket_0.1.0_x64.dmg", "0.5.0", "macos", "x64")).toBe("Bucket-desktop-0.5.0-macos-x64.dmg");
  expect(releaseName("Bucket_0.1.0_x64_en-US.msi", "0.5.0", "windows", "x64")).toBe("Bucket-desktop-0.5.0-windows-x64.msi");
  expect(releaseName("Bucket_0.1.0_x64-setup.exe", "0.5.0", "windows", "x64")).toBe("Bucket-desktop-0.5.0-windows-x64.exe");
  expect(releaseName("Bucket_0.1.0_amd64.AppImage", "0.5.0", "linux", "x64")).toBe("Bucket-desktop-0.5.0-linux-x64.AppImage");
  expect(releaseName("Bucket_0.1.0_amd64.deb", "0.5.0", "linux", "x64")).toBe("Bucket-desktop-0.5.0-linux-x64.deb");
});

test("updater archives and signatures keep their suffix", () => {
  expect(releaseName("Bucket.app.tar.gz", "0.5.0", "macos", "arm64")).toBe("Bucket-desktop-0.5.0-macos-arm64.app.tar.gz");
  expect(releaseName("Bucket.app.tar.gz.sig", "0.5.0", "macos", "x64")).toBe("Bucket-desktop-0.5.0-macos-x64.app.tar.gz.sig");
  expect(releaseName("Bucket_0.1.0_amd64.AppImage.sig", "0.5.0", "linux", "x64")).toBe("Bucket-desktop-0.5.0-linux-x64.AppImage.sig");
});

test("the linux AppImage name differs from the terminal AppImage that bkt.yml publishes", () => {
  expect(releaseName("Bucket_0.5.0_amd64.AppImage", "0.5.0", "linux", "x64")).not.toBe("Bucket-0.5.0-x86_64.AppImage");
});

test("other files are skipped and a malformed version is rejected", () => {
  expect(releaseName("bkt.exe", "0.5.0", "windows", "x64")).toBeNull();
  expect(releaseName("Info.plist", "0.5.0", "macos", "arm64")).toBeNull();
  expect(() => releaseName("a.dmg", "next", "macos", "arm64")).toThrow();
});

test("host os and architecture map to release tokens", () => {
  expect(hostOs("darwin")).toBe("macos");
  expect(hostOs("win32")).toBe("windows");
  expect(hostArch("arm64")).toBe("arm64");
  expect(() => hostOs("freebsd")).toThrow();
  expect(() => hostArch("ia32")).toThrow();
});

test("collect copies renamed bundles and writes a checksum beside each", () => {
  const root = mkdtempSync(join(tmpdir(), "bkt-assets-"));
  const bundle = join(root, "bundle");
  mkdirSync(join(bundle, "dmg"), { recursive: true });
  mkdirSync(join(bundle, "macos", "Bucket.app"), { recursive: true });
  writeFileSync(join(bundle, "dmg", "Bucket_0.1.0_aarch64.dmg"), "dmg");
  writeFileSync(join(bundle, "macos", "Bucket.app.tar.gz"), "tar");
  writeFileSync(join(bundle, "macos", "Bucket.app.tar.gz.sig"), "sig");
  const names = collect(bundle, join(root, "out"), "0.5.0", "macos", "arm64");
  expect(names).toEqual(["Bucket-desktop-0.5.0-macos-arm64.app.tar.gz", "Bucket-desktop-0.5.0-macos-arm64.app.tar.gz.sig", "Bucket-desktop-0.5.0-macos-arm64.dmg"]);
  expect(readdirSync(join(root, "out")).filter((f) => f.endsWith(".sha256")).sort()).toEqual(["Bucket-desktop-0.5.0-macos-arm64.app.tar.gz.sha256", "Bucket-desktop-0.5.0-macos-arm64.dmg.sha256"]);
  expect(readFileSync(join(root, "out", "Bucket-desktop-0.5.0-macos-arm64.dmg.sha256"), "utf8")).toMatch(/^[0-9a-f]{64}  Bucket-desktop-0\.5\.0-macos-arm64\.dmg\n$/);
  expect(() => collect(bundle, join(root, "out"), "0.5.0", "macos", "arm64")).toThrow(/two bundles/);
  mkdirSync(join(root, "empty", "deb"), { recursive: true });
  expect(() => collect(join(root, "empty"), join(root, "out2"), "0.5.0", "linux", "x64")).toThrow(/no bundles/);
});

test("the release names are the ones the /download fixture holds", () => {
  const fixture: { name: string }[] = JSON.parse(readFileSync(resolve(import.meta.dir, "../../../src/lib/download/__fixtures__/bkt-v0.5.0-tauri.json"), "utf8"));
  const held = fixture.map((a) => a.name).filter((n) => n.startsWith("Bucket-desktop-") && !/\.(sha256|sig)$/.test(n)).sort();
  const built = [
    releaseName("Bucket_0.5.0_aarch64.dmg", "0.5.0", "macos", "arm64"),
    releaseName("Bucket.app.tar.gz", "0.5.0", "macos", "arm64"),
    releaseName("Bucket_0.5.0_x64.dmg", "0.5.0", "macos", "x64"),
    releaseName("Bucket_0.5.0_x64_en-US.msi", "0.5.0", "windows", "x64"),
    releaseName("Bucket_0.5.0_amd64.AppImage", "0.5.0", "linux", "x64"),
    releaseName("Bucket_0.5.0_amd64.deb", "0.5.0", "linux", "x64"),
  ].sort();
  expect(built).toEqual(held);
});
