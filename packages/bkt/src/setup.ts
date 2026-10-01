import { closeSync, existsSync, openSync, readFileSync, rmSync, statSync } from "node:fs";
import { Database } from "bun:sqlite";
import { join } from "node:path";
import { ensureDataKey, ensureDevice, type DeviceIdentity } from "./device";
import { CancelledError } from "./cli/run";
import { KeyringLockedError, PassphraseKeyring, type Keyring } from "./keyring";
import { platformFor, type Platform } from "./platform";
import { Store } from "./store";

export function dataDir(env = process.env): string {
  return env.BKT_HOME ?? join(platformFor(process.platform, { env }).dataDir(), "bkt");
}

export function ensureDataDir(dir: string, platform: Platform = platformFor()): string {
  return platform.secureDir(dir);
}

export interface KeyringOptions {
  keyring?: string;
  passphraseFd?: number;
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
        if (ch === "\u0003") return done(new CancelledError());
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

export function existingDb(dir: string): string | undefined {
  const db = join(dir, "bkt.db");
  if (!existsSync(db) || statSync(db).size === 0) return undefined;
  return blankDatabase(db) ? undefined : db;
}

function blankDatabase(path: string): boolean {
  let db: Database;
  try {
    db = new Database(path, { readonly: true });
  } catch {
    return false;
  }
  try {
    const version = db.query<{ user_version: number }, []>("pragma user_version").get()!.user_version;
    const objects = db.query<{ n: number }, []>("select count(*) n from sqlite_master").get()!.n;
    return version === 0 && objects === 0;
  } catch {
    return false;
  } finally {
    db.close();
  }
}

export async function pickKeyring(
  opts: KeyringOptions,
  dir: string,
  env = process.env,
  platform: Platform = platformFor(process.platform, { env }),
): Promise<Keyring> {
  const native = platform.nativeKeyring;
  const kind = opts.keyring ?? env.BKT_KEYRING ?? native;
  if (kind === native || kind === "native") {
    const kr = platform.keyring();
    if (!kr) throw new Error(`${native} is unavailable; rerun with --keyring passphrase to use a passphrase vault`);
    return kr;
  }
  if (kind !== "passphrase") throw new Error(`unknown keyring ${kind} on ${platform.os}; use ${native} or passphrase`);
  const vault = join(dir, "keyring.json");
  const db = existingDb(dir);
  if (db && !existsSync(vault)) throw new KeyringLockedError("passphrase", db, `${vault} is missing`);
  const pass = opts.passphraseFd !== undefined ? readPassphraseFd(opts.passphraseFd) : await promptPassphrase();
  return new PassphraseKeyring(vault, pass, db);
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
  const { key, device } = await withLock(join(dir, "keys.lock"), async () => {
    const db = existingDb(dir);
    return { key: await ensureDataKey(keyring, db), device: await ensureDevice(keyring, db) };
  });
  const store = new Store(join(dir, "bkt.db"), key);
  store.recordDevice(device.id, device.publicKey, now);
  const recorded = store.device();
  if (recorded && recorded.id !== device.id) {
    store.close();
    throw new Error(`database belongs to device ${recorded.id}; this keyring holds ${device.id}`);
  }
  return { store, device, keyring, key };
}
