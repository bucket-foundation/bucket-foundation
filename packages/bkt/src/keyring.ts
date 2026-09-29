import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { randomBytes } from "node:crypto";
import { deriveKey, open, seal } from "./crypto";

export interface Keyring {
  readonly kind: "libsecret" | "passphrase" | "memory";
  get(account: string): Promise<string | null>;
  set(account: string, secret: string): Promise<void>;
}

export const SERVICE = "bucket-bkt";

export class MemoryKeyring implements Keyring {
  readonly kind = "memory" as const;
  private store = new Map<string, string>();
  async get(account: string) {
    return this.store.get(account) ?? null;
  }
  async set(account: string, secret: string) {
    this.store.set(account, secret);
  }
}

export class SecretToolKeyring implements Keyring {
  readonly kind = "libsecret" as const;
  constructor(private bin = "secret-tool") {}

  static available(bin = "secret-tool"): boolean {
    return Bun.which(bin) !== null && !!process.env.DBUS_SESSION_BUS_ADDRESS;
  }

  async get(account: string) {
    const p = Bun.spawn([this.bin, "lookup", "service", SERVICE, "account", account], { stdout: "pipe", stderr: "pipe" });
    const [out, code] = await Promise.all([new Response(p.stdout).text(), p.exited]);
    if (code !== 0) return null;
    return out.length ? out : null;
  }

  async set(account: string, secret: string) {
    const p = Bun.spawn([this.bin, "store", "--label", `bkt ${account}`, "service", SERVICE, "account", account], {
      stdin: "pipe",
      stdout: "pipe",
      stderr: "pipe",
    });
    p.stdin.write(secret);
    p.stdin.end();
    const [err, code] = await Promise.all([new Response(p.stderr).text(), p.exited]);
    if (code !== 0) throw new Error(`secret-tool store failed: ${err.trim()}`);
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

  constructor(private file: string, passphrase: string) {
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
