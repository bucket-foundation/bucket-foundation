import { expect, test } from "bun:test";
import { buildConfig, missingPlatformSigning, missingSigning, releaseVersion } from "./build-config";

const APPLE = { APPLE_CERTIFICATE: "c", APPLE_CERTIFICATE_PASSWORD: "p", APPLE_SIGNING_IDENTITY: "i", APPLE_ID: "a", APPLE_PASSWORD: "w", APPLE_TEAM_ID: "t" };
const UPDATER = { TAURI_SIGNING_PRIVATE_KEY: "k" };
const base = { version: "0.5.0", release: false, unsignedOk: false };

test("a pull request build without secrets is ad-hoc signed on macOS", () => {
  expect(buildConfig({ ...base, platform: "darwin", env: {} })).toEqual({ version: "0.5.0", bundle: { macOS: { signingIdentity: "-" } } });
  expect(buildConfig({ ...base, platform: "linux", env: {} })).toEqual({ version: "0.5.0", bundle: {} });
});

test("a release build without signing secrets fails on every platform", () => {
  expect(() => buildConfig({ ...base, release: true, platform: "darwin", env: UPDATER })).toThrow(/APPLE_CERTIFICATE/);
  expect(() => buildConfig({ ...base, release: true, platform: "darwin", env: APPLE })).toThrow(/TAURI_SIGNING_PRIVATE_KEY/);
  expect(() => buildConfig({ ...base, release: true, platform: "darwin", env: { ...UPDATER, ...APPLE, APPLE_TEAM_ID: "" } })).toThrow(/APPLE_TEAM_ID/);
  expect(() => buildConfig({ ...base, release: true, platform: "win32", env: UPDATER })).toThrow(/WINDOWS_CERTIFICATE_THUMBPRINT/);
  expect(() => buildConfig({ ...base, release: true, platform: "linux", env: {} })).toThrow(/BKT_DESKTOP_UNSIGNED_OK/);
});

test("the founder opt-in lets a release build ship unsigned", () => {
  expect(buildConfig({ ...base, release: true, unsignedOk: true, platform: "darwin", env: {} })).toEqual({ version: "0.5.0", bundle: { macOS: { signingIdentity: "-" } } });
  expect(buildConfig({ ...base, release: true, unsignedOk: true, platform: "win32", env: {} })).toEqual({ version: "0.5.0", bundle: {} });
});

test("a release build with every secret signs and needs no opt-in", () => {
  expect(buildConfig({ ...base, release: true, platform: "darwin", env: { ...UPDATER, ...APPLE } })).toEqual({ version: "0.5.0", bundle: { createUpdaterArtifacts: true } });
  expect(buildConfig({ ...base, release: true, platform: "linux", env: UPDATER })).toEqual({ version: "0.5.0", bundle: { createUpdaterArtifacts: true } });
  expect(buildConfig({ ...base, release: true, platform: "win32", env: { ...UPDATER, WINDOWS_CERTIFICATE_THUMBPRINT: "AB12" } })).toEqual({
    version: "0.5.0",
    bundle: { createUpdaterArtifacts: true, windows: { certificateThumbprint: "AB12", digestAlgorithm: "sha256", timestampUrl: "http://timestamp.digicert.com" } },
  });
});

test("platform signing is tracked apart from the updater key", () => {
  expect(missingPlatformSigning({ platform: "linux", env: {} })).toEqual([]);
  expect(missingPlatformSigning({ platform: "win32", env: UPDATER })).toEqual(["WINDOWS_CERTIFICATE_THUMBPRINT"]);
  expect(missingPlatformSigning({ platform: "darwin", env: APPLE })).toEqual([]);
  expect(missingSigning({ platform: "darwin", env: APPLE })).toEqual(["TAURI_SIGNING_PRIVATE_KEY"]);
});

test("a malformed version stops the build", () => {
  expect(() => buildConfig({ ...base, version: "0.5", platform: "linux", env: {} })).toThrow();
});

test("the version comes from BKT_VERSION, then a bkt-v tag, then packages/bkt", () => {
  expect(releaseVersion({ BKT_VERSION: "9.9.9", GITHUB_REF_TYPE: "tag", GITHUB_REF_NAME: "bkt-v0.5.0" }, "0.4.0")).toBe("9.9.9");
  expect(releaseVersion({ GITHUB_REF_TYPE: "tag", GITHUB_REF_NAME: "bkt-v0.5.0" }, "0.4.0")).toBe("0.5.0");
  expect(releaseVersion({ GITHUB_REF_TYPE: "branch", GITHUB_REF_NAME: "bkt-v0.5.0" }, "0.4.0")).toBe("0.4.0");
  expect(releaseVersion({}, "0.4.0")).toBe("0.4.0");
});
