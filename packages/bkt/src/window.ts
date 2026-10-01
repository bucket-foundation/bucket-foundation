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

export const VIEWS = ["learn", "path", "quiz", "review", "import", "advisors", "primes", "jobs", "work", "canon", "atlases", "notes", "history"] as const;
const DAILY = /^\/work\/daily\/(\d{4}-\d{2}-\d{2})$/;

export class RouteError extends Error {}

function calendarDay(day: string): boolean {
  const d = new Date(`${day}T00:00:00Z`);
  return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === day;
}

export function checkRoute(route: unknown): string {
  const daily = typeof route === "string" ? DAILY.exec(route) : null;
  const ok = typeof route === "string" && (daily ? calendarDay(daily[1]) : (VIEWS as readonly string[]).some((v) => route === `/${v}`));
  if (!ok) throw new RouteError(`--route takes /work/daily/YYYY-MM-DD or one of ${VIEWS.map((v) => `/${v}`).join(", ")}`);
  return route as string;
}

export function routeUrl(url: string, route: string | null): string {
  return route === null ? url : `${url}#${checkRoute(route)}`;
}

export function writeRoute(dir: string, route: string): void {
  platformFor().secureDir(dir);
  const p = join(dir, "app-route");
  writeFileSync(p, checkRoute(route), { mode: 0o600 });
  chmodSync(p, 0o600);
}

export function takeRoute(dir: string): string | null {
  const p = join(dir, "app-route");
  try {
    return checkRoute(readFileSync(p, "utf8"));
  } catch {
    return null;
  } finally {
    rmSync(p, { force: true });
  }
}
