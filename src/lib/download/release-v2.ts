import { OSES, RELEASE_REPO, RELEASE_TAG_PREFIX, type GitHubRelease, type Os, type ReleaseAsset } from "./release";

export type Arch = "arm64" | "x64";
export type Kind = "desktop" | "terminal";

export interface InstallerV2 {
  os: Os;
  arch: Arch;
  kind: Kind;
  name: string;
  url: string;
  size: number;
  checksumUrl: string | null;
}

const SIDECAR = /\.(sha256|manifest|manifest\.sig|sig|unsigned)$/i;
const TERMINAL = /^bkt-(darwin|linux|windows)-(arm64|x64)(\.exe)?$/;
const TERMINAL_OS: Record<string, Os> = { darwin: "macos", linux: "linux", windows: "windows" };
const ARCH_ORDER: Arch[] = ["arm64", "x64"];

function archOf(name: string): Arch {
  return /arm64|aarch64/i.test(name) ? "arm64" : "x64";
}

const WINDOWED = /^Bucket-desktop-\d+\.\d+\.\d+-(macos|windows|linux)-(arm64|x64)\.(dmg|msi|exe|AppImage|deb)$/;
const FORMAT_ORDER: WindowedFormat[] = ["dmg", "msi", "exe", "AppImage", "deb"];

export type WindowedFormat = "dmg" | "msi" | "exe" | "AppImage" | "deb";

export interface WindowedInstaller {
  os: Os;
  arch: Arch;
  format: WindowedFormat;
  name: string;
  url: string;
  size: number;
  checksumUrl: string | null;
  signed: boolean;
}

export function windowedInstallers(assets: ReleaseAsset[]): WindowedInstaller[] {
  const best = new Map<string, WindowedInstaller>();
  for (const asset of assets) {
    const m = WINDOWED.exec(asset.name);
    if (!m) continue;
    const format = m[3] as WindowedFormat;
    const key = `${m[1]}/${m[2]}`;
    const held = best.get(key);
    if (held && FORMAT_ORDER.indexOf(held.format) <= FORMAT_ORDER.indexOf(format)) continue;
    const sidecar = assets.find((a) => a.name === `${asset.name}.sha256`);
    best.set(key, { os: m[1] as Os, arch: m[2] as Arch, format, name: asset.name, url: asset.browser_download_url, size: asset.size, checksumUrl: sidecar?.browser_download_url ?? null, signed: !assets.some((a) => a.name === `${asset.name}.unsigned`) });
  }
  const out: WindowedInstaller[] = [];
  for (const os of OSES) for (const arch of ARCH_ORDER) {
    const e = best.get(`${os}/${arch}`);
    if (e) out.push(e);
  }
  return out;
}

function classify(asset: ReleaseAsset): Omit<InstallerV2, "checksumUrl" | "url" | "size" | "name"> | null {
  if (SIDECAR.test(asset.name) || !/^[A-Za-z0-9._-]+$/.test(asset.name) || asset.name.startsWith("Bucket-desktop-")) return null;
  const terminal = TERMINAL.exec(asset.name);
  if (terminal) return { os: TERMINAL_OS[terminal[1]], arch: terminal[2] as Arch, kind: "terminal" };
  if (/\.dmg$/i.test(asset.name)) return { os: "macos", arch: archOf(asset.name), kind: "desktop" };
  if (/\.(exe|msi)$/i.test(asset.name)) return { os: "windows", arch: "x64", kind: "desktop" };
  if (/\.AppImage$/i.test(asset.name)) return { os: "linux", arch: archOf(asset.name), kind: "desktop" };
  return null;
}

export function installersForV2(assets: ReleaseAsset[]): InstallerV2[] {
  const best = new Map<string, InstallerV2>();
  for (const asset of assets) {
    const c = classify(asset);
    if (!c) continue;
    const sidecar = assets.find((a) => a.name === `${asset.name}.sha256`);
    const entry: InstallerV2 = { ...c, name: asset.name, url: asset.browser_download_url, size: asset.size, checksumUrl: sidecar?.browser_download_url ?? null };
    const key = `${c.os}/${c.arch}`;
    const held = best.get(key);
    if (!held || (held.kind === "terminal" && c.kind === "desktop")) best.set(key, entry);
  }
  const out: InstallerV2[] = [];
  for (const os of OSES) for (const arch of ARCH_ORDER) {
    const e = best.get(`${os}/${arch}`);
    if (e) out.push(e);
  }
  return out;
}

export function hasDesktop(installers: InstallerV2[], os: Os): boolean {
  return installers.some((i) => i.os === os && i.kind === "desktop");
}

export function preferArch(installers: InstallerV2[], arch: Arch | null): InstallerV2[] {
  if (!arch) return installers;
  return [...installers].sort((a, b) => Number(b.arch === arch) - Number(a.arch === arch));
}

export interface LatestReleaseV2 {
  tag: string;
  name: string;
  page: string;
  installers: InstallerV2[];
  windowed: WindowedInstaller[];
}

export function pickLatestV2(releases: GitHubRelease[]): LatestReleaseV2 | null {
  const r = releases.find((x) => !x.draft && !x.prerelease && x.tag_name.startsWith(RELEASE_TAG_PREFIX));
  if (!r) return null;
  return { tag: r.tag_name, name: r.name || r.tag_name, page: r.html_url, installers: installersForV2(r.assets), windowed: windowedInstallers(r.assets) };
}

export async function fetchLatestReleaseV2(fetcher: typeof fetch = fetch): Promise<LatestReleaseV2 | null> {
  const token = process.env.GITHUB_TOKEN;
  try {
    const res = await fetcher(`https://api.github.com/repos/${RELEASE_REPO}/releases?per_page=20`, {
      headers: { accept: "application/vnd.github+json", ...(token ? { authorization: `Bearer ${token}` } : {}) },
      next: { revalidate: 900 },
    } as RequestInit);
    if (!res.ok) return null;
    return pickLatestV2((await res.json()) as GitHubRelease[]);
  } catch {
    return null;
  }
}
