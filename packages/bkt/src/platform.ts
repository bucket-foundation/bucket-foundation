import { chmodSync, existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, posix, win32 } from "node:path";
import { KeyringError, refuseOverwrite, SecretToolKeyring, SERVICE, type Keyring } from "./keyring";

export type Os = "linux" | "darwin" | "win32";
export type Env = Record<string, string | undefined>;

export interface ExecResult {
  code: number;
  stdout: string;
  stderr: string;
}

export type Exec = (argv: string[], stdin?: string) => Promise<ExecResult>;

export const exec: Exec = async (argv, stdin) => {
  const p = Bun.spawn(argv, { stdin: stdin === undefined ? "ignore" : "pipe", stdout: "pipe", stderr: "pipe" });
  if (stdin !== undefined && p.stdin) {
    p.stdin.write(stdin);
    p.stdin.end();
  }
  const [stdout, stderr, code] = await Promise.all([new Response(p.stdout).text(), new Response(p.stderr).text(), p.exited]);
  return { code, stdout, stderr };
};

export type ExecSync = (argv: string[]) => ExecResult;

export const execSync: ExecSync = (argv) => {
  try {
    const r = Bun.spawnSync(argv, { stdin: "ignore", stdout: "pipe", stderr: "pipe" });
    return { code: r.exitCode ?? 1, stdout: r.stdout.toString(), stderr: r.stderr.toString() };
  } catch (e) {
    return { code: 127, stdout: "", stderr: (e as Error).message };
  }
};

export type Owner = number | string;

export interface PlatformDeps {
  env: Env;
  home: string;
  exec: Exec;
  execSync: ExecSync;
  uid: () => number;
  which: (bin: string) => string | null;
  exists: (path: string) => boolean;
}

export interface Platform {
  readonly os: Os;
  readonly nativeKeyring: string;
  keyring(): Keyring | null;
  windowCommand(url: string, profile: string): string[];
  secureDir(path: string): string;
  self(): Owner;
  readonly peerTools: string[];
  peerOwner(peerPort: number, serverPort: number): Owner | null | undefined;
  dataDir(): string;
  cacheDir(): string;
  configDir(): string;
  python(): string;
  notifyCommand(title: string, body: string, action: { name: string; label: string }): string[] | null;
  timerDir(): string | null;
}

export const CHROMIUM_FLAGS = (url: string, profile: string) => [
  `--app=${url}`,
  `--user-data-dir=${profile}`,
  "--disable-extensions",
  "--no-first-run",
  "--no-default-browser-check",
  "--window-size=1280,860",
];

const LINUX_BROWSERS = ["chromium-browser", "chromium", "google-chrome", "google-chrome-stable", "brave-browser"];
const MAC_BROWSERS = ["Google Chrome", "Chromium", "Brave Browser", "Microsoft Edge"];

const b64 = (s: string) => Buffer.from(s, "utf8").toString("base64");
const unb64 = (s: string) => Buffer.from(s.trim(), "base64").toString("utf8");

export class KeychainKeyring implements Keyring {
  readonly kind = "keychain" as const;
  constructor(private run: Exec = exec, private bin = "security") {}

  async get(account: string) {
    const r = await this.run([this.bin, "find-generic-password", "-s", SERVICE, "-a", account, "-w"]);
    if (r.code === 0) return unb64(r.stdout);
    if (r.code === 44) return null;
    throw new KeyringError(`security find-generic-password failed (exit ${r.code}): ${r.stderr.trim() || "empty output"}`);
  }

  async set(account: string, secret: string) {
    if (!/^[\w.@-]+$/.test(account)) throw new KeyringError(`invalid keychain account ${account}`);
    if ((await this.get(account)) !== null) refuseOverwrite(account);
    const line = `add-generic-password -s ${SERVICE} -a ${account} -l "bkt ${account}" -w ${b64(secret)}\n`;
    const r = await this.run([this.bin, "-i"], line);
    if (r.code !== 0 || /error/i.test(r.stderr)) throw new KeyringError(`security add-generic-password failed: ${r.stderr.trim()}`);
  }
}

const PS_FLAGS = ["-NoProfile", "-NonInteractive", "-Command"];
const PS_PROTECT =
  "Add-Type -AssemblyName System.Security; $i=[Console]::In.ReadToEnd().Trim(); " +
  "[Convert]::ToBase64String([Security.Cryptography.ProtectedData]::Protect([Convert]::FromBase64String($i),$null,'CurrentUser'))";
const PS_UNPROTECT =
  "Add-Type -AssemblyName System.Security; $i=[Console]::In.ReadToEnd().Trim(); " +
  "[Convert]::ToBase64String([Security.Cryptography.ProtectedData]::Unprotect([Convert]::FromBase64String($i),$null,'CurrentUser'))";

export class DpapiKeyring implements Keyring {
  readonly kind = "dpapi" as const;
  constructor(
    private dir: string,
    private run: Exec = exec,
    private secure: (path: string) => string = (p) => (mkdirSync(p, { recursive: true, mode: 0o700 }), p),
    private bin: string = windowsPowershell(process.env),
  ) {}

  private file(account: string) {
    if (!/^[\w.@-]+$/.test(account)) throw new KeyringError(`invalid dpapi account ${account}`);
    return join(this.dir, `${SERVICE}.${account}.dpapi`);
  }

  async get(account: string) {
    const f = this.file(account);
    if (!existsSync(f)) return null;
    const r = await this.run([this.bin, ...PS_FLAGS, PS_UNPROTECT], readFileSync(f, "utf8"));
    if (r.code !== 0) throw new KeyringError(`dpapi unprotect failed (exit ${r.code}): ${r.stderr.trim()}`);
    return unb64(r.stdout);
  }

  async set(account: string, secret: string) {
    const f = this.file(account);
    if (existsSync(f)) refuseOverwrite(account);
    const r = await this.run([this.bin, ...PS_FLAGS, PS_PROTECT], b64(secret));
    if (r.code !== 0 || !r.stdout.trim()) throw new KeyringError(`dpapi protect failed (exit ${r.code}): ${r.stderr.trim()}`);
    this.secure(this.dir);
    const tmp = `${f}.tmp`;
    writeFileSync(tmp, r.stdout.trim(), { mode: 0o600 });
    try {
      renameSync(tmp, f);
    } catch (e) {
      rmSync(tmp, { force: true });
      throw e;
    }
  }
}

function unixSecure(path: string): string {
  mkdirSync(path, { recursive: true, mode: 0o700 });
  chmodSync(path, 0o700);
  return path;
}

export const LSOF = "/usr/sbin/lsof";

const hexPort = (s: string) => parseInt(s.split(":").pop() ?? "", 16);

export function procNetTcpOwner(peerPort: number, serverPort: number, files = ["/proc/net/tcp", "/proc/net/tcp6"]): number | null {
  for (const f of files) {
    let text: string;
    try {
      text = readFileSync(f, "utf8");
    } catch {
      continue;
    }
    for (const line of text.split("\n").slice(1)) {
      const cols = line.trim().split(/\s+/);
      if (cols.length < 8) continue;
      if (hexPort(cols[1]) === peerPort && hexPort(cols[2]) === serverPort) {
        const uid = Number(cols[7]);
        return Number.isInteger(uid) ? uid : null;
      }
    }
  }
  return null;
}

export function lsofOwner(run: ExecSync, peerPort: number, serverPort: number): number | null | undefined {
  const r = run([LSOF, "-w", "-nP", `-iTCP@127.0.0.1:${peerPort}`, "-sTCP:ESTABLISHED", "-Fun"]);
  if (r.code === 127) return undefined;
  if (r.code !== 0) return null;
  let uid: number | null = null;
  for (const line of r.stdout.split("\n")) {
    if (line.startsWith("p")) uid = null;
    else if (line.startsWith("u")) uid = Number(line.slice(1));
    else if (line === `n127.0.0.1:${peerPort}->127.0.0.1:${serverPort}`) return Number.isInteger(uid) ? uid : null;
  }
  return null;
}

const secured = new Set<string>();

function windowsUser(d: PlatformDeps): string {
  const user = d.env.USERNAME;
  if (!user) throw new Error("USERNAME is unset; cannot scope files to the current user");
  return (d.env.USERDOMAIN ? `${d.env.USERDOMAIN}\\${user}` : user).toLowerCase();
}

let sid: string | null = null;

export function system32(env: Env, ...parts: string[]): string {
  return win32.join(env.SystemRoot || env.SYSTEMROOT || env.windir || "C:\\Windows", "System32", ...parts);
}

export const windowsWhoami = (env: Env) => system32(env, "whoami.exe");
export const windowsPowershell = (env: Env) => system32(env, "WindowsPowerShell", "v1.0", "powershell.exe");

export function windowsSid(d: PlatformDeps): string {
  if (sid) return sid;
  const r = d.execSync([windowsWhoami(d.env), "/user", "/fo", "csv", "/nh"]);
  const found = r.stdout.match(/"(S-1-[0-9-]+)"/)?.[1];
  if (r.code !== 0 || !found) throw new Error(`whoami could not name the current user: ${(r.stderr || r.stdout).trim()}`);
  sid = found;
  return found;
}

function windowsSecure(d: PlatformDeps, path: string): string {
  mkdirSync(path, { recursive: true });
  if (secured.has(path)) return path;
  const r = d.execSync([system32(d.env, "icacls.exe"), path, "/inheritance:r", "/grant:r", `*${windowsSid(d)}:(OI)(CI)F`, "/q"]);
  if (r.code !== 0) throw new Error(`icacls could not restrict ${path} to the current user: ${(r.stderr || r.stdout).trim()}`);
  secured.add(path);
  return path;
}

export function netstatOwner(d: PlatformDeps, peerPort: number, serverPort: number): Owner | null | undefined {
  const ns = d.execSync([system32(d.env, "netstat.exe"), "-ano", "-p", "TCP"]);
  if (ns.code === 127) return undefined;
  if (ns.code !== 0) return null;
  const row = ns.stdout
    .split(/\r?\n/)
    .map((l) => l.trim().split(/\s+/))
    .find((c) => c[0] === "TCP" && c[1] === `127.0.0.1:${peerPort}` && c[2] === `127.0.0.1:${serverPort}` && c[3] === "ESTABLISHED");
  const pid = row ? Number(row[4]) : NaN;
  if (!Number.isInteger(pid) || pid <= 0) return null;
  const tl = d.execSync([system32(d.env, "tasklist.exe"), "/fi", `PID eq ${pid}`, "/v", "/fo", "csv", "/nh"]);
  const cols = tl.stdout.trim().match(/"([^"]*)"/g)?.map((c) => c.slice(1, -1)) ?? [];
  const user = cols[1] === String(pid) ? cols[6]?.toLowerCase() : undefined;
  if (tl.code === 127) return undefined;
  if (tl.code !== 0) return null;
  return user && user !== "n/a" ? user : null;
}

function linux(d: PlatformDeps): Platform {
  const data = d.env.XDG_DATA_HOME ?? posix.join(d.home, ".local/share");
  return {
    os: "linux",
    nativeKeyring: "libsecret",
    keyring: () => (SecretToolKeyring.available(d.env) ? new SecretToolKeyring() : null),
    windowCommand(url, profile) {
      for (const b of LINUX_BROWSERS) {
        const bin = d.which(b);
        if (bin) return [bin, ...CHROMIUM_FLAGS(url, profile)];
      }
      return ["xdg-open", url];
    },
    secureDir: (path) => unixSecure(path),
    self: () => d.uid(),
    peerTools: ["/proc/net/tcp"],
    peerOwner: (peer, server) => procNetTcpOwner(peer, server),
    dataDir: () => data,
    cacheDir: () => d.env.XDG_CACHE_HOME ?? posix.join(d.home, ".cache"),
    configDir: () => d.env.XDG_CONFIG_HOME ?? posix.join(d.home, ".config"),
    python: () => "python3",
    notifyCommand: (title, body, action) => ["notify-send", "--app-name=Bucket", `--action=${action.name}=${action.label}`, "--", title, body],
    timerDir: () => posix.join(d.env.XDG_CONFIG_HOME ?? posix.join(d.home, ".config"), "systemd", "user"),
  };
}

function darwin(d: PlatformDeps): Platform {
  const lib = posix.join(d.home, "Library");
  return {
    os: "darwin",
    nativeKeyring: "keychain",
    keyring: () => (d.which("security") ? new KeychainKeyring(d.exec) : null),
    windowCommand(url, profile) {
      for (const name of MAC_BROWSERS) {
        for (const root of ["/Applications", posix.join(d.home, "Applications")]) {
          if (d.exists(posix.join(root, `${name}.app`))) return ["open", "-na", name, "--args", ...CHROMIUM_FLAGS(url, profile)];
        }
      }
      return ["open", url];
    },
    secureDir: (path) => unixSecure(path),
    self: () => d.uid(),
    peerTools: [LSOF],
    peerOwner: (peer, server) => lsofOwner(d.execSync, peer, server),
    dataDir: () => d.env.XDG_DATA_HOME ?? posix.join(lib, "Application Support"),
    cacheDir: () => d.env.XDG_CACHE_HOME ?? posix.join(lib, "Caches"),
    configDir: () => d.env.XDG_CONFIG_HOME ?? posix.join(lib, "Application Support"),
    python: () => "python3",
    notifyCommand: () => null,
    timerDir: () => null,
  };
}

function windows(d: PlatformDeps): Platform {
  const roaming = d.env.APPDATA ?? win32.join(d.home, "AppData", "Roaming");
  const local = d.env.LOCALAPPDATA ?? win32.join(d.home, "AppData", "Local");
  const powershell = windowsPowershell(d.env);
  const browsers = [
    ...[d.env["ProgramFiles(x86)"], d.env.ProgramFiles, local].flatMap((root) =>
      root ? [win32.join(root, "Microsoft", "Edge", "Application", "msedge.exe"), win32.join(root, "Google", "Chrome", "Application", "chrome.exe")] : [],
    ),
  ];
  return {
    os: "win32",
    nativeKeyring: "dpapi",
    keyring: () => (d.exists(powershell) ? new DpapiKeyring(win32.join(local, "bkt", "keys"), d.exec, (p) => windowsSecure(d, p), powershell) : null),
    windowCommand(url, profile) {
      const bin = browsers.find((b) => d.exists(b));
      if (bin) return [bin, ...CHROMIUM_FLAGS(url, profile)];
      return ["cmd.exe", "/d", "/c", "start", '""', url.replace(/[&|<>^]/g, "^$&")];
    },
    secureDir: (path) => windowsSecure(d, path),
    self: () => windowsUser(d),
    peerTools: [system32(d.env, "netstat.exe"), system32(d.env, "tasklist.exe")],
    peerOwner: (peer, server) => netstatOwner(d, peer, server),
    dataDir: () => roaming,
    cacheDir: () => local,
    configDir: () => roaming,
    python: () => (d.which("py") ? "py" : "python"),
    notifyCommand: () => null,
    timerDir: () => null,
  };
}

function whichIn(env: Env, os: Os) {
  return (bin: string) => Bun.which(bin, { PATH: env.PATH ?? env.Path ?? "" }) ?? (os === "win32" ? Bun.which(`${bin}.exe`, { PATH: env.PATH ?? env.Path ?? "" }) : null);
}

export function platformFor(os: string = process.platform, deps: Partial<PlatformDeps> = {}): Platform {
  const target: Os = os === "darwin" || os === "win32" ? os : "linux";
  const env = deps.env ?? process.env;
  const d: PlatformDeps = {
    env,
    home: deps.home ?? homedir(),
    exec: deps.exec ?? exec,
    which: deps.which ?? whichIn(env, target),
    exists: deps.exists ?? existsSync,
    execSync: deps.execSync ?? execSync,
    uid: deps.uid ?? (() => process.getuid?.() ?? -1),
  };
  return target === "darwin" ? darwin(d) : target === "win32" ? windows(d) : linux(d);
}
