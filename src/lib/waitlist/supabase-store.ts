import { createHash } from "node:crypto";
import type { MarkStore } from "../download/marks";
import type { DocStore } from "../whats-new/store";
import { parseEntry, type WaitlistEntry } from "./core";
import type { InviteRecord, InviteStore } from "./invites";
import type { WaitlistStore } from "./store";

type Env = Record<string, string | undefined>;

export const SIGNUPS_TABLE = "waitlist_signups";
export const MARKS_TABLE = "site_marks";
export const DOCS_TABLE = "site_docs";
export const BUMP_FN = "site_mark_bump";
export const CAS_FN = "waitlist_cas";
export const CAS_ATTEMPTS = 5;
const PAGE = 1000;
const KEY_FILE = /^([0-9a-f]{64})\.json$/;

export class TableMissingError extends Error {
  constructor(what: string, message: string) {
    super(`${what}: ${message}`);
    this.name = "TableMissingError";
  }
}

export function isTableMissing(err: unknown): err is TableMissingError {
  return err instanceof Error && err.name === "TableMissingError";
}

type DbError = { message: string; code?: string };
type Result<T> = { data: T | null; error: DbError | null; count?: number | null };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Client = any;

const MISSING_CODES = new Set(["42P01", "42883", "PGRST202", "PGRST205", "3F000"]);

export function missingRelation(error: DbError): boolean {
  return MISSING_CODES.has(error.code ?? "") || /does not exist|schema cache/i.test(error.message);
}

function ok<T>(res: Result<T>, what: string): T | null {
  if (!res.error) return res.data;
  if (missingRelation(res.error)) throw new TableMissingError(what, res.error.message);
  throw new Error(`${what}: ${res.error.message}`);
}

export function supabaseConfigured(env: Env = process.env): boolean {
  return Boolean(env.NEXT_PUBLIC_SUPABASE_URL?.trim() && env.SUPABASE_SERVICE_ROLE_KEY?.trim());
}

let _client: Promise<Client> | null = null;
export function cachedClient(load: () => Promise<Client>): Promise<Client> {
  if (!_client) {
    _client = load().catch((err: unknown) => {
      _client = null;
      throw err;
    });
  }
  return _client;
}

export function resetClientCache(): void {
  _client = null;
}

function serviceClient(env: Env): Promise<Client> {
  return cachedClient(() =>
    import("@supabase/supabase-js").then(({ createClient }) =>
      createClient(env.NEXT_PUBLIC_SUPABASE_URL!.trim().replace(/\/$/, ""), env.SUPABASE_SERVICE_ROLE_KEY!.trim(), {
        db: { schema: "bucket" },
        auth: { persistSession: false, autoRefreshToken: false },
      }),
    ),
  );
}

export interface KvTable {
  get(prefix: string, key: string): Promise<unknown | null>;
  getVersioned(prefix: string, key: string): Promise<{ value: unknown; version: number } | null>;
  put(prefix: string, key: string, value: unknown): Promise<void>;
  cas(prefix: string, key: string, value: unknown, version: number | null): Promise<boolean>;
  keys(prefix: string): Promise<string[]>;
  remove(prefix: string, key: string): Promise<void>;
  bump(prefix: string, key: string): Promise<number>;
  sweep(prefix: string, olderThan: number): Promise<number>;
}

export interface DocsTable {
  get(prefix: string, name: string): Promise<string | null>;
  put(prefix: string, name: string, body: string): Promise<void>;
  create(prefix: string, name: string, body: string): Promise<boolean>;
  remove(prefix: string, name: string): Promise<void>;
  names(prefix: string, startsWith: string): Promise<string[]>;
}

function likePrefix(s: string): string {
  return s.replace(/[\\%_]/g, (c) => `\\${c}`) + "%";
}

export function supabaseTable(table: string, column: "entry" | "value", client: () => Promise<Client>): KvTable {
  return {
    async get(prefix, key) {
      const res: Result<Record<string, unknown>> = await (await client()).from(table).select(column).eq("prefix", prefix).eq("key", key).maybeSingle();
      return ok(res, `${table} read`)?.[column] ?? null;
    },
    async getVersioned(prefix, key) {
      const res: Result<Record<string, unknown>> = await (await client()).from(table).select(`${column},version`).eq("prefix", prefix).eq("key", key).maybeSingle();
      const row = ok(res, `${table} read`);
      return row ? { value: row[column], version: Number(row.version) } : null;
    },
    async put(prefix, key, value) {
      const res: Result<unknown> = await (await client())
        .from(table)
        .upsert({ prefix, key, [column]: value, updated_at: new Date().toISOString() }, { onConflict: "prefix,key" });
      ok(res, `${table} write`);
    },
    async cas(prefix, key, value, version) {
      const res: Result<boolean> = await (await client()).rpc(CAS_FN, { p_prefix: prefix, p_key: key, p_entry: value, p_version: version });
      return ok(res, CAS_FN) === true;
    },
    async keys(prefix) {
      const out: string[] = [];
      for (let from = 0; ; from += PAGE) {
        const res: Result<{ key: string }[]> = await (await client()).from(table).select("key").eq("prefix", prefix).order("key").range(from, from + PAGE - 1);
        const rows = ok(res, `${table} list`) ?? [];
        out.push(...rows.map((r) => r.key));
        if (rows.length < PAGE) return out;
      }
    },
    async remove(prefix, key) {
      ok(await (await client()).from(table).delete().eq("prefix", prefix).eq("key", key), `${table} delete`);
    },
    async bump(prefix, key) {
      const res: Result<number> = await (await client()).rpc(BUMP_FN, { p_prefix: prefix, p_key: key });
      return Number(ok(res, BUMP_FN) ?? 0);
    },
    async sweep(prefix, olderThan) {
      const res: Result<unknown> = await (await client())
        .from(table)
        .delete({ count: "exact" })
        .eq("prefix", prefix)
        .lt("updated_at", new Date(olderThan).toISOString());
      ok(res, `${table} sweep`);
      return res.count ?? 0;
    },
  };
}

export function supabaseDocs(client: () => Promise<Client>): DocsTable {
  return {
    async get(prefix, name) {
      const res: Result<{ body: string }> = await (await client()).from(DOCS_TABLE).select("body").eq("prefix", prefix).eq("name", name).maybeSingle();
      return ok(res, `${DOCS_TABLE} read`)?.body ?? null;
    },
    async put(prefix, name, body) {
      const res: Result<unknown> = await (await client())
        .from(DOCS_TABLE)
        .upsert({ prefix, name, body, updated_at: new Date().toISOString() }, { onConflict: "prefix,name" });
      ok(res, `${DOCS_TABLE} write`);
    },
    async create(prefix, name, body) {
      const res: Result<unknown[]> = await (await client())
        .from(DOCS_TABLE)
        .upsert({ prefix, name, body, updated_at: new Date().toISOString() }, { onConflict: "prefix,name", ignoreDuplicates: true })
        .select("name");
      return (ok(res, `${DOCS_TABLE} create`) ?? []).length > 0;
    },
    async remove(prefix, name) {
      ok(await (await client()).from(DOCS_TABLE).delete().eq("prefix", prefix).eq("name", name), `${DOCS_TABLE} delete`);
    },
    async names(prefix, startsWith) {
      const out: string[] = [];
      for (let from = 0; ; from += PAGE) {
        let q = (await client()).from(DOCS_TABLE).select("name").eq("prefix", prefix);
        if (startsWith) q = q.like("name", likePrefix(startsWith));
        const res: Result<{ name: string }[]> = await q.order("name").range(from, from + PAGE - 1);
        const rows = ok(res, `${DOCS_TABLE} list`) ?? [];
        out.push(...rows.map((r) => r.name));
        if (rows.length < PAGE) return out;
      }
    },
  };
}

export async function casUpsert(
  table: KvTable,
  prefix: string,
  key: string,
  merge: (existing: WaitlistEntry | null) => WaitlistEntry,
  attempts = CAS_ATTEMPTS,
): Promise<boolean> {
  for (let i = 0; i < attempts; i++) {
    const row = await table.getVersioned(prefix, key);
    const existing = row ? parseEntry(row.value) : null;
    if (await table.cas(prefix, key, merge(existing), row ? row.version : null)) return row === null;
  }
  throw new Error(`waitlist upsert for ${key} lost ${attempts} races`);
}

export function tableWaitlistStore(prefix: string, table: KvTable): WaitlistStore {
  return {
    kind: "supabase",
    prefix,
    async read(key) {
      return parseEntry(await table.get(prefix, key));
    },
    async write(key, entry) {
      await table.put(prefix, key, entry);
    },
    upsert: (key, merge) => casUpsert(table, prefix, key, merge),
    keys: () => table.keys(prefix),
    remove: (key) => table.remove(prefix, key),
  };
}

export function markKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

export function tableMarks(prefix: string, table: KvTable): MarkStore {
  return {
    async get(key) {
      const v = await table.get(prefix, markKey(key));
      return typeof v === "number" && Number.isFinite(v) ? v : null;
    },
    async set(key, value) {
      await table.put(prefix, markKey(key), value);
    },
    bump: (key) => table.bump(prefix, markKey(key)),
    async sweep(olderThan) {
      return { removed: await table.sweep(prefix, olderThan), done: true };
    },
  };
}

export function tableDocStore(prefix: string, docs: DocsTable): DocStore {
  return {
    kind: "supabase",
    prefix,
    read: (name) => docs.get(prefix, name),
    write: (name, text) => docs.put(prefix, name, text),
    create: (name, text) => docs.create(prefix, name, text),
    remove: (name) => docs.remove(prefix, name),
    async list(dir) {
      const base = `${dir}/`;
      return (await docs.names(prefix, base)).map((n) => n.slice(base.length)).filter((n) => n && !n.includes("/"));
    },
  };
}

function parseInvite(text: string | null): InviteRecord | null {
  if (text === null) return null;
  try {
    return JSON.parse(text) as InviteRecord;
  } catch {
    return null;
  }
}

export function tableInviteStore(prefix: string, docs: DocsTable): InviteStore {
  return {
    kind: "supabase",
    read: async (key) => parseInvite(await docs.get(prefix, `${key}.json`)),
    create: (key, record) => docs.create(prefix, `${key}.json`, JSON.stringify(record)),
    write: (key, record) => docs.put(prefix, `${key}.json`, JSON.stringify(record)),
    async keys() {
      return (await docs.names(prefix, "")).map((n) => KEY_FILE.exec(n)?.[1]).filter((k): k is string => Boolean(k));
    },
  };
}

export function supabaseWaitlistStore(prefix: string, env: Env = process.env): WaitlistStore {
  return tableWaitlistStore(prefix, supabaseTable(SIGNUPS_TABLE, "entry", () => serviceClient(env)));
}

export function supabaseMarks(prefix: string, env: Env = process.env): MarkStore {
  return tableMarks(prefix, supabaseTable(MARKS_TABLE, "value", () => serviceClient(env)));
}

export function supabaseDocStore(prefix: string, env: Env = process.env): DocStore {
  return tableDocStore(prefix, supabaseDocs(() => serviceClient(env)));
}

export function supabaseInviteStore(prefix: string, env: Env = process.env): InviteStore {
  return tableInviteStore(prefix, supabaseDocs(() => serviceClient(env)));
}
