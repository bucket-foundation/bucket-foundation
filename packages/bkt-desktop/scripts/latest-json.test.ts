import { expect, test } from "bun:test";
import { manifest } from "./latest-json";

const files = ["Bucket_0.2.0_amd64.AppImage", "Bucket_0.2.0_amd64.AppImage.sig", "Bucket.app.tar.gz", "Bucket.app.tar.gz.sig", "Bucket_0.2.0_x64_en-US.msi", "Bucket_0.2.0_x64_en-US.msi.sig", "Bucket_0.2.0_amd64.deb"];

test("lists each signed updater artifact under its platform", () => {
  const m = manifest(files, (f) => `sig:${f}\n`, "bkt-v0.2.0", "o/r", new Date(0));
  expect(m.version).toBe("0.2.0");
  expect(Object.keys(m.platforms).sort()).toEqual(["darwin-aarch64", "linux-x86_64", "windows-x86_64"]);
  expect(m.platforms["linux-x86_64"]).toEqual({ signature: "sig:Bucket_0.2.0_amd64.AppImage.sig", url: "https://github.com/o/r/releases/download/bkt-v0.2.0/Bucket_0.2.0_amd64.AppImage" });
});

test("skips unsigned bundles and rejects a tag without a version", () => {
  expect(manifest(["a.msi", "b.deb"], () => "", "bkt-v1.0.0", "o/r", new Date(0)).platforms).toEqual({});
  expect(() => manifest([], () => "", "bkt-vnext", "o/r", new Date(0))).toThrow();
});
