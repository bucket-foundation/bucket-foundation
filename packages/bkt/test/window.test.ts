import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  AppWindow,
  askRunningApp,
  profileFlag,
  readApp,
  runtimeDir,
  singletonLockPid,
  takeRoute,
  windowCommand,
  windowPid,
  windowRoutes,
  writeApp,
  writeWindow,
  type ProcessTable,
  type Spawner,
} from "../src/window";

let dir: string;
beforeEach(() => {
  dir = join(mkdtempSync(join(tmpdir(), "bkt-rt-")), "bucket");
});
afterEach(() => rmSync(join(dir, ".."), { recursive: true, force: true }));

const liveKill = (() => true) as unknown as typeof process.kill;
const deadKill = (() => {
  throw new Error("ESRCH");
}) as unknown as typeof process.kill;

describe("app record", () => {
  test("holds pid and port only, private to the user", () => {
    const release = writeApp(dir, { pid: 999_999, port: 4321 });
    expect(statSync(dir).mode & 0o777).toBe(0o700);
    expect(statSync(join(dir, "app.json")).mode & 0o777).toBe(0o600);
    expect(JSON.parse(readFileSync(join(dir, "app.json"), "utf8"))).toEqual({ pid: 999_999, port: 4321 });
    expect(readApp(dir, liveKill)).toEqual({ pid: 999_999, port: 4321 });
    release();
    expect(existsSync(join(dir, "app.json"))).toBe(false);
  });

  test("a dead or garbled record is cleared", () => {
    writeApp(dir, { pid: 999_999, port: 4321 });
    expect(readApp(dir, deadKill)).toBeNull();
    expect(existsSync(join(dir, "app.json"))).toBe(false);
    writeFileSync(join(dir, "app.json"), "{");
    expect(readApp(dir, liveKill)).toBeNull();
  });

  test("runtime dir sits under XDG_RUNTIME_DIR", () => {
    expect(runtimeDir({ XDG_RUNTIME_DIR: "/run/user/1000" })).toBe("/run/user/1000/bucket");
  });
});

describe("window command", () => {
  test("opens a dedicated app profile with extensions off", () => {
    const cmd = windowCommand("http://127.0.0.1:5/", "/p", (b) => (b === "google-chrome" ? "/usr/bin/google-chrome" : null));
    expect(cmd).toEqual([
      "/usr/bin/google-chrome",
      "--app=http://127.0.0.1:5/",
      "--user-data-dir=/p",
      "--disable-extensions",
      "--no-first-run",
      "--no-default-browser-check",
      "--window-size=1280,860",
    ]);
  });

  test("falls back to xdg-open", () => {
    expect(windowCommand("http://127.0.0.1:5/", "/p", () => null)).toEqual(["xdg-open", "http://127.0.0.1:5/"]);
  });
});

class Desk {
  procs = new Map<number, string>();
  locks = new Map<string, number>();
  spawned: string[][] = [];
  exits = new Map<number, () => void>();
  nextPid = 500;
  table: ProcessTable = { commandLine: (pid) => this.procs.get(pid) ?? null, lockPid: (profile) => this.locks.get(profile) ?? null };
  spawn: Spawner = (cmd) => {
    const pid = this.nextPid++;
    this.spawned.push(cmd);
    this.procs.set(pid, cmd.join(" "));
    return { pid, exited: new Promise<void>((done) => this.exits.set(pid, done)) };
  };
  command = (url: string, profile: string) => ["/usr/bin/chromium", `--app=${url}`, profileFlag(profile)];
  close(pid: number) {
    this.procs.delete(pid);
    this.exits.get(pid)?.();
  }
  windows(profile: string) {
    return [...this.procs.values()].filter((c) => c.includes(profileFlag(profile))).length;
  }
}

describe("one window per profile", () => {
  const SERVER = { pid: 4242, port: 4321 };
  let desk: Desk;
  let profile: string;
  let win: AppWindow;
  let signals: number[];
  let mints: number;
  const fresh = () => `http://127.0.0.1:4321/?mint=${++mints}`;
  const launch = (route: string | null = null) => {
    const line = askRunningApp(dir, SERVER, route, { table: desk.table, signal: (pid) => signals.push(pid) });
    const signalled = signals.splice(0).length > 0;
    return { line, did: signalled ? win.relaunch(takeRoute(dir), fresh) : null };
  };

  beforeEach(() => {
    desk = new Desk();
    profile = join(dir, "..", "window-profile");
    win = new AppWindow(dir, profile, desk);
    signals = [];
    mints = 0;
  });

  test("two launches leave one window process", () => {
    win.open("http://127.0.0.1:4321/");
    expect(desk.windows(profile)).toBe(1);
    expect(launch()).toEqual({ line: "the Bucket window is already open", did: null });
    expect(launch()).toEqual({ line: "the Bucket window is already open", did: null });
    expect(desk.spawned).toHaveLength(1);
    expect(desk.windows(profile)).toBe(1);
    expect(mints).toBe(0);
    expect(statSync(join(dir, "window.json")).mode & 0o777).toBe(0o600);
  });

  test("a window that is gone is opened once, with a fresh launch code", () => {
    win.open("http://127.0.0.1:4321/");
    desk.close(500);
    expect(launch()).toEqual({ line: "opened the Bucket window on port 4321", did: "opened" });
    expect(launch().line).toBe("the Bucket window is already open");
    expect(desk.spawned).toHaveLength(2);
    expect(desk.spawned[1][1]).toBe("--app=http://127.0.0.1:4321/?mint=1");
    expect(desk.windows(profile)).toBe(1);
  });

  test("a stale record with a reused pid opens one window", () => {
    writeWindow(dir, { pid: 77, profile });
    desk.procs.set(77, "/usr/bin/vim notes.txt");
    expect(windowPid(dir, desk.table)).toBeNull();
    expect(launch().did).toBe("opened");
    expect(launch().did).toBeNull();
    expect(desk.spawned).toHaveLength(1);
    expect(desk.windows(profile)).toBe(1);
  });

  test("a browser that took the window over from the spawned process still counts", () => {
    win.open("http://127.0.0.1:4321/");
    desk.close(500);
    desk.procs.set(900, `/usr/bin/chromium ${profileFlag(profile)}`);
    desk.locks.set(profile, 900);
    expect(windowPid(dir, desk.table)).toBe(900);
    expect(launch().line).toBe("the Bucket window is already open");
    desk.procs.set(900, "/usr/bin/vim");
    expect(launch().did).toBe("opened");
  });

  test("a route to an open window opens none and reaches the page through the server", async () => {
    win.open("http://127.0.0.1:4321/");
    const poll = windowRoutes(win.routes, 1000)["GET /local/window/route"]();
    expect(launch("/work/daily/2026-10-01")).toEqual({ line: "the Bucket window is already open and now shows /work/daily/2026-10-01", did: "routed" });
    expect(await (await poll).json()).toEqual({ route: "/work/daily/2026-10-01" });
    expect(launch("/notes").did).toBe("routed");
    expect(await (await windowRoutes(win.routes, 1000)["GET /local/window/route"]()).json()).toEqual({ route: "/notes" });
    expect(await (await windowRoutes(win.routes, 5)["GET /local/window/route"]()).json()).toEqual({ route: null });
    expect(desk.spawned).toHaveLength(1);
    expect(mints).toBe(0);
    expect(() => askRunningApp(dir, SERVER, "//evil.test", { table: desk.table, signal: () => {} })).toThrow("--route takes");
  });

  test("a route with no window opens one window on that route", () => {
    expect(launch("/notes")).toEqual({ line: "opened the Bucket window on port 4321", did: "opened" });
    expect(desk.spawned).toEqual([["/usr/bin/chromium", "--app=http://127.0.0.1:4321/?mint=1#/notes", profileFlag(profile)]]);
  });

  test("the server waits for the last window to close and for a running job", async () => {
    win.open("http://127.0.0.1:4321/");
    let done = false;
    let busy = true;
    let ticks = 0;
    const closed = win.closed(() => busy, async () => (ticks++, Bun.sleep(1)), 0).then(() => (done = true));
    await Bun.sleep(5);
    expect(done).toBe(false);
    expect(ticks).toBe(0);
    desk.close(500);
    await Bun.sleep(5);
    expect(done).toBe(false);
    busy = false;
    await closed;
    expect(done).toBe(true);
    win.forget();
    expect(existsSync(join(dir, "window.json"))).toBe(false);
  });

  test("a browser tab opened without a profile is never tracked, so the server keeps running", async () => {
    const tab = new AppWindow(dir, profile, { ...desk, table: desk.table, spawn: desk.spawn, command: (url) => ["xdg-open", url] });
    tab.open("http://127.0.0.1:4321/");
    expect(existsSync(join(dir, "window.json"))).toBe(false);
    let done = false;
    void tab.closed(() => false, () => Bun.sleep(1), 0).then(() => (done = true));
    desk.close(500);
    await Bun.sleep(5);
    expect(done).toBe(false);
  });

  test("the browser's own lock names the process that holds the profile", () => {
    mkdirSync(profile, { recursive: true });
    expect(singletonLockPid(profile)).toBeNull();
    if (process.platform === "win32") return;
    symlinkSync("host.example-31337", join(profile, "SingletonLock"));
    expect(singletonLockPid(profile)).toBe(31337);
  });
});
