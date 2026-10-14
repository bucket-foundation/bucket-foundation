import { createHash, randomBytes } from "node:crypto";
import { chmodSync, closeSync, existsSync, openSync, renameSync, rmSync, statSync, writeSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import type { Route } from "./serve";
import { assetName, checkUpdate, type UpdateResult } from "./update";

export type InstallKind = "binary" | "appimage" | "desktop" | "flatpak" | "package" | "source";

export interface Install {
  kind: InstallKind;
  path: string | null;
}

export interface InstallEnv {
  env: Record<string, string | undefined>;
  execPath: string;
  platform: string;
  arch: string;
  flatpakInfo: boolean;
}

const SOURCE_RUNTIMES = new Set(["bun", "bun.exe", "node", "node.exe"]);
const PACKAGE_DIRS = ["/usr/bin/", "/usr/lib/", "/usr/libexec/", "/opt/", "/snap/", "/nix/store/", "/Applications/"];

export function detectInstall(e: InstallEnv = currentEnv()): Install {
  if (e.env.BKT_SIDECAR === "1") return { kind: "desktop", path: null };
  if (e.flatpakInfo || e.env.FLATPAK_ID) return { kind: "flatpak", path: null };
  if (e.env.APPIMAGE) return { kind: "appimage", path: e.env.APPIMAGE };
  if (SOURCE_RUNTIMES.has(basename(e.execPath))) return { kind: "source", path: null };
  if (PACKAGE_DIRS.some((d) => e.execPath.startsWith(d))) return { kind: "package", path: e.execPath };
  return { kind: "binary", path: e.execPath };
}

function currentEnv(): InstallEnv {
  return { env: process.env, execPath: process.execPath, platform: process.platform, arch: process.arch, flatpakInfo: existsSync("/.flatpak-info") };
}

export function appImageName(version: string, arch: string = process.arch): string {
  const a = { x64: "x86_64", arm64: "aarch64" }[arch];
  if (!a) throw new Error(`no Bucket AppImage for ${arch}`);
  return `Bucket-${version}-${a}.AppImage`;
}

export function assetFor(i: Install, arch: string = process.arch, platform: string = process.platform): string | ((version: string) => string) {
  return i.kind === "appimage" ? (v) => appImageName(v, arch) : assetName(platform, arch);
}

export const INSTRUCTIONS: Record<Exclude<InstallKind, "binary" | "appimage">, string> = {
  desktop: "The desktop app installs new releases when it starts. Quit Bucket and open it again.",
  flatpak: "Update Bucket with: flatpak update",
  package: "Bucket came from your package manager. Update it there, for example: sudo dnf upgrade bucket",
  source: "This copy runs from source. Pull the latest code to update it.",
};

export function selfReplaces(i: Install): i is Install & { path: string } {
  return (i.kind === "binary" || i.kind === "appimage") && i.path !== null;
}

export const MAX_DOWNLOAD_BYTES = 600 * 1024 * 1024;

export interface InstallDeps {
  fetch: typeof fetch;
  maxBytes?: number;
}

export async function download(f: typeof fetch, url: string, dest: string, maxBytes: number): Promise<string> {
  if (!url.startsWith("https://")) throw new Error(`refusing a non-https url: ${url}`);
  const r = await f(url, { redirect: "follow", signal: AbortSignal.timeout(600_000) });
  if (r.url && !r.url.startsWith("https://")) throw new Error(`${url} redirected off https`);
  if (!r.ok || !r.body) throw new Error(`${url} answered ${r.status}`);
  const hash = createHash("sha256");
  const fd = openSync(dest, "wx", 0o600);
  let total = 0;
  try {
    const reader = r.body.getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        throw new Error(`${url} is larger than ${maxBytes} bytes`);
      }
      hash.update(value);
      writeSync(fd, value);
    }
  } finally {
    closeSync(fd);
  }
  return hash.digest("hex");
}

export function swapInto(target: string, next: string): void {
  const backup = `${target}.old`;
  rmSync(backup, { force: true });
  renameSync(target, backup);
  try {
    renameSync(next, target);
  } catch (e) {
    renameSync(backup, target);
    throw e;
  }
  try {
    rmSync(backup, { force: true });
  } catch {
    return;
  }
}

export async function installRelease(r: Extract<UpdateResult, { status: "available" }>, target: string, d: InstallDeps): Promise<void> {
  const next = join(dirname(target), `.${basename(target)}.${randomBytes(6).toString("hex")}.part`);
  try {
    const sum = await download(d.fetch, r.url, next, d.maxBytes ?? MAX_DOWNLOAD_BYTES);
    if (sum !== r.sha256) throw new Error(`the download of ${r.asset} does not match the signed checksum`);
    chmodSync(next, statSync(target).mode & 0o777 || 0o755);
    swapInto(target, next);
  } finally {
    rmSync(next, { force: true });
  }
}

export type InstallOutcome =
  | { status: "installed"; version: string }
  | { status: "current"; version: string }
  | { status: "manual"; version: string | null; instruction: string }
  | { status: "error"; error: string };

export interface UpdateDeps {
  fetch?: typeof fetch;
  now?: () => number;
  current?: string;
  pubkey?: string;
  install?: Install;
  arch?: string;
  platform?: string;
  maxBytes?: number;
}

export async function checkFor(d: UpdateDeps = {}): Promise<{ install: Install; result: UpdateResult }> {
  const install = d.install ?? detectInstall();
  let asset: string | ((v: string) => string);
  try {
    asset = assetFor(install, d.arch, d.platform);
  } catch (e) {
    return { install, result: { status: "error", error: (e as Error).message } };
  }
  const result = await checkUpdate({ ...(d.fetch ? { fetch: d.fetch } : {}), ...(d.now ? { now: d.now } : {}), ...(d.current ? { current: d.current } : {}), ...(d.pubkey ? { pubkey: d.pubkey } : {}), asset });
  return { install, result };
}

export async function updateNow(d: UpdateDeps = {}): Promise<InstallOutcome> {
  const { install, result } = await checkFor(d);
  if (result.status === "error") return result;
  if (result.status === "current") return result;
  if (!selfReplaces(install)) return { status: "manual", version: result.version, instruction: INSTRUCTIONS[install.kind as keyof typeof INSTRUCTIONS] };
  try {
    await installRelease(result, install.path, { fetch: d.fetch ?? fetch, maxBytes: d.maxBytes });
  } catch (e) {
    return { status: "error", error: (e as Error).message };
  }
  return { status: "installed", version: result.version };
}

export function describeOutcome(o: InstallOutcome): string {
  if (o.status === "installed") return `bkt ${o.version} is installed. Restart Bucket to use it.`;
  if (o.status === "current") return `bkt ${o.version} is the latest release`;
  if (o.status === "manual") return o.instruction;
  return `update failed: ${o.error}`;
}

export interface UpdateView {
  current: string;
  kind: InstallKind;
  selfUpdate: boolean;
  instruction: string | null;
  result: UpdateResult;
}

const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

export function updateRoutes(d: UpdateDeps & { current: string }): Record<string, Route> {
  let running = false;
  return {
    "GET /local/update": async () => {
      const { install, result } = await checkFor(d);
      const self = selfReplaces(install);
      const view: UpdateView = { current: d.current, kind: install.kind, selfUpdate: self, instruction: self ? null : INSTRUCTIONS[install.kind as keyof typeof INSTRUCTIONS], result };
      return reply(view);
    },
    "POST /local/update/install": async () => {
      if (running) return reply({ status: "error", error: "an update is already running" }, 409);
      running = true;
      try {
        const o = await updateNow(d);
        return reply(o, o.status === "error" ? 502 : 200);
      } finally {
        running = false;
      }
    },
  };
}
