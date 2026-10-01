import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

export interface BuildInputs {
  version: string;
  platform: string;
  updaterKey: string;
  appleCertificate: string;
}

export function buildConfig(i: BuildInputs): Record<string, unknown> {
  if (!/^\d+\.\d+\.\d+$/.test(i.version)) throw new Error(`malformed version: ${i.version}`);
  const bundle: Record<string, unknown> = {};
  if (i.updaterKey) bundle.createUpdaterArtifacts = true;
  if (i.platform === "darwin" && !i.appleCertificate) bundle.macOS = { signingIdentity: "-" };
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
  const config = buildConfig({
    version: releaseVersion(process.env, pkg.version),
    platform: process.platform,
    updaterKey: process.env.TAURI_SIGNING_PRIVATE_KEY ?? "",
    appleCertificate: process.env.APPLE_CERTIFICATE ?? "",
  });
  writeFileSync(out, JSON.stringify(config));
  console.log(JSON.stringify(config));
}
