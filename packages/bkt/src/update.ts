import { verifySshSig } from "./sshsig";
import { VERSION } from "./version";

export const RELEASE_REPO = "bucket-foundation/bucket-foundation";

export interface Manifest {
  name: string;
  version: string;
  sha256: string;
  expires: number;
}

export type UpdateResult =
  | { status: "current"; version: string }
  | { status: "available"; version: string; tag: string; asset: string; sha256: string; url: string }
  | { status: "error"; error: string };

export function assetName(platform: string = process.platform, arch: string = process.arch): string {
  const os = { linux: "linux", darwin: "darwin", win32: "windows" }[platform];
  const cpu = { x64: "x64", arm64: "arm64" }[arch];
  if (!os || !cpu) throw new Error(`no bkt build for ${platform}-${arch}`);
  if (os === "windows" && cpu !== "x64") return "bkt-windows-x64.exe";
  return `bkt-${os}-${cpu}${os === "windows" ? ".exe" : ""}`;
}

export function parseManifest(text: string): Manifest {
  const f = Object.fromEntries(text.split("\n").filter(Boolean).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]));
  if (!/^\d+\.\d+\.\d+$/.test(f.version ?? "")) throw new Error("manifest version is malformed");
  if (!/^[0-9a-f]{64}$/.test(f.sha256 ?? "")) throw new Error("manifest checksum is malformed");
  if (!/^\d+$/.test(f.expires ?? "")) throw new Error("manifest expiry is malformed");
  return { name: f.name ?? "", version: f.version, sha256: f.sha256, expires: Number(f.expires) };
}

export function newer(a: string, b: string): boolean {
  const x = a.split(".").map(Number);
  const y = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] > y[i];
  return false;
}

interface Deps {
  fetch: typeof fetch;
  now: () => number;
  current: string;
  asset: string;
  pubkey?: string;
}

async function text(f: typeof fetch, url: string): Promise<string> {
  if (!url.startsWith("https://")) throw new Error(`refusing a non-https url: ${url}`);
  const r = await f(url, { redirect: "follow", signal: AbortSignal.timeout(15_000) });
  if (r.url && !r.url.startsWith("https://")) throw new Error(`${url} redirected off https`);
  if (!r.ok) throw new Error(`${url} answered ${r.status}`);
  const body = await r.text();
  if (body.length > 1_000_000) throw new Error(`${url} answered more than 1 MB`);
  return body;
}

export async function checkUpdate(d: Partial<Deps> = {}): Promise<UpdateResult> {
  const f = d.fetch ?? fetch;
  const now = d.now ?? Date.now;
  const current = d.current ?? VERSION;
  try {
    const asset = d.asset ?? assetName();
    const releases = JSON.parse(await text(f, `https://api.github.com/repos/${RELEASE_REPO}/releases?per_page=30`)) as { tag_name: string; draft: boolean; prerelease: boolean }[];
    const latest = releases.find((r) => !r.draft && !r.prerelease && /^bkt-v\d+\.\d+\.\d+$/.test(r.tag_name));
    if (!latest) return { status: "error", error: "no bkt release found" };
    const base = `https://github.com/${RELEASE_REPO}/releases/download/${latest.tag_name}/${asset}`;
    const [manifestText, sig] = await Promise.all([text(f, `${base}.manifest`), text(f, `${base}.manifest.sig`)]);
    if (!verifySshSig(manifestText, sig, d.pubkey)) return { status: "error", error: `signature check failed for ${asset} in ${latest.tag_name}` };
    const m = parseManifest(manifestText);
    if (m.name !== asset) return { status: "error", error: `manifest names ${m.name}, expected ${asset}` };
    if (`bkt-v${m.version}` !== latest.tag_name) return { status: "error", error: `manifest version ${m.version} does not match ${latest.tag_name}` };
    if (m.expires * 1000 <= now()) return { status: "error", error: `the ${latest.tag_name} manifest expired` };
    if (!newer(m.version, current)) return { status: "current", version: current };
    return { status: "available", version: m.version, tag: latest.tag_name, asset, sha256: m.sha256, url: base };
  } catch (e) {
    return { status: "error", error: (e as Error).message };
  }
}

export function describeUpdate(r: UpdateResult, platform: string = process.platform): string {
  if (r.status === "current") return `bkt ${r.version} is the latest release`;
  if (r.status === "error") return `update check failed: ${r.error}`;
  const how =
    platform === "win32"
      ? `$env:BKT_VERSION='${r.version}'; irm https://raw.githubusercontent.com/${RELEASE_REPO}/${r.tag}/scripts/install.ps1 | iex`
      : `BKT_VERSION=${r.version} sh -c "$(curl -fsSL https://raw.githubusercontent.com/${RELEASE_REPO}/${r.tag}/scripts/install.sh)"`;
  return `bkt ${r.version} is available, signature verified (sha256 ${r.sha256}).\nInstall it with:\n  ${how}`;
}
