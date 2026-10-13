import { closeSync, existsSync, openSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import { Database } from "bun:sqlite";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
import { ensureDataKey, ensureDevice, LEGACY_ACCOUNTS, scopedAccounts, type DeviceIdentity, type KeyAccounts } from "./device";
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

const SCOPE_FILE = "keyring-scope";

export function keyScope(dir: string): string | undefined {
  const file = join(dir, SCOPE_FILE);
  if (!existsSync(file)) return undefined;
  const scope = readFileSync(file, "utf8").trim();
  if (!/^[0-9a-f]{32}$/.test(scope)) throw new Error(`${file} is damaged; restore it from a backup, since it names this folder's keyring entries`);
  return scope;
}

export function keyAccounts(dir: string): KeyAccounts {
  const db = existingDb(dir);
  const scope = (db && recordedScope(db)) || keyScope(dir);
  return scope ? scopedAccounts(scope) : LEGACY_ACCOUNTS;
}

const SCOPE_META = "keyring_scope";

function recordedScope(db: string): string | undefined {
  let handle: Database;
  try {
    handle = new Database(db, { readonly: true });
  } catch {
    return undefined;
  }
  try {
    const v = handle.query<{ v: string }, [string]>("select v from meta where k = ?").get(SCOPE_META)?.v;
    return v && /^[0-9a-f]{32}$/.test(v) ? v : undefined;
  } catch {
    return undefined;
  } finally {
    handle.close();
  }
}

function writeScope(dir: string, scope: string): void {
  const file = join(dir, SCOPE_FILE);
  if (existsSync(file) && readFileSync(file, "utf8").trim() === scope) return;
  writeFileSync(`${file}.tmp`, `${scope}\n`, { mode: 0o600 });
  renameSync(`${file}.tmp`, file);
}

interface SessionKeys {
  key: Buffer;
  device: DeviceIdentity;
  scope?: string;
}

async function sessionKeys(keyring: Keyring, dir: string): Promise<SessionKeys> {
  const db = existingDb(dir);
  const scope = (db && recordedScope(db)) || keyScope(dir);
  if (db || scope) {
    const held = scope ? scopedAccounts(scope) : LEGACY_ACCOUNTS;
    const present = db ? true : (await keyring.get(held.data)) !== null && (await keyring.get(held.device)) !== null;
    if (present) {
      try {
        const keys = { key: await ensureDataKey(keyring, db, held.data), device: await ensureDevice(keyring, db, held.device), scope };
        if (scope) writeScope(dir, scope);
        return keys;
      } catch (e) {
        if (!(e instanceof KeyringLockedError) || !db || scope) throw e;
        throw new KeyringLockedError(
          keyring.kind,
          db,
          `${e.detail}; this folder has no ${SCOPE_FILE} file and the database records no scope, so bkt looked for the 0.4.0 entries ${held.data} and ${held.device}`,
        );
      }
    }
  }
  const fresh = randomBytes(16).toString("hex");
  const accounts = scopedAccounts(fresh);
  const minted = { key: await ensureDataKey(keyring, undefined, accounts.data), device: await ensureDevice(keyring, undefined, accounts.device), scope: fresh };
  writeScope(dir, fresh);
  return minted;
}

export interface Session {
  store: Store;
  device: DeviceIdentity;
  keyring: Keyring;
  key: Buffer;
}

export async function openSession(keyring: Keyring, dir: string, now = Date.now()): Promise<Session> {
  ensureDataDir(dir);
  const { key, device, scope } = await withLock(join(dir, "keys.lock"), () => sessionKeys(keyring, dir));
  const store = new Store(join(dir, "bkt.db"), key);
  if (scope && store.meta(SCOPE_META) !== scope) store.setMeta(SCOPE_META, scope);
  store.recordDevice(device.id, device.publicKey, now);
  const recorded = store.device();
  if (recorded && recorded.id !== device.id) {
    store.close();
    throw new Error(`database belongs to device ${recorded.id}; this keyring holds ${device.id}`);
  }
  return { store, device, keyring, key };
}
