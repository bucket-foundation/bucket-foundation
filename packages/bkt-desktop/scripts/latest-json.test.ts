import { expect, test } from "bun:test";
import { manifest } from "./latest-json";
import { releaseName } from "./release-assets";

const targets: [string, string, "macos" | "windows" | "linux", "arm64" | "x64"][] = [
  ["Bucket_0.2.0_amd64.AppImage", "AppImage", "linux", "x64"],
  ["Bucket.app.tar.gz", "app.tar.gz", "macos", "arm64"],
  ["Bucket.app.tar.gz", "app.tar.gz", "macos", "x64"],
  ["Bucket_0.2.0_x64_en-US.msi", "msi", "windows", "x64"],
];
const files = [
  ...targets.flatMap(([f, , os, arch]) => [releaseName(f, "0.2.0", os, arch) as string, releaseName(`${f}.sig`, "0.2.0", os, arch) as string]),
  "Bucket-desktop-0.2.0-linux-x64.deb",
  "Bucket-desktop-0.2.0-macos-arm64.dmg",
  "Bucket-desktop-0.2.0-macos-arm64.dmg.sha256",
];

test("lists each signed updater artifact under its platform", () => {
  const m = manifest(files, (f) => `sig:${f}\n`, "bkt-v0.2.0", "o/r", new Date(0));
  expect(m.version).toBe("0.2.0");
  expect(Object.keys(m.platforms).sort()).toEqual(["darwin-aarch64", "darwin-x86_64", "linux-x86_64", "windows-x86_64"]);
  expect(m.platforms["linux-x86_64"]).toEqual({ signature: "sig:Bucket-desktop-0.2.0-linux-x64.AppImage.sig", url: "https://github.com/o/r/releases/download/bkt-v0.2.0/Bucket-desktop-0.2.0-linux-x64.AppImage" });
});

test("skips unsigned bundles and rejects a tag without a version", () => {
  expect(manifest(["Bucket-desktop-1.0.0-windows-x64.msi", "Bucket-desktop-1.0.0-linux-x64.deb"], () => "", "bkt-v1.0.0", "o/r", new Date(0)).platforms).toEqual({});
  expect(() => manifest([], () => "", "bkt-vnext", "o/r", new Date(0))).toThrow();
});
