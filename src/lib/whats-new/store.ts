import { promises as fs } from "node:fs";
import path from "node:path";
import { get, list, put } from "@vercel/blob";

type Env = Record<string, string | undefined>;

export interface DocStore {
  kind: "blob" | "file";
  prefix: string;
  read(name: string): Promise<string | null>;
  write(name: string, text: string, options?: { overwrite?: boolean }): Promise<void>;
  list(dir: string): Promise<string[]>;
}

export function whatsNewPrefix(env: Env = process.env): string {
  const target = env.VERCEL_ENV?.trim();
  return target === "production" ? "whats-new/" : `whats-new-${target || "local"}/`;
}

export function blobDocs(prefix: string): DocStore {
  return {
    kind: "blob",
    prefix,
    async read(name) {
      const res = await get(prefix + name, { access: "private", useCache: false }).catch((err: unknown) => {
        if (err instanceof Error && err.name === "BlobNotFoundError") return null;
        throw err;
      });
      if (!res) return null;
      if (res.statusCode !== 200) throw new Error(`blob read returned ${res.statusCode}`);
      return new Response(res.stream).text();
    },
    async write(name, text, options) {
      await put(prefix + name, text, {
        access: "private",
        addRandomSuffix: false,
        allowOverwrite: options?.overwrite ?? true,
        contentType: "application/json",
      });
    },
    async list(dir) {
      const base = `${prefix}${dir}/`;
      const out: string[] = [];
      let cursor: string | undefined;
      do {
        const page = await list({ prefix: base, cursor, limit: 1000 });
        for (const b of page.blobs) out.push(b.pathname.slice(base.length));
        cursor = page.hasMore ? page.cursor : undefined;
      } while (cursor);
      return out;
    },
  };
}

export function fileDocs(root: string, prefix: string): DocStore {
  const base = path.join(root, prefix);
  return {
    kind: "file",
    prefix,
    async read(name) {
      try {
        return await fs.readFile(path.join(base, name), "utf8");
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
        throw err;
      }
    },
    async write(name, text, options) {
      const file = path.join(base, name);
      await fs.mkdir(path.dirname(file), { recursive: true });
      if (options?.overwrite === false) {
        await fs.writeFile(file, text, { encoding: "utf8", flag: "wx" });
        return;
      }
      const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
      await fs.writeFile(tmp, text, "utf8");
      await fs.rename(tmp, file);
    },
    async list(dir) {
      try {
        return await fs.readdir(path.join(base, dir));
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
        throw err;
      }
    },
  };
}

export function getWhatsNewStore(env: Env = process.env): DocStore | null {
  const prefix = whatsNewPrefix(env);
  if (env.BLOB_READ_WRITE_TOKEN?.trim() || env.BLOB_STORE_ID?.trim()) return blobDocs(prefix);
  if (!env.VERCEL_ENV && !env.VERCEL) return fileDocs(path.join(process.cwd(), ".data"), prefix);
  return null;
}

export type ReviewState = "draft" | "published";

export interface StoredEntry {
  id: string;
  kind: "production" | "generation";
  review_state: ReviewState;
  poster: string;
  created_at: string;
  updated_at: string;
  body_hash: string;
  [field: string]: unknown;
}

export interface AuditRecord {
  ts: string;
  id: string;
  poster: string;
  action: "create" | "replace";
  body_hash: string;
  previous_body_hash: string | null;
}

const ENTRY_FILE = /^([a-z0-9-]{3,80})\.json$/;
const READ_BATCH = 32;

export async function readEntry(store: DocStore, id: string): Promise<StoredEntry | null> {
  const text = await store.read(`entries/${id}.json`);
  return text === null ? null : (JSON.parse(text) as StoredEntry);
}

export async function writeEntry(store: DocStore, entry: StoredEntry): Promise<void> {
  await store.write(`entries/${entry.id}.json`, JSON.stringify(entry));
}

export async function writeImage(store: DocStore, id: string, image: unknown): Promise<void> {
  await store.write(`entries/${id}.image.json`, JSON.stringify(image));
}

export async function entryIds(store: DocStore): Promise<string[]> {
  const names = await store.list("entries");
  return names.map((n) => ENTRY_FILE.exec(n)?.[1]).filter((id): id is string => Boolean(id));
}

export async function listEntries(store: DocStore): Promise<StoredEntry[]> {
  const ids = await entryIds(store);
  const out: StoredEntry[] = [];
  for (let i = 0; i < ids.length; i += READ_BATCH) {
    const batch = await Promise.all(ids.slice(i, i + READ_BATCH).map((id) => readEntry(store, id)));
    for (const e of batch) if (e) out.push(e);
  }
  return out;
}

export async function appendAudit(store: DocStore, record: AuditRecord, suffix: string): Promise<void> {
  const stamp = record.ts.replace(/[:.]/g, "-");
  await store.write(`audit/${stamp}-${record.id}-${suffix}.json`, JSON.stringify(record), { overwrite: false });
}

export async function readCounter(store: DocStore, poster: string): Promise<number> {
  const text = await store.read(`counters/${poster}.json`);
  if (text === null) return 0;
  const v = (JSON.parse(text) as { v?: unknown }).v;
  if (typeof v !== "number" || !Number.isFinite(v)) throw new Error("draft counter is unreadable");
  return v;
}

export async function writeCounter(store: DocStore, poster: string, value: number): Promise<void> {
  await store.write(`counters/${poster}.json`, JSON.stringify({ v: value }));
}

export async function markRevoked(store: DocStore, poster: string, at: string): Promise<void> {
  await store.write(`revoked/${poster}.json`, JSON.stringify({ revoked_at: at }));
}

export async function revokedMark(store: DocStore, poster: string): Promise<boolean> {
  return (await store.read(`revoked/${poster}.json`)) !== null;
}
