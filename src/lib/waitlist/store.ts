import { createHash, timingSafeEqual } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { get, list, put } from "@vercel/blob";
import { mergeEntry, parseEntry, sortEntries, type SignupInput, type WaitlistEntry } from "./core";

type Env = Record<string, string | undefined>;

export interface WaitlistStore {
  kind: "blob" | "file";
  prefix: string;
  read(key: string): Promise<WaitlistEntry | null>;
  write(key: string, entry: WaitlistEntry): Promise<void>;
  keys(): Promise<string[]>;
}

export function emailKey(email: string): string {
  return createHash("sha256").update(email).digest("hex");
}

export function waitlistPrefix(env: Env = process.env): string {
  const target = env.VERCEL_ENV?.trim();
  return target === "production" ? "waitlist/" : `waitlist-${target || "local"}/`;
}

function parseJson(text: string): WaitlistEntry | null {
  try {
    return parseEntry(JSON.parse(text));
  } catch {
    return null;
  }
}

function keyFromName(name: string, prefix: string): string | null {
  const m = name.slice(prefix.length).match(/^([0-9a-f]{64})\.json$/);
  return name.startsWith(prefix) && m ? m[1] : null;
}

export function blobStore(prefix: string): WaitlistStore {
  return {
    kind: "blob",
    prefix,
    async read(key) {
      const res = await get(`${prefix}${key}.json`, { access: "private", useCache: false }).catch((err: unknown) => {
        if (err instanceof Error && err.name === "BlobNotFoundError") return null;
        throw err;
      });
      if (!res || res.statusCode !== 200) return null;
      return parseJson(await new Response(res.stream).text());
    },
    async write(key, entry) {
      await put(`${prefix}${key}.json`, JSON.stringify(entry), {
        access: "private",
        addRandomSuffix: false,
        allowOverwrite: true,
        contentType: "application/json",
      });
    },
    async keys() {
      const out: string[] = [];
      let cursor: string | undefined;
      do {
        const page = await list({ prefix, cursor, limit: 1000 });
        for (const b of page.blobs) {
          const k = keyFromName(b.pathname, prefix);
          if (k) out.push(k);
        }
        cursor = page.hasMore ? page.cursor : undefined;
      } while (cursor);
      return out;
    },
  };
}

export function fileStore(root: string, prefix: string): WaitlistStore {
  const dir = path.join(root, prefix);
  return {
    kind: "file",
    prefix,
    async read(key) {
      try {
        return parseJson(await fs.readFile(path.join(dir, `${key}.json`), "utf8"));
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
        throw err;
      }
    },
    async write(key, entry) {
      await fs.mkdir(dir, { recursive: true });
      const file = path.join(dir, `${key}.json`);
      const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
      await fs.writeFile(tmp, JSON.stringify(entry), "utf8");
      await fs.rename(tmp, file);
    },
    async keys() {
      try {
        const names = await fs.readdir(dir);
        return names.map((n) => keyFromName(prefix + n, prefix)).filter((k): k is string => k !== null);
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
        throw err;
      }
    },
  };
}

export function getWaitlistStore(env: Env = process.env, part: "list" | "suspect" = "list"): WaitlistStore | null {
  const prefix = waitlistPrefix(env) + (part === "suspect" ? "suspect/" : "");
  if (env.BLOB_READ_WRITE_TOKEN?.trim() || env.BLOB_STORE_ID?.trim()) return blobStore(prefix);
  if (!env.VERCEL_ENV && !env.VERCEL) return fileStore(path.join(process.cwd(), ".data"), prefix);
  return null;
}

export async function saveSignup(store: WaitlistStore, input: SignupInput, now = new Date().toISOString()): Promise<boolean> {
  const key = emailKey(input.email);
  const existing = await store.read(key);
  await store.write(key, mergeEntry(existing, input, now));
  return existing === null;
}

const READ_BATCH = 32;

export async function listSignups(store: WaitlistStore): Promise<WaitlistEntry[]> {
  const keys = await store.keys();
  const out: WaitlistEntry[] = [];
  for (let i = 0; i < keys.length; i += READ_BATCH) {
    const batch = await Promise.all(keys.slice(i, i + READ_BATCH).map((k) => store.read(k)));
    for (const e of batch) if (e) out.push(e);
  }
  return sortEntries(out);
}

export const ADMIN_KEY_MIN = 16;

export function adminKeyMatches(given: string | null | undefined, expected: string | undefined): boolean {
  const want = expected?.trim() ?? "";
  if (want.length < ADMIN_KEY_MIN || !given) return false;
  const a = createHash("sha256").update(given.trim()).digest();
  const b = createHash("sha256").update(want).digest();
  return timingSafeEqual(a, b);
}
