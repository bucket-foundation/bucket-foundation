import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
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

export interface PlatformDeps {
  env: Env;
  home: string;
  exec: Exec;
  which: (bin: string) => string | null;
  exists: (path: string) => boolean;
}

export interface Platform {
  readonly os: Os;
  readonly nativeKeyring: string;
  keyring(): Keyring | null;
  windowCommand(url: string, profile: string): string[];
  dataDir(): string;
  cacheDir(): string;
  configDir(): string;
  python(): string;
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

const PS = ["powershell.exe", "-NoProfile", "-NonInteractive", "-Command"];
const PS_PROTECT =
  "Add-Type -AssemblyName System.Security; $i=[Console]::In.ReadToEnd().Trim(); " +
  "[Convert]::ToBase64String([Security.Cryptography.ProtectedData]::Protect([Convert]::FromBase64String($i),$null,'CurrentUser'))";
const PS_UNPROTECT =
  "Add-Type -AssemblyName System.Security; $i=[Console]::In.ReadToEnd().Trim(); " +
  "[Convert]::ToBase64String([Security.Cryptography.ProtectedData]::Unprotect([Convert]::FromBase64String($i),$null,'CurrentUser'))";

export class DpapiKeyring implements Keyring {
  readonly kind = "dpapi" as const;
  constructor(private dir: string, private run: Exec = exec) {}

  private file(account: string) {
    if (!/^[\w.@-]+$/.test(account)) throw new KeyringError(`invalid dpapi account ${account}`);
    return join(this.dir, `${SERVICE}.${account}.dpapi`);
  }

  async get(account: string) {
    const f = this.file(account);
    if (!existsSync(f)) return null;
    const r = await this.run([...PS, PS_UNPROTECT], readFileSync(f, "utf8"));
    if (r.code !== 0) throw new KeyringError(`dpapi unprotect failed (exit ${r.code}): ${r.stderr.trim()}`);
    return unb64(r.stdout);
  }

  async set(account: string, secret: string) {
    const f = this.file(account);
    if (existsSync(f)) refuseOverwrite(account);
    const r = await this.run([...PS, PS_PROTECT], b64(secret));
    if (r.code !== 0 || !r.stdout.trim()) throw new KeyringError(`dpapi protect failed (exit ${r.code}): ${r.stderr.trim()}`);
    mkdirSync(this.dir, { recursive: true, mode: 0o700 });
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
    dataDir: () => data,
    cacheDir: () => d.env.XDG_CACHE_HOME ?? posix.join(d.home, ".cache"),
    configDir: () => d.env.XDG_CONFIG_HOME ?? posix.join(d.home, ".config"),
    python: () => "python3",
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
    dataDir: () => d.env.XDG_DATA_HOME ?? posix.join(lib, "Application Support"),
    cacheDir: () => d.env.XDG_CACHE_HOME ?? posix.join(lib, "Caches"),
    configDir: () => d.env.XDG_CONFIG_HOME ?? posix.join(lib, "Application Support"),
    python: () => "python3",
  };
}

function windows(d: PlatformDeps): Platform {
  const roaming = d.env.APPDATA ?? win32.join(d.home, "AppData", "Roaming");
  const local = d.env.LOCALAPPDATA ?? win32.join(d.home, "AppData", "Local");
  const browsers = [
    ...[d.env["ProgramFiles(x86)"], d.env.ProgramFiles, local].flatMap((root) =>
      root ? [win32.join(root, "Microsoft", "Edge", "Application", "msedge.exe"), win32.join(root, "Google", "Chrome", "Application", "chrome.exe")] : [],
    ),
  ];
  return {
    os: "win32",
    nativeKeyring: "dpapi",
    keyring: () => (d.which("powershell.exe") || d.which("powershell") ? new DpapiKeyring(win32.join(local, "bkt", "keys"), d.exec) : null),
    windowCommand(url, profile) {
      const bin = browsers.find((b) => d.exists(b));
      if (bin) return [bin, ...CHROMIUM_FLAGS(url, profile)];
      return ["cmd.exe", "/d", "/c", "start", '""', url.replace(/[&|<>^]/g, "^$&")];
    },
    dataDir: () => roaming,
    cacheDir: () => local,
    configDir: () => roaming,
    python: () => (d.which("py") ? "py" : "python"),
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
  };
  return target === "darwin" ? darwin(d) : target === "win32" ? windows(d) : linux(d);
}
