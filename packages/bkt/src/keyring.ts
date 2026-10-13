import { chmodSync, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { randomBytes } from "node:crypto";
import { deriveKey, open, seal } from "./crypto";

export interface Keyring {
  readonly kind: "libsecret" | "keychain" | "dpapi" | "passphrase" | "memory";
  get(account: string): Promise<string | null>;
  set(account: string, secret: string): Promise<void>;
}

export const SERVICE = "bucket-bkt";

export class KeyringError extends Error {}

export const REMEDY: Record<Keyring["kind"], string> = {
  libsecret: "Unlock the login keyring by signing in to the desktop session, then run bkt again.",
  keychain: "Unlock the login keychain with security unlock-keychain, then run bkt again.",
  dpapi: "Sign in as the Windows user who made the database, then run bkt again.",
  passphrase: "Put keyring.json back beside the database, then run bkt again.",
  memory: "Run bkt again with the keyring that made the database.",
};

export class KeyringLockedError extends KeyringError {
  constructor(
    kind: Keyring["kind"],
    db: string,
    readonly detail: string,
  ) {
    super(
      `keyring locked or key missing: ${db} exists and the ${kind} keyring gave no key for it (${detail}). ${REMEDY[kind]} ` +
        `If another keyring made this database, name it with --keyring. To start fresh, move ${db} aside and run bkt init. bkt made no new key and left the database untouched.`,
    );
  }
}

export class KeyringHeldError extends KeyringError {}

export function refuseOverwrite(account: string): never {
  throw new KeyringError(`keyring already holds ${account}; refusing to overwrite`);
}

export class MemoryKeyring implements Keyring {
  readonly kind = "memory" as const;
  private store = new Map<string, string>();
  async get(account: string) {
    return this.store.get(account) ?? null;
  }
  async set(account: string, secret: string) {
    if (this.store.has(account)) refuseOverwrite(account);
    this.store.set(account, secret);
  }
}

export class SecretToolKeyring implements Keyring {
  readonly kind = "libsecret" as const;
  constructor(private bin = "secret-tool") {}

  static available(env: Record<string, string | undefined> = process.env, bin = "secret-tool"): boolean {
    return Bun.which(bin, { PATH: env.PATH ?? "" }) !== null && !!env.DBUS_SESSION_BUS_ADDRESS;
  }

  async get(account: string) {
    const p = Bun.spawn([this.bin, "lookup", "service", SERVICE, "account", account], { stdout: "pipe", stderr: "pipe" });
    const [out, err, code] = await Promise.all([new Response(p.stdout).text(), new Response(p.stderr).text(), p.exited]);
    if (code === 0 && out.length) return out;
    if (code !== 1 || err.trim()) throw new KeyringError(`secret-tool lookup failed (exit ${code}): ${err.trim() || "empty output"}`);
    if (await this.listed(account)) throw new KeyringHeldError(`keyring locked: the keyring holds ${account} and would not release it. ${REMEDY.libsecret} bkt stored no new key.`);
    return null;
  }

  private async listed(account: string): Promise<boolean> {
    const p = Bun.spawn([this.bin, "search", "--all", "service", SERVICE, "account", account], { stdout: "pipe", stderr: "pipe" });
    const [out, err, code] = await Promise.all([new Response(p.stdout).text(), new Response(p.stderr).text(), p.exited]);
    const text = `${out}\n${err}`;
    if (/^\[\/.*\]\s*$/m.test(text) || /^attribute\./m.test(text)) return true;
    if ((code === 0 || code === 1) && !text.trim()) return false;
    throw new KeyringError(`secret-tool search failed (exit ${code}): ${err.trim() || out.trim() || "empty output"}`);
  }

  async set(account: string, secret: string) {
    if ((await this.get(account)) !== null) refuseOverwrite(account);
    const p = Bun.spawn([this.bin, "store", "--label", `bkt ${account}`, "service", SERVICE, "account", account], {
      stdin: "pipe",
      stdout: "pipe",
      stderr: "pipe",
    });
    p.stdin.write(secret);
    p.stdin.end();
    const [err, code] = await Promise.all([new Response(p.stderr).text(), p.exited]);
    if (code !== 0) throw new KeyringError(`secret-tool store failed: ${err.trim()}`);
  }
}

interface VaultFile {
  v: 1;
  salt: string;
  check: string;
  entries: Record<string, string>;
}

export class PassphraseKeyring implements Keyring {
  readonly kind = "passphrase" as const;
  private key: Buffer;
  private vault: VaultFile;

  constructor(private file: string, passphrase: string, existingDb?: string) {
    if (existingDb && !existsSync(file)) throw new KeyringLockedError("passphrase", existingDb, `${file} is missing`);
    mkdirSync(dirname(file), { recursive: true, mode: 0o700 });
    chmodSync(dirname(file), 0o700);
    if (existsSync(file)) {
      this.vault = JSON.parse(readFileSync(file, "utf8")) as VaultFile;
      this.key = deriveKey(passphrase, Buffer.from(this.vault.salt, "base64"));
      try {
        open(this.key, this.vault.check, "check");
      } catch {
        throw new Error("wrong passphrase");
      }
    } else {
      const salt = randomBytes(16);
      this.key = deriveKey(passphrase, salt);
      this.vault = { v: 1, salt: salt.toString("base64"), check: seal(this.key, "bkt", "check"), entries: {} };
      this.flush();
    }
  }

  async get(account: string) {
    const sealed = this.vault.entries[account];
    return sealed ? open(this.key, sealed, account) : null;
  }

  async set(account: string, secret: string) {
    if (this.vault.entries[account]) refuseOverwrite(account);
    this.vault.entries[account] = seal(this.key, secret, account);
    this.flush();
  }

  private flush() {
    mkdirSync(dirname(this.file), { recursive: true, mode: 0o700 });
    const tmp = `${this.file}.tmp`;
    writeFileSync(tmp, JSON.stringify(this.vault), { mode: 0o600 });
    renameSync(tmp, this.file);
  }
}
