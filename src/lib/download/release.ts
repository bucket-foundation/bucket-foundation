export const RELEASE_REPO = "bucket-foundation/bucket-foundation";
export const RELEASE_TAG_PREFIX = "bkt-v";
export const RELEASES_PAGE = `https://github.com/${RELEASE_REPO}/releases`;

export const OSES = ["macos", "windows", "linux"] as const;
export type Os = (typeof OSES)[number];

export const OS_LABEL: Record<Os, string> = { macos: "macOS", windows: "Windows", linux: "Linux" };

const INSTALLER: Record<Os, RegExp> = {
  macos: /\.dmg$/i,
  windows: /\.(exe|msi)$/i,
  linux: /\.(AppImage|deb|rpm)$/i,
};

export interface ReleaseAsset {
  name: string;
  browser_download_url: string;
  size: number;
}

export interface GitHubRelease {
  tag_name: string;
  name: string | null;
  html_url: string;
  draft: boolean;
  prerelease: boolean;
  assets: ReleaseAsset[];
}

export interface Installer {
  os: Os;
  name: string;
  url: string;
  size: number;
}

export interface LatestRelease {
  tag: string;
  name: string;
  page: string;
  installers: Installer[];
}

export function detectOs(ua: string | null | undefined): Os | null {
  const s = ua ?? "";
  if (/iPhone|iPad|iPod|Android/i.test(s)) return null;
  if (/Windows/i.test(s)) return "windows";
  if (/Macintosh|Mac OS X/i.test(s)) return "macos";
  if (/Linux|X11|CrOS/i.test(s)) return "linux";
  return null;
}

export type MacArch = "arm64" | "x64";

export function macArch(archHint: string | null | undefined): MacArch {
  const h = (archHint ?? "").replace(/"/g, "").toLowerCase();
  return h === "x86" ? "x64" : "arm64";
}

export function installersFor(assets: ReleaseAsset[], arch: MacArch = "arm64"): Installer[] {
  const out: Installer[] = [];
  for (const os of OSES) {
    const a =
      assets.find((x) => INSTALLER[os].test(x.name)) ??
      (os === "macos" ? assets.find((x) => x.name === `bkt-darwin-${arch}`) ?? assets.find((x) => /^bkt-darwin-(arm64|x64)$/.test(x.name)) : undefined);
    if (a) out.push({ os, name: a.name, url: a.browser_download_url, size: a.size });
  }
  return out;
}

export function pickLatest(releases: GitHubRelease[], arch: MacArch = "arm64"): LatestRelease | null {
  const r = releases.find((x) => !x.draft && !x.prerelease && x.tag_name.startsWith(RELEASE_TAG_PREFIX));
  if (!r) return null;
  return { tag: r.tag_name, name: r.name || r.tag_name, page: r.html_url, installers: installersFor(r.assets, arch) };
}

export function orderFor(os: Os | null, installers: Installer[]): Installer[] {
  return [...installers].sort((a, b) => Number(b.os === os) - Number(a.os === os));
}

export async function fetchLatestRelease(fetcher: typeof fetch = fetch, arch: MacArch = "arm64"): Promise<LatestRelease | null> {
  try {
    const res = await fetcher(`https://api.github.com/repos/${RELEASE_REPO}/releases?per_page=20`, {
      headers: { accept: "application/vnd.github+json" },
      next: { revalidate: 900 },
    } as RequestInit);
    if (!res.ok) return null;
    return pickLatest((await res.json()) as GitHubRelease[], arch);
  } catch {
    return null;
  }
}

export function megabytes(bytes: number): string {
  return `${Math.round(bytes / 1_000_000)} MB`;
}
