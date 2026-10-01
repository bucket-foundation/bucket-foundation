import { promises as fs } from "node:fs";
import path from "node:path";
import { del, get, list, put } from "@vercel/blob";

type Env = Record<string, string | undefined>;

export interface DocStore {
  kind: "blob" | "file";
  prefix: string;
  read(name: string): Promise<string | null>;
  write(name: string, text: string): Promise<void>;
  create(name: string, text: string): Promise<boolean>;
  remove(name: string): Promise<void>;
  list(dir: string): Promise<string[]>;
}

export function whatsNewPrefix(env: Env = process.env): string {
  const target = env.VERCEL_ENV?.trim();
  return target === "production" ? "whats-new/" : `whats-new-${target || "local"}/`;
}

export function blobDocs(prefix: string): DocStore {
  const store: DocStore = {
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
    async write(name, text) {
      await put(prefix + name, text, { access: "private", addRandomSuffix: false, allowOverwrite: true, contentType: "application/json" });
    },
    async create(name, text) {
      try {
        await put(prefix + name, text, { access: "private", addRandomSuffix: false, allowOverwrite: false, contentType: "application/json" });
        return true;
      } catch (err) {
        if ((await store.read(name)) !== null) return false;
        throw err;
      }
    },
    async remove(name) {
      await del(prefix + name);
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
  return store;
}

let stagedCount = 0;

async function staged(file: string, text: string): Promise<string> {
  await fs.mkdir(path.dirname(file), { recursive: true, mode: 0o700 });
  const tmp = `${file}.${process.pid}.${Date.now()}.${stagedCount++}.tmp`;
  await fs.writeFile(tmp, text, { encoding: "utf8", mode: 0o600 });
  return tmp;
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
    async write(name, text) {
      const file = path.join(base, name);
      const tmp = await staged(file, text);
      await fs.rename(tmp, file);
    },
    async create(name, text) {
      const file = path.join(base, name);
      const tmp = await staged(file, text);
      try {
        await fs.link(tmp, file);
        return true;
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code === "EEXIST") return false;
        throw err;
      } finally {
        await fs.rm(tmp, { force: true });
      }
    },
    async remove(name) {
      await fs.rm(path.join(base, name), { force: true });
    },
    async list(dir) {
      try {
        return (await fs.readdir(path.join(base, dir))).filter((n) => !n.endsWith(".tmp"));
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

export type ReviewState = "draft" | "published" | "deleted";

export interface StoredEntry {
  id: string;
  kind: "production" | "generation";
  review_state: ReviewState;
  poster: string;
  created_at: string;
  updated_at: string;
  body_hash: string;
  published_at?: string;
  deleted_at?: string;
  [field: string]: unknown;
}

export interface AuditRecord {
  ts: string;
  id: string;
  poster: string;
  action: "create" | "replace" | "revoke" | "publish" | "delete";
  body_hash: string | null;
  previous_body_hash: string | null;
  deleted?: string[];
  previous_body_hashes?: Record<string, string>;
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

export async function readImage(store: DocStore, id: string): Promise<string | null> {
  return store.read(`entries/${id}.image.json`);
}

export async function restoreImage(store: DocStore, id: string, previous: string | null): Promise<void> {
  if (previous === null) await store.remove(`entries/${id}.image.json`);
  else await store.write(`entries/${id}.image.json`, previous);
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

export async function createEntry(store: DocStore, entry: StoredEntry): Promise<boolean> {
  return store.create(`entries/${entry.id}.json`, JSON.stringify(entry));
}

export async function removeEntry(store: DocStore, id: string): Promise<void> {
  await store.remove(`entries/${id}.image.json`);
  await store.remove(`entries/${id}.json`);
}

export function tombstone(entry: StoredEntry, at: string): StoredEntry {
  return {
    id: entry.id,
    kind: entry.kind,
    review_state: "deleted",
    poster: entry.poster,
    created_at: entry.created_at,
    updated_at: at,
    deleted_at: at,
    body_hash: entry.body_hash,
  };
}

export async function removeImage(store: DocStore, id: string): Promise<void> {
  await store.remove(`entries/${id}.image.json`);
}

export async function appendAudit(store: DocStore, record: AuditRecord, suffix: string): Promise<void> {
  const stamp = record.ts.replace(/[:.]/g, "-");
  const name = `audit/${stamp}-${record.id}-${suffix}.json`;
  if (!(await store.create(name, JSON.stringify(record)))) throw new Error("audit record name is taken");
}

export interface Usage {
  drafts: number;
  image_bytes: number;
}

export async function readUsage(store: DocStore, poster: string): Promise<Usage> {
  const text = await store.read(`counters/${poster}.json`);
  if (text === null) return { drafts: 0, image_bytes: 0 };
  const v = JSON.parse(text) as Partial<Usage>;
  if (!Number.isFinite(v.drafts) || !Number.isFinite(v.image_bytes)) throw new Error("usage counter is unreadable");
  return { drafts: v.drafts as number, image_bytes: v.image_bytes as number };
}

export async function addUsage(store: DocStore, poster: string, delta: Usage): Promise<void> {
  const now = await readUsage(store, poster);
  const next: Usage = { drafts: Math.max(0, now.drafts + delta.drafts), image_bytes: Math.max(0, now.image_bytes + delta.image_bytes) };
  await store.write(`counters/${poster}.json`, JSON.stringify(next));
}

export async function clearUsage(store: DocStore, poster: string): Promise<void> {
  await store.write(`counters/${poster}.json`, JSON.stringify({ drafts: 0, image_bytes: 0 }));
}

export async function markRevoked(store: DocStore, poster: string, at: string): Promise<void> {
  await store.write(`revoked/${poster}.json`, JSON.stringify({ revoked_at: at }));
}

export async function revokedMark(store: DocStore, poster: string): Promise<boolean> {
  return (await store.read(`revoked/${poster}.json`)) !== null;
}
