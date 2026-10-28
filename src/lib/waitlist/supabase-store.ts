import { createHash } from "node:crypto";
import type { MarkStore } from "../download/marks";
import { parseEntry } from "./core";
import type { WaitlistStore } from "./store";

type Env = Record<string, string | undefined>;

export const SIGNUPS_TABLE = "waitlist_signups";
export const MARKS_TABLE = "site_marks";
export const BUMP_FN = "site_mark_bump";
const PAGE = 1000;

export interface KvTable {
  get(prefix: string, key: string): Promise<unknown | null>;
  put(prefix: string, key: string, value: unknown): Promise<void>;
  keys(prefix: string): Promise<string[]>;
  remove(prefix: string, key: string): Promise<void>;
  bump(prefix: string, key: string): Promise<number>;
  sweep(prefix: string, olderThan: number): Promise<number>;
}

type Result<T> = { data: T | null; error: { message: string } | null; count?: number | null };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Client = any;

export function supabaseConfigured(env: Env = process.env): boolean {
  return Boolean(env.NEXT_PUBLIC_SUPABASE_URL?.trim() && env.SUPABASE_SERVICE_ROLE_KEY?.trim());
}

let _client: Promise<Client> | null = null;
function serviceClient(env: Env): Promise<Client> {
  _client ??= import("@supabase/supabase-js").then(({ createClient }) =>
    createClient(env.NEXT_PUBLIC_SUPABASE_URL!.trim().replace(/\/$/, ""), env.SUPABASE_SERVICE_ROLE_KEY!.trim(), {
      db: { schema: "bucket" },
      auth: { persistSession: false, autoRefreshToken: false },
    }),
  );
  return _client;
}

function ok<T>(res: Result<T>, what: string): T | null {
  if (res.error) throw new Error(`${what}: ${res.error.message}`);
  return res.data;
}

export function supabaseTable(table: string, column: "entry" | "value", client: () => Promise<Client>): KvTable {
  return {
    async get(prefix, key) {
      const res: Result<Record<string, unknown>> = await (await client()).from(table).select(column).eq("prefix", prefix).eq("key", key).maybeSingle();
      return ok(res, `${table} read`)?.[column] ?? null;
    },
    async put(prefix, key, value) {
      const res: Result<unknown> = await (await client())
        .from(table)
        .upsert({ prefix, key, [column]: value, updated_at: new Date().toISOString() }, { onConflict: "prefix,key" });
      ok(res, `${table} write`);
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
      return Number(ok(res, `${BUMP_FN}`) ?? 0);
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

export function supabaseWaitlistStore(prefix: string, env: Env = process.env): WaitlistStore {
  return tableWaitlistStore(prefix, supabaseTable(SIGNUPS_TABLE, "entry", () => serviceClient(env)));
}

export function supabaseMarks(prefix: string, env: Env = process.env): MarkStore {
  return tableMarks(prefix, supabaseTable(MARKS_TABLE, "value", () => serviceClient(env)));
}
