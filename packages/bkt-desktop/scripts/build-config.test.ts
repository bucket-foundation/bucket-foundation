import { expect, test } from "bun:test";
import { buildConfig, releaseVersion } from "./build-config";

test("an unsigned macOS build is ad-hoc signed so Apple silicon opens it", () => {
  expect(buildConfig({ version: "0.5.0", platform: "darwin", updaterKey: "", appleCertificate: "" })).toEqual({ version: "0.5.0", bundle: { macOS: { signingIdentity: "-" } } });
});

test("a Developer ID certificate replaces the ad-hoc identity", () => {
  expect(buildConfig({ version: "0.5.0", platform: "darwin", updaterKey: "", appleCertificate: "base64" })).toEqual({ version: "0.5.0", bundle: {} });
});

test("the updater key turns on updater artifacts on every platform", () => {
  expect(buildConfig({ version: "0.5.0", platform: "linux", updaterKey: "key", appleCertificate: "" })).toEqual({ version: "0.5.0", bundle: { createUpdaterArtifacts: true } });
  expect(buildConfig({ version: "0.5.0", platform: "win32", updaterKey: "", appleCertificate: "" })).toEqual({ version: "0.5.0", bundle: {} });
});

test("a malformed version stops the build", () => {
  expect(() => buildConfig({ version: "0.5", platform: "linux", updaterKey: "", appleCertificate: "" })).toThrow();
});

test("the version comes from BKT_VERSION, then a bkt-v tag, then packages/bkt", () => {
  expect(releaseVersion({ BKT_VERSION: "9.9.9", GITHUB_REF_TYPE: "tag", GITHUB_REF_NAME: "bkt-v0.5.0" }, "0.4.0")).toBe("9.9.9");
  expect(releaseVersion({ GITHUB_REF_TYPE: "tag", GITHUB_REF_NAME: "bkt-v0.5.0" }, "0.4.0")).toBe("0.5.0");
  expect(releaseVersion({ GITHUB_REF_TYPE: "branch", GITHUB_REF_NAME: "bkt-v0.5.0" }, "0.4.0")).toBe("0.4.0");
  expect(releaseVersion({}, "0.4.0")).toBe("0.4.0");
});
