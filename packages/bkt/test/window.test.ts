import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readApp, runtimeDir, windowCommand, writeApp } from "../src/window";

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
