import { createHash, randomBytes } from "node:crypto";
import { closeSync, fsyncSync, lstatSync, mkdirSync, openSync, readdirSync, readFileSync, renameSync, writeSync } from "node:fs";
import { dirname, join } from "node:path";

const MINT = Symbol("bkt.research.grant");

export const INTERNAL_KINDS = ["research-pages"] as const;
export const BUILD_KINDS = ["research-pdf", "research-figure", "research-tables"] as const;
export const FROZEN_SKIP = new Set([".bkt-job", "out"]);
export const CONSENT_TTL_MS = 120_000;
export const DENY_COOLDOWN_MS = 30_000;
export const DENY_WINDOW_MS = 600_000;
export const DENY_LIMIT = 3;
export const CONSENT_ID = /^[A-Za-z0-9_-]{22}$/;
export const DIGEST = /^[0-9a-f]{64}$/;

export class Grant {
  spent = false;

  constructor(
    key: symbol,
    readonly kind: string,
    readonly digest: string,
  ) {
    if (key !== MINT) throw new Error("a grant comes from the consent store alone");
    Object.freeze(this.kind);
  }
}

function walk(root: string, rel: string, out: string[]): void {
  for (const entry of readdirSync(join(root, rel), { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1))) {
    const path = rel ? `${rel}/${entry.name}` : entry.name;
    if (!rel && FROZEN_SKIP.has(entry.name)) continue;
    if (entry.isSymbolicLink()) throw new Error(`the frozen folder holds a symlink at ${path}`);
    if (entry.isDirectory()) walk(root, path, out);
    else if (entry.isFile()) out.push(path);
    else throw new Error(`the frozen folder holds a special file at ${path}`);
  }
}

export function frozenDigest(dir: string): string {
  if (lstatSync(dir).isSymbolicLink()) throw new Error("the frozen folder is a symlink");
  const files: string[] = [];
  walk(dir, "", files);
  const h = createHash("sha256");
  for (const path of files) h.update(path).update("\0").update(createHash("sha256").update(readFileSync(join(dir, path))).digest("hex")).update("\0");
  return h.digest("hex");
}

export class ConsentError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export interface ChangedFile {
  path: string;
  base: string | null;
  now: string;
  added: number;
  removed: number;
  lines: string[];
}

export interface PendingInput {
  slug: string;
  build: string;
  kind: string;
  digest: string;
  cls: "shipped" | "edited";
  files: ChangedFile[];
  frozenDir: string;
  title: string;
  body: string;
  full: string;
  params: Record<string, string>;
}

export interface Pending extends PendingInput {
  id: string;
  created: number;
}

export interface PendingView {
  id: string;
  slug: string;
  build: string;
  class: "shipped" | "edited";
  digest: string;
  title: string;
  body: string;
  expiresAt: number;
}

function plainFile(path: string): boolean {
  try {
    const stat = lstatSync(path);
    return stat.isFile() && !stat.isSymbolicLink();
  } catch {
    return false;
  }
}

function exists(path: string): boolean {
  try {
    lstatSync(path);
    return true;
  } catch {
    return false;
  }
}

export class BuildSwitch {
  private file: string;

  constructor(private dataDir: string) {
    this.file = join(dataDir, "research", "builds-off.json");
  }

  private read(): Record<string, { at: number; reason: string }> | null {
    if (!exists(this.file)) return {};
    if (!plainFile(this.file)) return null;
    try {
      const parsed = JSON.parse(readFileSync(this.file, "utf8")) as unknown;
      if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) return null;
      const out: Record<string, { at: number; reason: string }> = {};
      for (const [slug, v] of Object.entries(parsed as Record<string, { at?: unknown; reason?: unknown }>)) out[slug] = { at: typeof v?.at === "number" ? v.at : 0, reason: typeof v?.reason === "string" ? v.reason : "builds are off" };
      return out;
    } catch {
      return null;
    }
  }

  off(slug: string): string | null {
    const all = this.read();
    if (all === null) return "the build switch file cannot be read, so builds stay off";
    return Object.hasOwn(all, slug) ? all[slug].reason : null;
  }

  private write(all: Record<string, { at: number; reason: string }>): void {
    const dir = dirname(this.file);
    if (!exists(dir)) mkdirSync(dir, { recursive: true, mode: 0o700 });
    if (lstatSync(dir).isSymbolicLink()) throw new ConsentError("the research folder is a symlink", 403);
    if (exists(this.file) && !plainFile(this.file)) throw new ConsentError("the build switch file is a symlink or a folder", 403);
    const tmp = `${this.file}.tmp-${process.pid}-${randomBytes(4).toString("hex")}`;
    const fd = openSync(tmp, "wx", 0o600);
    try {
      writeSync(fd, JSON.stringify(all));
      fsyncSync(fd);
    } finally {
      closeSync(fd);
    }
    renameSync(tmp, this.file);
  }

  turnOff(slug: string, reason: string, at: number): void {
    this.write({ ...(this.read() ?? {}), [slug]: { at, reason } });
  }

  turnOn(slug: string): void {
    const all = this.read() ?? {};
    delete all[slug];
    this.write(all);
  }
}

export interface ConsentOptions {
  now?: () => number;
  onDrop?: (pending: Pending, why: "denied" | "expired" | "replaced") => void;
  switch?: BuildSwitch;
}

export class ConsentStore {
  private held: Pending | null = null;
  private denials = new Map<string, number[]>();

  constructor(private o: ConsentOptions = {}) {}

  private now(): number {
    return (this.o.now ?? Date.now)();
  }

  internal(kind: string, digest: string): Grant {
    if (!(INTERNAL_KINDS as readonly string[]).includes(kind)) throw new Error(`${kind} needs an approval and takes no internal grant`);
    if (!DIGEST.test(digest)) throw new Error("a grant needs the digest of the frozen folder");
    return new Grant(MINT, kind, digest);
  }

  private denied(slug: string): void {
    const at = this.now();
    const recent = [...(this.denials.get(slug) ?? []).filter((t) => at - t < DENY_WINDOW_MS), at];
    this.denials.set(slug, recent);
    if (recent.length >= DENY_LIMIT) this.o.switch?.turnOff(slug, "three build requests were denied in ten minutes", at);
  }

  cooldown(slug: string): number {
    const last = (this.denials.get(slug) ?? []).at(-1);
    return last === undefined ? 0 : Math.max(0, DENY_COOLDOWN_MS - (this.now() - last));
  }

  pending(): Pending | null {
    const p = this.held;
    if (p && this.now() - p.created >= CONSENT_TTL_MS) {
      this.held = null;
      this.denied(p.slug);
      this.o.onDrop?.(p, "expired");
      return null;
    }
    return p;
  }

  view(): PendingView | null {
    const p = this.pending();
    return p ? { id: p.id, slug: p.slug, build: p.build, class: p.cls, digest: p.digest, title: p.title, body: p.body, expiresAt: p.created + CONSENT_TTL_MS } : null;
  }

  open(input: PendingInput): Pending {
    if (this.pending()) throw new ConsentError("another build is waiting for approval", 409);
    if (!(BUILD_KINDS as readonly string[]).includes(input.kind)) throw new ConsentError("that kind of job takes no approval", 400);
    if (!DIGEST.test(input.digest)) throw new ConsentError("the request has no digest", 400);
    const p: Pending = { ...input, id: randomBytes(16).toString("base64url"), created: this.now() };
    this.held = p;
    return p;
  }

  private match(id: unknown, digest: unknown): Pending {
    const p = this.pending();
    if (typeof id !== "string" || typeof digest !== "string" || !CONSENT_ID.test(id) || !DIGEST.test(digest) || !p || p.id !== id || p.digest !== digest) throw new ConsentError("no build request matches that answer", 403);
    return p;
  }

  consume(id: unknown, digest: unknown): { grant: Grant; pending: Pending } {
    const p = this.match(id, digest);
    this.held = null;
    return { grant: new Grant(MINT, p.kind, p.digest), pending: p };
  }

  deny(id: unknown, digest: unknown): Pending {
    const p = this.match(id, digest);
    this.held = null;
    this.denied(p.slug);
    this.o.onDrop?.(p, "denied");
    return p;
  }
}
