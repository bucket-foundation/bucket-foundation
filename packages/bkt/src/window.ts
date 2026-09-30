import { spawn } from "node:child_process";
import { chmodSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { platformFor, type Platform } from "./platform";

export interface AppRecord {
  pid: number;
  port: number;
}

export function runtimeDir(env = process.env): string {
  const base = env.XDG_RUNTIME_DIR ?? join(env.TMPDIR ?? tmpdir(), `bucket-${process.getuid?.() ?? "user"}`);
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
  platformFor().secureDir(dir);
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

export function windowCommand(url: string, profile: string, find?: (b: string) => string | null, platform?: Platform): string[] {
  return (platform ?? platformFor(process.platform, find ? { which: find } : {})).windowCommand(url, profile);
}

export function openWindow(url: string, profile: string): void {
  mkdirSync(profile, { recursive: true, mode: 0o700 });
  const [cmd, ...args] = windowCommand(url, profile);
  const child = spawn(cmd, args, { detached: true, stdio: "ignore" });
  child.on("error", (e) => console.error(`could not open a window: ${e.message}; open ${url}`));
  child.unref();
}
