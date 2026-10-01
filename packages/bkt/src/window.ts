import { spawn } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, readFileSync, readlinkSync, rmSync, writeFileSync } from "node:fs";
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

export interface WindowRecord {
  pid: number;
  profile: string;
}

export interface ProcessTable {
  commandLine(pid: number): string | null;
  lockPid(profile: string): number | null;
}

export interface Spawned {
  pid: number | null;
  exited: Promise<void>;
}

export type Spawner = (cmd: string[], url: string) => Spawned;

export const profileFlag = (profile: string) => `--user-data-dir=${profile}`;

export function singletonLockPid(profile: string): number | null {
  try {
    const pid = Number(/-(\d+)$/.exec(readlinkSync(join(profile, "SingletonLock")))?.[1]);
    return Number.isInteger(pid) && pid > 0 ? pid : null;
  } catch {
    return null;
  }
}

export function holdsProfile(commandLine: string | null, profile: string): boolean {
  if (commandLine === null) return false;
  const flag = profileFlag(profile);
  for (let at = commandLine.indexOf(flag); at !== -1; at = commandLine.indexOf(flag, at + 1)) {
    const after = commandLine[at + flag.length];
    if (after === undefined || after === " " || after === '"') return true;
  }
  return false;
}

export function requestReopen(dir: string): void {
  platformFor().secureDir(dir);
  writeFileSync(join(dir, "app-reopen"), "", { mode: 0o600 });
}

export function takeReopen(dir: string): boolean {
  const p = join(dir, "app-reopen");
  if (!existsSync(p)) return false;
  rmSync(p, { force: true });
  return true;
}

export type WindowState = "none" | "tab" | "tracked";

export function windowState(dir: string): WindowState {
  try {
    const rec = JSON.parse(readFileSync(join(dir, "window.json"), "utf8")) as { tab?: unknown };
    return rec.tab === true ? "tab" : "tracked";
  } catch {
    return "none";
  }
}

export function writeTab(dir: string): void {
  platformFor().secureDir(dir);
  const p = join(dir, "window.json");
  writeFileSync(p, JSON.stringify({ tab: true }), { mode: 0o600 });
  chmodSync(p, 0o600);
}

export function processTable(platform: Platform = platformFor()): ProcessTable {
  return { commandLine: (pid) => platform.commandLine(pid), lockPid: singletonLockPid };
}

export function windowPid(dir: string, table: ProcessTable): number | null {
  let rec: WindowRecord;
  try {
    rec = JSON.parse(readFileSync(join(dir, "window.json"), "utf8")) as WindowRecord;
  } catch {
    return null;
  }
  if (!Number.isInteger(rec.pid) || typeof rec.profile !== "string" || rec.profile === "") return null;
  for (const pid of [table.lockPid(rec.profile), rec.pid]) {
    if (pid !== null && pid !== process.pid && holdsProfile(table.commandLine(pid), rec.profile)) return pid;
  }
  return null;
}

export function writeWindow(dir: string, rec: WindowRecord): void {
  platformFor().secureDir(dir);
  const p = join(dir, "window.json");
  writeFileSync(p, JSON.stringify(rec), { mode: 0o600 });
  chmodSync(p, 0o600);
}

export const spawnWindow: Spawner = (cmd, url) => {
  const child = spawn(cmd[0], cmd.slice(1), { detached: true, stdio: "ignore" });
  const exited = new Promise<void>((done) => {
    child.on("exit", () => done());
    child.on("error", (e) => {
      console.error(`could not open a window: ${e.message}; open ${url}`);
      done();
    });
  });
  child.unref();
  return { pid: child.pid ?? null, exited };
};

export interface RouteAnswer {
  route: string | null;
  superseded: boolean;
}

export class RouteInbox {
  private pending: string | null = null;
  private waiter: ((answer: RouteAnswer) => void) | null = null;

  push(route: string): void {
    const w = this.waiter;
    if (w) w({ route, superseded: false });
    else this.pending = route;
  }

  next(waitMs: number): Promise<RouteAnswer> {
    if (this.pending !== null) {
      const route = this.pending;
      this.pending = null;
      return Promise.resolve({ route, superseded: false });
    }
    this.waiter?.({ route: null, superseded: true });
    return new Promise((resolve) => {
      const settle = (answer: RouteAnswer) => {
        clearTimeout(timer);
        if (this.waiter === settle) this.waiter = null;
        resolve(answer);
      };
      const timer = setTimeout(() => settle({ route: null, superseded: false }), waitMs);
      this.waiter = settle;
    });
  }
}

export interface AppWindowDeps {
  table: ProcessTable;
  spawn: Spawner;
  command: (url: string, profile: string) => string[];
}

export type Relaunch = "opened" | "routed" | "kept";

export class AppWindow {
  readonly routes = new RouteInbox();
  private exited: Promise<void> = new Promise<void>(() => {});

  constructor(
    private dir: string,
    private profile: string,
    private deps: AppWindowDeps = { table: processTable(), spawn: spawnWindow, command: windowCommand },
  ) {}

  isOpen(): boolean {
    return windowPid(this.dir, this.deps.table) !== null;
  }

  open(url: string): void {
    mkdirSync(this.profile, { recursive: true, mode: 0o700 });
    const cmd = this.deps.command(url, this.profile);
    const child = this.deps.spawn(cmd, url);
    if (child.pid === null || !cmd.includes(profileFlag(this.profile))) return writeTab(this.dir);
    writeWindow(this.dir, { pid: child.pid, profile: this.profile });
    this.exited = child.exited;
  }

  relaunch(route: string | null, freshUrl: () => string): Relaunch {
    if (windowState(this.dir) !== "tab" && !this.isOpen()) {
      this.open(routeUrl(freshUrl(), route));
      return "opened";
    }
    if (route === null) return "kept";
    this.routes.push(checkRoute(route));
    return "routed";
  }

  async closed(busy: () => boolean, sleep: (ms: number) => Promise<unknown> = Bun.sleep, everyMs = 3000): Promise<void> {
    for (;;) {
      await this.exited;
      await sleep(everyMs);
      if (!this.isOpen() && !busy()) return;
    }
  }

  forget(): void {
    rmSync(join(this.dir, "window.json"), { force: true });
  }
}

export interface AskDeps {
  table: ProcessTable;
  signal: (pid: number) => void;
}

export function askRunningApp(dir: string, running: AppRecord, route: string | null, deps: AskDeps): string {
  const tab = windowState(dir) === "tab";
  const open = tab || windowPid(dir, deps.table) !== null;
  if (route !== null) writeRoute(dir, route);
  if (!open || route !== null) deps.signal(running.pid);
  if (!open) return `opened the Bucket window on port ${running.port}`;
  if (tab) return `Bucket is already running at ${routeUrl(`http://127.0.0.1:${running.port}/`, route)}`;
  return route === null ? "the Bucket window is already open" : `the Bucket window is already open and now shows ${route}`;
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

export const ROUTE_WAIT_MS = 8000;

export function windowRoutes(inbox: RouteInbox, waitMs = ROUTE_WAIT_MS): Record<string, () => Promise<Response>> {
  return {
    "GET /local/window/route": async () =>
      new Response(JSON.stringify(await inbox.next(waitMs)), { headers: { "content-type": "application/json", "cache-control": "no-store" } }),
  };
}
