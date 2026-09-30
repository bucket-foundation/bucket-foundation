import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ensureDevice } from "../src/device";
import { SERVICE } from "../src/keyring";
import { DpapiKeyring, KeychainKeyring, platformFor, type Exec, type PlatformDeps } from "../src/platform";
import { pickKeyring } from "../src/setup";

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "bkt-platform-"));
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

const deps = (over: Partial<PlatformDeps> = {}): Partial<PlatformDeps> => ({
  env: {},
  home: "/home/u",
  which: () => null,
  exists: () => false,
  exec: async () => ({ code: 1, stdout: "", stderr: "unexpected" }),
  ...over,
});

function fakeSecurity() {
  const items = new Map<string, string>();
  const calls: string[][] = [];
  const run: Exec = async (argv, stdin) => {
    calls.push(argv);
    if (argv[1] === "find-generic-password") {
      const v = items.get(argv[5]);
      return v === undefined ? { code: 44, stdout: "", stderr: "not found" } : { code: 0, stdout: `${v}\n`, stderr: "" };
    }
    if (argv[1] === "-i") {
      const m = stdin!.match(/^add-generic-password -s (\S+) -a (\S+) -l "[^"]*" -w (\S+)\n$/);
      if (!m || m[1] !== SERVICE) return { code: 1, stdout: "", stderr: "bad line" };
      items.set(m[2], m[3]);
      return { code: 0, stdout: "", stderr: "" };
    }
    return { code: 1, stdout: "", stderr: "unknown" };
  };
  return { run, items, calls };
}

function fakePowershell() {
  const calls: { argv: string[]; stdin?: string }[] = [];
  const run: Exec = async (argv, stdin) => {
    calls.push({ argv, stdin });
    const script = argv[argv.length - 1];
    const data = Buffer.from(stdin!.trim(), "base64");
    if (script.includes("::Protect(")) return { code: 0, stdout: Buffer.concat([Buffer.from("DP"), data]).toString("base64"), stderr: "" };
    if (script.includes("::Unprotect(")) return { code: 0, stdout: data.subarray(2).toString("base64"), stderr: "" };
    return { code: 1, stdout: "", stderr: "unknown" };
  };
  return { run, calls };
}

describe("linux", () => {
  test("keeps the libsecret, chromium and xdg-open behavior", () => {
    const p = platformFor("linux", deps({ which: (b) => (b === "chromium" ? "/usr/bin/chromium" : null) }));
    expect(p.nativeKeyring).toBe("libsecret");
    expect(p.windowCommand("http://127.0.0.1:5/", "/p")[0]).toBe("/usr/bin/chromium");
    expect(p.windowCommand("http://127.0.0.1:5/", "/p")).toContain("--app=http://127.0.0.1:5/");
    expect(platformFor("linux", deps()).windowCommand("http://x/", "/p")).toEqual(["xdg-open", "http://x/"]);
  });

  test("paths follow XDG with home fallbacks", () => {
    const p = platformFor("linux", deps());
    expect([p.dataDir(), p.cacheDir(), p.configDir(), p.python()]).toEqual(["/home/u/.local/share", "/home/u/.cache", "/home/u/.config", "python3"]);
    const x = platformFor("linux", deps({ env: { XDG_DATA_HOME: "/d", XDG_CACHE_HOME: "/c", XDG_CONFIG_HOME: "/f" } }));
    expect([x.dataDir(), x.cacheDir(), x.configDir()]).toEqual(["/d", "/c", "/f"]);
  });

  test("no libsecret means no native keyring", () => {
    expect(platformFor("linux", deps({ env: { PATH: "/nonexistent" } })).keyring()).toBeNull();
  });
});

describe("macos", () => {
  test("opens a Chromium browser as an app window with open -na", () => {
    const p = platformFor("darwin", deps({ exists: (f) => f === "/Applications/Brave Browser.app" }));
    expect(p.windowCommand("http://127.0.0.1:5/", "/p")).toEqual([
      "open",
      "-na",
      "Brave Browser",
      "--args",
      "--app=http://127.0.0.1:5/",
      "--user-data-dir=/p",
      "--disable-extensions",
      "--no-first-run",
      "--no-default-browser-check",
      "--window-size=1280,860",
    ]);
  });

  test("prefers Chrome and finds per-user apps", () => {
    const all = platformFor("darwin", deps({ exists: () => true }));
    expect(all.windowCommand("http://x/", "/p")[2]).toBe("Google Chrome");
    const user = platformFor("darwin", deps({ exists: (f) => f === "/home/u/Applications/Chromium.app" }));
    expect(user.windowCommand("http://x/", "/p")[2]).toBe("Chromium");
  });

  test("falls back to open", () => {
    expect(platformFor("darwin", deps()).windowCommand("http://x/", "/p")).toEqual(["open", "http://x/"]);
  });

  test("paths live under ~/Library", () => {
    const p = platformFor("darwin", deps());
    expect([p.dataDir(), p.cacheDir(), p.configDir(), p.python()]).toEqual([
      "/home/u/Library/Application Support",
      "/home/u/Library/Caches",
      "/home/u/Library/Application Support",
      "python3",
    ]);
  });

  test("keychain keyring needs the security CLI", () => {
    expect(platformFor("darwin", deps()).keyring()).toBeNull();
    expect(platformFor("darwin", deps({ which: (b) => (b === "security" ? "/usr/bin/security" : null) })).keyring()?.kind).toBe("keychain");
  });

  test("keychain round trips a multi-line device key without it on argv", async () => {
    const f = fakeSecurity();
    const kr = new KeychainKeyring(f.run);
    expect(await kr.get("device-ed25519")).toBeNull();
    const d = await ensureDevice(kr);
    expect(d.created).toBe(true);
    expect((await ensureDevice(kr)).publicKey).toBe(d.publicKey);
    const pem = (await kr.get("device-ed25519"))!;
    expect(pem).toContain("PRIVATE KEY");
    expect(f.calls.flat().join(" ")).not.toContain("PRIVATE KEY");
    expect(f.calls.flat()).not.toContain(f.items.get("device-ed25519"));
  });

  test("keychain refuses overwrite and surfaces errors", async () => {
    const f = fakeSecurity();
    const kr = new KeychainKeyring(f.run);
    await kr.set("a", "one");
    await expect(kr.set("a", "two")).rejects.toThrow("refusing to overwrite");
    const broken = new KeychainKeyring(async () => ({ code: 51, stdout: "", stderr: "user interaction is not allowed" }));
    await expect(broken.get("a")).rejects.toThrow("user interaction is not allowed");
    await expect(kr.set("bad account", "x")).rejects.toThrow("invalid keychain account");
  });
});

describe("windows", () => {
  const winEnv = { APPDATA: "C:\\Users\\u\\AppData\\Roaming", LOCALAPPDATA: "C:\\Users\\u\\AppData\\Local", ProgramFiles: "C:\\Program Files", "ProgramFiles(x86)": "C:\\Program Files (x86)" };

  test("opens Edge as an app window", () => {
    const edge = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
    const p = platformFor("win32", deps({ env: winEnv, exists: (f) => f === edge }));
    const cmd = p.windowCommand("http://127.0.0.1:5/", "C:\\p");
    expect(cmd[0]).toBe(edge);
    expect(cmd).toContain("--app=http://127.0.0.1:5/");
    expect(cmd).toContain("--user-data-dir=C:\\p");
  });

  test("falls back to start with shell metacharacters escaped", () => {
    const p = platformFor("win32", deps({ env: winEnv }));
    expect(p.windowCommand("http://x/?a=1&b=2", "C:\\p")).toEqual(["cmd.exe", "/d", "/c", "start", '""', "http://x/?a=1^&b=2"]);
  });

  test("paths sit under APPDATA and LOCALAPPDATA", () => {
    const p = platformFor("win32", deps({ env: winEnv }));
    expect([p.dataDir(), p.cacheDir(), p.configDir()]).toEqual([winEnv.APPDATA, winEnv.LOCALAPPDATA, winEnv.APPDATA]);
    const bare = platformFor("win32", deps({ home: "C:\\Users\\u" }));
    expect(bare.dataDir()).toBe("C:\\Users\\u\\AppData\\Roaming");
  });

  test("python prefers the py launcher", () => {
    expect(platformFor("win32", deps({ which: (b) => (b === "py" ? "C:\\py.exe" : null) })).python()).toBe("py");
    expect(platformFor("win32", deps()).python()).toBe("python");
  });

  test("dpapi keyring round trips through powershell and stores only ciphertext", async () => {
    const ps = fakePowershell();
    const kr = new DpapiKeyring(join(dir, "keys"), ps.run);
    const d = await ensureDevice(kr);
    expect((await ensureDevice(kr)).publicKey).toBe(d.publicKey);
    const file = join(dir, "keys", `${SERVICE}.device-ed25519.dpapi`);
    expect(existsSync(file)).toBe(true);
    expect(readFileSync(file, "utf8")).not.toContain("PRIVATE KEY");
    expect(ps.calls.every((c) => c.argv[0] === "powershell.exe" && !c.argv.join(" ").includes("PRIVATE KEY"))).toBe(true);
    await expect(kr.set("device-ed25519", "x")).rejects.toThrow("refusing to overwrite");
  });

  test("dpapi failure writes nothing", async () => {
    const kr = new DpapiKeyring(join(dir, "keys"), async () => ({ code: 1, stdout: "", stderr: "access denied" }));
    await expect(kr.set("a", "x")).rejects.toThrow("access denied");
    expect(existsSync(join(dir, "keys"))).toBe(false);
  });
});

describe("keyring selection per platform", () => {
  test("defaults to the native keyring and names it when missing", async () => {
    await expect(pickKeyring({}, dir, {}, platformFor("darwin", deps()))).rejects.toThrow("keychain is unavailable; rerun with --keyring passphrase");
    await expect(pickKeyring({}, dir, {}, platformFor("win32", deps()))).rejects.toThrow("dpapi is unavailable");
    const mac = platformFor("darwin", deps({ which: () => "/usr/bin/security" }));
    expect((await pickKeyring({}, dir, {}, mac)).kind).toBe("keychain");
    expect((await pickKeyring({ keyring: "native" }, dir, {}, mac)).kind).toBe("keychain");
  });

  test("rejects another platform's keyring", async () => {
    await expect(pickKeyring({ keyring: "libsecret" }, dir, {}, platformFor("darwin", deps()))).rejects.toThrow("unknown keyring libsecret on darwin");
  });
});
