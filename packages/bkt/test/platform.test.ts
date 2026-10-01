import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ensureDevice } from "../src/device";
import { SERVICE } from "../src/keyring";
import { DpapiKeyring, KeychainKeyring, LSOF, lsofOwner, netstatOwner, platformFor, procCommandLine, procNetTcpOwner, system32, windowsPowershell, windowsWhoami, type Exec, type ExecSync, type PlatformDeps } from "../src/platform";
import { statSync, writeFileSync } from "node:fs";
import { pickKeyring } from "../src/setup";

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "bkt-platform-"));
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

const deps = (over: Partial<PlatformDeps> = {}): Partial<PlatformDeps> => ({
  env: {},
  home: "/h/u",
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
    expect([p.dataDir(), p.cacheDir(), p.configDir(), p.python()]).toEqual(["/h/u/.local/share", "/h/u/.cache", "/h/u/.config", "python3"]);
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
      "-W",
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
    expect(all.windowCommand("http://x/", "/p")[3]).toBe("Google Chrome");
    const user = platformFor("darwin", deps({ exists: (f) => f === "/h/u/Applications/Chromium.app" }));
    expect(user.windowCommand("http://x/", "/p")[3]).toBe("Chromium");
  });

  test("falls back to open", () => {
    expect(platformFor("darwin", deps()).windowCommand("http://x/", "/p")).toEqual(["open", "http://x/"]);
  });

  test("paths live under ~/Library", () => {
    const p = platformFor("darwin", deps());
    expect([p.dataDir(), p.cacheDir(), p.configDir(), p.python()]).toEqual([
      "/h/u/Library/Application Support",
      "/h/u/Library/Caches",
      "/h/u/Library/Application Support",
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
    const kr = new DpapiKeyring(join(dir, "keys"), ps.run, undefined, POWERSHELL);
    const d = await ensureDevice(kr);
    expect((await ensureDevice(kr)).publicKey).toBe(d.publicKey);
    const file = join(dir, "keys", `${SERVICE}.device-ed25519.dpapi`);
    expect(existsSync(file)).toBe(true);
    expect(readFileSync(file, "utf8")).not.toContain("PRIVATE KEY");
    expect(ps.calls.every((c) => c.argv[0] === POWERSHELL && !c.argv.join(" ").includes("PRIVATE KEY"))).toBe(true);
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

const WHOAMI = "C:\\Windows\\System32\\whoami.exe";
const ICACLS = "C:\\Windows\\System32\\icacls.exe";
const NETSTAT = "C:\\Windows\\System32\\netstat.exe";
const TASKLIST = "C:\\Windows\\System32\\tasklist.exe";
const POWERSHELL = "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe";

describe("owner-only dirs", () => {
  test("windows system tools resolve under SystemRoot and never from PATH", () => {
    const hijacked = { SystemRoot: "D:\\WINNT", PATH: "C:\\evil" };
    expect([system32({}, "icacls.exe"), system32({}, "netstat.exe"), system32({}, "tasklist.exe"), windowsPowershell({})]).toEqual([ICACLS, NETSTAT, TASKLIST, POWERSHELL]);
    expect(system32(hijacked, "netstat.exe")).toBe("D:\\WINNT\\System32\\netstat.exe");
    expect(windowsPowershell(hijacked)).toBe("D:\\WINNT\\System32\\WindowsPowerShell\\v1.0\\powershell.exe");
    expect(platformFor("win32", deps({ env: hijacked })).peerTools).toEqual(["D:\\WINNT\\System32\\netstat.exe", "D:\\WINNT\\System32\\tasklist.exe"]);
    expect(platformFor("darwin", deps()).peerTools).toEqual(["/usr/sbin/lsof"]);
    expect(LSOF).toBe("/usr/sbin/lsof");
  });

  test("windows keyring needs System32 powershell and ignores one on PATH", () => {
    const onPath = platformFor("win32", deps({ which: () => "C:\\evil\\powershell.exe" }));
    expect(onPath.keyring()).toBeNull();
    expect(platformFor("win32", deps({ exists: (f) => f === POWERSHELL })).keyring()?.kind).toBe("dpapi");
  });

  test("windows whoami resolves under SystemRoot and never from PATH", () => {
    expect(windowsWhoami({})).toBe(WHOAMI);
    expect(windowsWhoami({ SystemRoot: "" })).toBe(WHOAMI);
    expect(windowsWhoami({ SystemRoot: "", SYSTEMROOT: "", windir: "G:\\Win" })).toBe("G:\\Win\\System32\\whoami.exe");
    expect(windowsWhoami({ SystemRoot: "D:\\WINNT", PATH: "C:\\Program Files\\Git\\usr\\bin" })).toBe("D:\\WINNT\\System32\\whoami.exe");
    expect(windowsWhoami({ SYSTEMROOT: "E:\\Win" })).toBe("E:\\Win\\System32\\whoami.exe");
    expect(windowsWhoami({ windir: "F:\\Win" })).toBe("F:\\Win\\System32\\whoami.exe");
  });

  test("unix dirs are 0700", () => {
    const p = join(dir, "a", "b");
    platformFor("linux", deps()).secureDir(p);
    expect(statSync(p).mode & 0o777).toBe(0o700);
  });

  test("windows dirs get an ACL for the current user SID alone, and failures stop", () => {
    const calls: string[][] = [];
    const ok: ExecSync = (argv) => (calls.push(argv), argv[0] === WHOAMI ? { code: 0, stdout: '"pc\\ann","S-1-5-21-1-2-3-1001"\r\n', stderr: "" } : { code: 0, stdout: "", stderr: "" });
    const p = join(dir, "w1");
    platformFor("win32", deps({ execSync: ok })).secureDir(p);
    expect(calls[0]).toEqual([WHOAMI, "/user", "/fo", "csv", "/nh"]);
    expect(calls.find((c) => c[0] === ICACLS)).toEqual([ICACLS, p, "/inheritance:r", "/grant:r", "*S-1-5-21-1-2-3-1001:(OI)(CI)F", "/q"]);
    const denied: ExecSync = (argv) => (argv[0] === WHOAMI ? ok(argv) : { code: 5, stdout: "", stderr: "Access is denied." });
    expect(() => platformFor("win32", deps({ execSync: denied })).secureDir(join(dir, "w2"))).toThrow("Access is denied.");
  });
});

describe("peer owner", () => {
  test("linux reads /proc/net/tcp", () => {
    const f = join(dir, "tcp");
    writeFileSync(f, "  sl  local_address rem_address   st tx_queue rx_queue tr tm->when retrnsmt   uid\n   0: 0100007F:1F90 0100007F:0050 01 00000000:00000000 00:00000000 00000000  1000\n");
    expect(procNetTcpOwner(8080, 80, [f])).toBe(1000);
    expect(procNetTcpOwner(8081, 80, [f])).toBeNull();
  });

  test("macos matches the lsof connection line", () => {
    const out = "p10\nu501\nn127.0.0.1:80->127.0.0.1:5000\np11\nu502\nn127.0.0.1:5000->127.0.0.1:80\n";
    const argvs: string[][] = [];
    const run: ExecSync = (argv) => (argvs.push(argv), { code: 0, stdout: out, stderr: "" });
    expect(lsofOwner(run, 5000, 80)).toBe(502);
    expect(argvs[0][0]).toBe("/usr/sbin/lsof");
    expect(lsofOwner(run, 5001, 80)).toBeNull();
    expect(lsofOwner(() => ({ code: 1, stdout: "", stderr: "" }), 5000, 80)).toBeNull();
    expect(lsofOwner(() => ({ code: 127, stdout: "", stderr: "lsof: not found" }), 5000, 80)).toBeUndefined();
    expect(lsofOwner(() => ({ code: 1, stdout: "", stderr: "lsof: WARNING: can't stat() fuse" }), 5000, 80)).toBeNull();
  });

  test("windows maps netstat pid to its tasklist user and hides other users", () => {
    const seen = new Set<string>();
    const run = (user: string): ExecSync => (argv) =>
      (seen.add(argv[0]), argv[0] === NETSTAT)
        ? { code: 0, stdout: "  TCP    127.0.0.1:6000    127.0.0.1:80    ESTABLISHED     4242\r\n", stderr: "" }
        : { code: 0, stdout: `"msedge.exe","4242","Console","1","100 K","Running","${user}","0:00:01","Bucket"\r\n`, stderr: "" };
    const d = (user: string) => ({ ...deps({ execSync: run(user) }), env: {} } as PlatformDeps);
    expect(netstatOwner(d("PC\\Ann"), 6000, 80)).toBe("pc\\ann");
    expect([...seen]).toEqual([NETSTAT, TASKLIST]);
    const noTasklist: ExecSync = (argv) => (argv[0] === NETSTAT ? run("PC\\Ann")(argv) : { code: 127, stdout: "", stderr: "not found" });
    expect(netstatOwner({ ...deps({ execSync: noTasklist }), env: {} } as PlatformDeps, 6000, 80)).toBeUndefined();
    expect(netstatOwner(d("N/A"), 6000, 80)).toBeNull();
    expect(netstatOwner(d("PC\\Ann"), 6002, 80)).toBeNull();
    const missing = { ...deps({ execSync: () => ({ code: 127, stdout: "", stderr: "not found" }) }), env: {} } as PlatformDeps;
    expect(netstatOwner(missing, 6000, 80)).toBeUndefined();
    const failed = { ...deps({ execSync: () => ({ code: 1, stdout: "", stderr: "netstat failed" }) }), env: {} } as PlatformDeps;
    expect(netstatOwner(failed, 6000, 80)).toBeNull();
    expect(platformFor("win32", deps({ env: { USERNAME: "Ann", USERDOMAIN: "PC" } })).self()).toBe("pc\\ann");
  });
});

describe("command line of a process", () => {
  test("linux reads proc, and a missing process has none", () => {
    const root = join(dir, "proc");
    mkdirSync(join(root, "41"), { recursive: true });
    writeFileSync(join(root, "41", "cmdline"), "/usr/bin/chromium\0--app=http://x/\0--user-data-dir=/p\0");
    expect(procCommandLine(41, root)).toBe("/usr/bin/chromium --app=http://x/ --user-data-dir=/p");
    expect(procCommandLine(42, root)).toBeNull();
  });

  test("macOS asks ps and Windows asks for the process by id", () => {
    const calls: string[][] = [];
    const run = (out: string, code = 0) => (argv: string[]) => (calls.push(argv), { code, stdout: out, stderr: "" });
    expect(platformFor("darwin", deps({ execSync: run("open -W -na Chromium --args --user-data-dir=/p\n") })).commandLine(7)).toBe("open -W -na Chromium --args --user-data-dir=/p");
    expect(calls[0]).toEqual(["/bin/ps", "-ww", "-o", "command=", "-p", "7"]);
    expect(platformFor("darwin", deps({ execSync: run("", 1) })).commandLine(7)).toBeNull();
    expect(platformFor("win32", deps({ execSync: run('"C:\\e\\msedge.exe" --user-data-dir=C:\\p\r\n') })).commandLine(9)).toBe('"C:\\e\\msedge.exe" --user-data-dir=C:\\p');
    expect(calls[2].at(-1)).toBe('(Get-CimInstance Win32_Process -Filter "ProcessId=9").CommandLine');
  });
});
