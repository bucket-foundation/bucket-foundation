import { chmodSync, existsSync, mkdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { parseSession, type StoredSession, type TokenVault } from "../../../../src/lib/academy/token-store";
import { SERVICE, SecretToolKeyring } from "../keyring";

export type { StoredSession, TokenVault } from "../../../../src/lib/academy/token-store";
export { MemoryVault, parseSession } from "../../../../src/lib/academy/token-store";

export const SESSION_ACCOUNT = "account-session";

export class VaultError extends Error {}

export class FileVault implements TokenVault {
  readonly kind = "file" as const;
  constructor(readonly file: string) {}

  async get() {
    if (!existsSync(this.file)) return null;
    const mode = statSync(this.file).mode & 0o777;
    if (mode & 0o077) throw new VaultError(`${this.file} is readable by other users (mode ${mode.toString(8)}); run chmod 600 on it or delete it and sign in again`);
    return parseSession(readFileSync(this.file, "utf8"));
  }

  async set(s: StoredSession) {
    mkdirSync(dirname(this.file), { recursive: true, mode: 0o700 });
    chmodSync(dirname(this.file), 0o700);
    const tmp = `${this.file}.tmp`;
    writeFileSync(tmp, JSON.stringify(s), { mode: 0o600 });
    chmodSync(tmp, 0o600);
    renameSync(tmp, this.file);
  }

  async clear() {
    rmSync(this.file, { force: true });
  }
}

export class SecretToolVault implements TokenVault {
  readonly kind = "libsecret" as const;
  constructor(
    private account = SESSION_ACCOUNT,
    private bin = "secret-tool",
  ) {}

  private async run(args: string[], stdin?: string): Promise<{ out: string; err: string; code: number }> {
    const p = Bun.spawn([this.bin, ...args], { stdin: stdin === undefined ? "ignore" : "pipe", stdout: "pipe", stderr: "pipe" });
    if (stdin !== undefined && p.stdin) {
      p.stdin.write(stdin);
      p.stdin.end();
    }
    const [out, err, code] = await Promise.all([new Response(p.stdout).text(), new Response(p.stderr).text(), p.exited]);
    return { out, err, code };
  }

  async get() {
    const r = await this.run(["lookup", "service", SERVICE, "account", this.account]);
    if (r.code === 0) return parseSession(r.out);
    if (r.code === 1 && !r.err.trim()) return null;
    throw new VaultError(`secret-tool lookup failed (exit ${r.code}): ${r.err.trim()}`);
  }

  async set(s: StoredSession) {
    const r = await this.run(["store", "--label", "bkt account session", "service", SERVICE, "account", this.account], JSON.stringify(s));
    if (r.code !== 0) throw new VaultError(`secret-tool store failed: ${r.err.trim()}`);
  }

  async clear() {
    const r = await this.run(["clear", "service", SERVICE, "account", this.account]);
    if (r.code !== 0 && r.code !== 1) throw new VaultError(`secret-tool clear failed: ${r.err.trim()}`);
  }
}

export function pickVault(sessionFile: string, env: Record<string, string | undefined> = process.env): TokenVault {
  if (env.BKT_SESSION_STORE === "file") return new FileVault(sessionFile);
  return SecretToolKeyring.available(env) ? new SecretToolVault() : new FileVault(sessionFile);
}
