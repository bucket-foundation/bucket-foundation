import { spawn } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

export interface AppRecord {
  pid: number;
  port: number;
}

export function runtimeDir(env = process.env): string {
  const base = env.XDG_RUNTIME_DIR ?? join(env.TMPDIR ?? "/tmp", `bucket-${process.getuid?.() ?? "user"}`);
  return join(base, "bucket");
}

export function uiDir(env = process.env): string {
  return env.BKT_UI_DIR ?? resolve(import.meta.dir, "../../bkt-ui/dist");
}

function alive(pid: number, kill: typeof process.kill): boolean {
  try {
    kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

export function readApp(dir: string, kill: typeof process.kill = process.kill): AppRecord | null {
  const p = join(dir, "app.json");
  try {
    const r = JSON.parse(readFileSync(p, "utf8")) as AppRecord;
    if (Number.isInteger(r.pid) && Number.isInteger(r.port) && r.pid !== process.pid && alive(r.pid, kill)) return r;
  } catch {
    return null;
  }
  rmSync(p, { force: true });
  return null;
}

export function writeApp(dir: string, rec: AppRecord): () => void {
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  chmodSync(dir, 0o700);
  const p = join(dir, "app.json");
  writeFileSync(p, JSON.stringify(rec), { mode: 0o600 });
  chmodSync(p, 0o600);
  return () => {
    try {
      if ((JSON.parse(readFileSync(p, "utf8")) as AppRecord).pid === rec.pid) rmSync(p, { force: true });
    } catch {
      return;
    }
  };
}

const BROWSERS = ["chromium-browser", "chromium", "google-chrome", "google-chrome-stable", "brave-browser"];

function which(bin: string, path = process.env.PATH ?? ""): string | null {
  for (const d of path.split(":")) if (d && existsSync(join(d, bin))) return join(d, bin);
  return null;
}

export function windowCommand(url: string, profile: string, find: (b: string) => string | null = which): string[] {
  for (const b of BROWSERS) {
    const bin = find(b);
    if (bin) return [bin, `--app=${url}`, `--user-data-dir=${profile}`, "--disable-extensions", "--no-first-run", "--no-default-browser-check", "--window-size=1280,860"];
  }
  return ["xdg-open", url];
}

export function openWindow(url: string, profile: string): void {
  mkdirSync(profile, { recursive: true, mode: 0o700 });
  const [cmd, ...args] = windowCommand(url, profile);
  const child = spawn(cmd, args, { detached: true, stdio: "ignore" });
  child.on("error", (e) => console.error(`could not open a window: ${e.message}; open ${url}`));
  child.unref();
}
