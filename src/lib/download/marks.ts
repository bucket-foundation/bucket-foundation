import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { del, get, list, put } from "@vercel/blob";
import { waitlistPrefix } from "../waitlist/store";

type Env = Record<string, string | undefined>;

export const MARK_MAX_AGE_MS = 25 * 60 * 60 * 1000;

export interface MarkStore {
  get(key: string): Promise<number | null>;
  set(key: string, value: number): Promise<void>;
  sweep(olderThan: number, deadline: number): Promise<{ removed: number; done: boolean }>;
}

function fileName(key: string): string {
  return createHash("sha256").update(key).digest("hex") + ".json";
}

function parse(text: string): number | null {
  try {
    const v = JSON.parse(text) as { v?: unknown };
    return typeof v.v === "number" && Number.isFinite(v.v) ? v.v : null;
  } catch {
    return null;
  }
}

export function blobMarks(prefix: string, clock: () => number = Date.now): MarkStore {
  return {
    async get(key) {
      const res = await get(prefix + fileName(key), { access: "private", useCache: false }).catch((err: unknown) => {
        if (err instanceof Error && err.name === "BlobNotFoundError") return null;
        throw err;
      });
      if (!res || res.statusCode !== 200) return null;
      return parse(await new Response(res.stream).text());
    },
    async set(key, value) {
      await put(prefix + fileName(key), JSON.stringify({ v: value }), {
        access: "private",
        addRandomSuffix: false,
        allowOverwrite: true,
        contentType: "application/json",
      });
    },
    async sweep(olderThan, deadline) {
      let removed = 0;
      let cursor: string | undefined;
      do {
        if (clock() > deadline) return { removed, done: false };
        const page = await list({ prefix, cursor, limit: 1000 });
        const stale = page.blobs.filter((b) => new Date(b.uploadedAt).getTime() < olderThan).map((b) => b.url);
        if (stale.length) await del(stale);
        removed += stale.length;
        cursor = page.hasMore ? page.cursor : undefined;
      } while (cursor);
      return { removed, done: true };
    },
  };
}

export function fileMarks(dir: string, clock: () => number = Date.now): MarkStore {
  return {
    async get(key) {
      try {
        return parse(await fs.readFile(path.join(dir, fileName(key)), "utf8"));
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
        throw err;
      }
    },
    async set(key, value) {
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(path.join(dir, fileName(key)), JSON.stringify({ v: value }), "utf8");
    },
    async sweep(olderThan, deadline) {
      let removed = 0;
      const names = await fs.readdir(dir).catch(() => [] as string[]);
      for (const n of names) {
        if (clock() > deadline) return { removed, done: false };
        const p = path.join(dir, n);
        if ((await fs.stat(p)).mtimeMs < olderThan) {
          await fs.rm(p, { force: true });
          removed++;
        }
      }
      return { removed, done: true };
    },
  };
}

export function getMarkStore(env: Env = process.env): MarkStore | null {
  const prefix = `${waitlistPrefix(env)}download-marks/`;
  if (env.BLOB_READ_WRITE_TOKEN?.trim() || env.BLOB_STORE_ID?.trim()) return blobMarks(prefix);
  if (!env.VERCEL_ENV && !env.VERCEL) return fileMarks(path.join(process.cwd(), ".data", prefix));
  return null;
}

export function sharedRateLimiter(marks: MarkStore, max: number, windowMs: number, clock: () => number = Date.now): (ip: string) => Promise<boolean> {
  return async (ip) => {
    const key = `rate:${ip}:${Math.floor(clock() / windowMs)}`;
    const count = ((await marks.get(key)) ?? 0) + 1;
    await marks.set(key, count);
    return count > max;
  };
}
