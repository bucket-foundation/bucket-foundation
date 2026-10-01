import { appendFileSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

export interface BuildInputs {
  version: string;
  platform: string;
  release: boolean;
  unsignedOk: boolean;
  env: Record<string, string | undefined>;
}

const UPDATER = ["TAURI_SIGNING_PRIVATE_KEY"];
const PLATFORM_SIGNING: Record<string, string[]> = {
  darwin: ["APPLE_CERTIFICATE", "APPLE_CERTIFICATE_PASSWORD", "APPLE_SIGNING_IDENTITY", "APPLE_ID", "APPLE_PASSWORD", "APPLE_TEAM_ID"],
  win32: ["WINDOWS_CERTIFICATE_THUMBPRINT"],
};

function absent(names: string[], env: BuildInputs["env"]): string[] {
  return names.filter((n) => !env[n]);
}

export function missingPlatformSigning(i: Pick<BuildInputs, "platform" | "env">): string[] {
  return absent(PLATFORM_SIGNING[i.platform] ?? [], i.env);
}

export function missingSigning(i: Pick<BuildInputs, "platform" | "env">): string[] {
  return [...absent(UPDATER, i.env), ...missingPlatformSigning(i)];
}

export function buildConfig(i: BuildInputs): Record<string, unknown> {
  if (!/^\d+\.\d+\.\d+$/.test(i.version)) throw new Error(`malformed version: ${i.version}`);
  const missing = missingSigning(i);
  if (i.release && missing.length > 0 && !i.unsignedOk) {
    throw new Error(`a release build needs ${missing.join(", ")}; set BKT_DESKTOP_UNSIGNED_OK=1 in the bkt-release environment to ship unsigned`);
  }
  const bundle: Record<string, unknown> = {};
  if (i.env.TAURI_SIGNING_PRIVATE_KEY) bundle.createUpdaterArtifacts = true;
  if (i.platform === "darwin" && !i.env.APPLE_CERTIFICATE) bundle.macOS = { signingIdentity: "-" };
  if (i.platform === "win32" && i.env.WINDOWS_CERTIFICATE_THUMBPRINT) {
    bundle.windows = { certificateThumbprint: i.env.WINDOWS_CERTIFICATE_THUMBPRINT, digestAlgorithm: "sha256", timestampUrl: "http://timestamp.digicert.com" };
  }
  return { version: i.version, bundle };
}

export function releaseVersion(env: Record<string, string | undefined>, packageVersion: string): string {
  const tag = env.GITHUB_REF_TYPE === "tag" && env.GITHUB_REF_NAME?.startsWith("bkt-v") ? env.GITHUB_REF_NAME.slice(5) : "";
  return env.BKT_VERSION || tag || packageVersion;
}

if (import.meta.main) {
  const out = process.argv[2];
  if (!out) throw new Error("usage: build-config.ts <out file>");
  const pkg = JSON.parse(readFileSync(resolve(import.meta.dir, "../../bkt/package.json"), "utf8"));
  const inputs: BuildInputs = {
    version: releaseVersion(process.env, pkg.version),
    platform: process.platform,
    release: process.env.BKT_RELEASE === "true",
    unsignedOk: process.env.BKT_DESKTOP_UNSIGNED_OK === "1",
    env: process.env,
  };
  const config = buildConfig(inputs);
  writeFileSync(out, JSON.stringify(config));
  const unsigned = missingPlatformSigning(inputs);
  if (unsigned.length > 0 && process.env.GITHUB_ENV) appendFileSync(process.env.GITHUB_ENV, "BKT_DESKTOP_UNSIGNED=1\n");
  console.log(JSON.stringify(config));
  console.log(unsigned.length > 0 ? `unsigned: no ${unsigned.join(", ")}` : "signed");
}
