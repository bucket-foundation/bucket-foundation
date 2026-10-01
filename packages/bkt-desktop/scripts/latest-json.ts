import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export interface UpdaterManifest {
  version: string;
  pub_date: string;
  platforms: Record<string, { signature: string; url: string }>;
}

const PLATFORMS: [RegExp, string][] = [
  [/-linux-x64\.AppImage$/, "linux-x86_64"],
  [/-macos-arm64\.app\.tar\.gz$/, "darwin-aarch64"],
  [/-macos-x64\.app\.tar\.gz$/, "darwin-x86_64"],
  [/-windows-x64\.msi$/, "windows-x86_64"],
];

export function manifest(files: string[], sig: (f: string) => string, tag: string, repo: string, now: Date): UpdaterManifest {
  const version = tag.replace(/^bkt-v/, "");
  if (!/^\d+\.\d+\.\d+/.test(version)) throw new Error(`tag ${tag} carries no semver`);
  const platforms: UpdaterManifest["platforms"] = {};
  for (const f of files) {
    if (!files.includes(`${f}.sig`)) continue;
    const hit = PLATFORMS.find(([re]) => re.test(f));
    if (!hit) continue;
    platforms[hit[1]] = { signature: sig(`${f}.sig`).trim(), url: `https://github.com/${repo}/releases/download/${tag}/${encodeURIComponent(f)}` };
  }
  return { version, pub_date: now.toISOString(), platforms };
}

if (import.meta.main) {
  const [dir, tag, repo] = process.argv.slice(2);
  if (!dir || !tag || !repo) throw new Error("usage: latest-json.ts <bundle dir> <tag> <owner/repo>");
  const m = manifest(readdirSync(dir), (f) => readFileSync(join(dir, f), "utf8"), tag, repo, new Date());
  if (Object.keys(m.platforms).length === 0) {
    console.log("no signed updater artifacts; latest.json not written");
  } else {
    writeFileSync(join(dir, "latest.json"), JSON.stringify(m, null, 2));
    console.log(Object.keys(m.platforms).join(" "));
  }
}
