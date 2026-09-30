import { chmodSync, closeSync, mkdirSync, openSync, readFileSync, rmSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { ensureDataKey, ensureDevice, type DeviceIdentity } from "./device";
import { PassphraseKeyring, SecretToolKeyring, type Keyring } from "./keyring";
import { Store } from "./store";

export function dataDir(env = process.env): string {
  return env.BKT_HOME ?? join(env.XDG_DATA_HOME ?? join(homedir(), ".local/share"), "bkt");
}

export function ensureDataDir(dir: string): string {
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  chmodSync(dir, 0o700);
  return dir;
}

export interface KeyringOptions {
  keyring?: string;
  passphraseFd?: number;
}

export function parseArgs(argv: string[]): { cmd: string; opts: KeyringOptions } {
  const opts: KeyringOptions = {};
  let cmd = "tui";
  for (let i = 0; i < argv.length; i++) {
    const [flag, inline] = argv[i].split("=", 2);
    const value = () => inline ?? argv[++i];
    if (flag === "--keyring") opts.keyring = value();
    else if (flag === "--passphrase-fd") {
      const fd = Number(value());
      if (!Number.isInteger(fd) || fd < 0) throw new Error("--passphrase-fd needs a file descriptor number");
      opts.passphraseFd = fd;
    } else if (flag.startsWith("--")) throw new Error(`unknown flag ${flag}`);
    else cmd = flag;
  }
  return { cmd, opts };
}

export function readPassphraseFd(fd: number): string {
  return readFileSync(fd, "utf8").replace(/\r?\n$/, "");
}

export async function promptPassphrase(label = "bkt passphrase: "): Promise<string> {
  if (!process.stdin.isTTY) throw new Error("passphrase keyring needs a terminal or --passphrase-fd");
  process.stderr.write(label);
  const stdin = process.stdin;
  stdin.setRawMode(true);
  stdin.resume();
  return new Promise((resolve, reject) => {
    let buf = "";
    const onData = (chunk: Buffer) => {
      for (const ch of chunk.toString("utf8")) {
        if (ch === "\r" || ch === "\n") return done(null);
        if (ch === "\u0003") return done(new Error("cancelled"));
        if (ch === "\u007f") buf = buf.slice(0, -1);
        else buf += ch;
      }
    };
    const done = (err: Error | null) => {
      stdin.off("data", onData);
      stdin.setRawMode(false);
      stdin.pause();
      process.stderr.write("\n");
      err ? reject(err) : resolve(buf);
    };
    stdin.on("data", onData);
  });
}

export async function pickKeyring(opts: KeyringOptions, dir: string, env = process.env): Promise<Keyring> {
  const kind = opts.keyring ?? env.BKT_KEYRING ?? "libsecret";
  if (kind === "libsecret") {
    if (!SecretToolKeyring.available(env)) throw new Error("libsecret is unavailable; rerun with --keyring passphrase to use a passphrase vault");
    return new SecretToolKeyring();
  }
  if (kind !== "passphrase") throw new Error(`unknown keyring ${kind}`);
  const pass = opts.passphraseFd !== undefined ? readPassphraseFd(opts.passphraseFd) : await promptPassphrase();
  return new PassphraseKeyring(join(dir, "keyring.json"), pass);
}

export async function withLock<T>(file: string, fn: () => Promise<T>, timeoutMs = 10_000, staleMs = 60_000): Promise<T> {
  const start = Date.now();
  let fd: number | null = null;
  while (fd === null) {
    try {
      fd = openSync(file, "wx", 0o600);
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== "EEXIST") throw e;
      try {
        if (Date.now() - statSync(file).mtimeMs > staleMs) rmSync(file, { force: true });
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
      }
      if (Date.now() - start > timeoutMs) throw new Error(`timed out waiting for ${file}`);
      await Bun.sleep(25);
    }
  }
  try {
    return await fn();
  } finally {
    closeSync(fd);
    rmSync(file, { force: true });
  }
}

export interface Session {
  store: Store;
  device: DeviceIdentity;
  keyring: Keyring;
  key: Buffer;
}

export async function openSession(keyring: Keyring, dir: string, now = Date.now()): Promise<Session> {
  ensureDataDir(dir);
  const { key, device } = await withLock(join(dir, "keys.lock"), async () => ({
    key: await ensureDataKey(keyring),
    device: await ensureDevice(keyring),
  }));
  const store = new Store(join(dir, "bkt.db"), key);
  store.recordDevice(device.id, device.publicKey, now);
  const recorded = store.device();
  if (recorded && recorded.id !== device.id) {
    store.close();
    throw new Error(`database belongs to device ${recorded.id}; this keyring holds ${device.id}`);
  }
  return { store, device, keyring, key };
}
