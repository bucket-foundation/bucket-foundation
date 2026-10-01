import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { releaseVersion } from "./build-config";

export type DesktopOs = "macos" | "windows" | "linux";
export type DesktopArch = "arm64" | "x64";

const FORMATS: [RegExp, string][] = [
  [/\.app\.tar\.gz$/, "app.tar.gz"],
  [/\.AppImage$/, "AppImage"],
  [/\.deb$/, "deb"],
  [/\.dmg$/, "dmg"],
  [/\.msi$/, "msi"],
  [/-setup\.exe$/, "exe"],
];

const NODE_OS: Record<string, DesktopOs> = { darwin: "macos", win32: "windows", linux: "linux" };

export function hostOs(platform: string): DesktopOs {
  const os = NODE_OS[platform];
  if (!os) throw new Error(`no desktop bundle for ${platform}`);
  return os;
}

export function hostArch(arch: string): DesktopArch {
  if (arch !== "arm64" && arch !== "x64") throw new Error(`no desktop bundle for ${arch}`);
  return arch;
}

export function releaseName(file: string, version: string, os: DesktopOs, arch: DesktopArch): string | null {
  if (!/^\d+\.\d+\.\d+$/.test(version)) throw new Error(`malformed version: ${version}`);
  const signature = file.endsWith(".sig");
  const base = signature ? file.slice(0, -4) : file;
  const format = FORMATS.find(([re]) => re.test(base));
  if (!format) return null;
  return `Bucket-desktop-${version}-${os}-${arch}.${format[1]}${signature ? ".sig" : ""}`;
}

export function bundleFiles(dir: string): string[] {
  const out: string[] = [];
  for (const kind of readdirSync(dir)) {
    const sub = join(dir, kind);
    if (!statSync(sub).isDirectory()) continue;
    for (const f of readdirSync(sub)) if (statSync(join(sub, f)).isFile()) out.push(join(sub, f));
  }
  return out;
}

const OS_SIGNED = /\.(dmg|msi|exe)$/;

export function collect(bundleDir: string, outDir: string, version: string, os: DesktopOs, arch: DesktopArch, unsigned = false): string[] {
  mkdirSync(outDir, { recursive: true });
  const written: string[] = [];
  for (const path of bundleFiles(bundleDir)) {
    const name = releaseName(path.split(/[\\/]/).pop() as string, version, os, arch);
    if (!name) continue;
    if (existsSync(join(outDir, name))) throw new Error(`two bundles map to ${name}`);
    copyFileSync(path, join(outDir, name));
    written.push(name);
    if (name.endsWith(".sig")) continue;
    const sum = createHash("sha256").update(readFileSync(path)).digest("hex");
    writeFileSync(join(outDir, `${name}.sha256`), `${sum}  ${name}\n`);
    if (unsigned && OS_SIGNED.test(name)) writeFileSync(join(outDir, `${name}.unsigned`), `${name} carries no publisher signature\n`);
  }
  if (!written.some((n) => !n.endsWith(".sig"))) throw new Error(`no bundles under ${bundleDir}`);
  return written.sort();
}

if (import.meta.main) {
  const [bundleDir, outDir] = process.argv.slice(2);
  if (!bundleDir || !outDir) throw new Error("usage: release-assets.ts <bundle dir> <out dir>");
  const pkg = JSON.parse(readFileSync(resolve(import.meta.dir, "../../bkt/package.json"), "utf8"));
  const version = releaseVersion(process.env, pkg.version);
  for (const n of collect(bundleDir, outDir, version, hostOs(process.platform), hostArch(process.arch), process.env.BKT_DESKTOP_UNSIGNED === "1")) console.log(n);
}
