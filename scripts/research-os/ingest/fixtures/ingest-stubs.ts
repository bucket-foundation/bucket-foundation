import { createHash } from "node:crypto";
import fs from "node:fs";

type Call = { op: string; table?: string; count?: number; sha?: string; first?: unknown; opts?: unknown; args?: unknown; kinds?: Record<string, number> };
type Row = Record<string, unknown>;

const calls: Call[] = [];
const fail = process.env.STUB_FAIL ?? "";

const sha = (v: unknown) => createHash("sha256").update(JSON.stringify(v)).digest("hex").slice(0, 16);

function builder(table: string) {
  return {
    select(cols: string) {
      calls.push({ op: "select", table, args: cols });
      let rows: Row[] = [];
      const chain = {
        in(column: string, values: unknown[]) {
          if (table === "nodes" && column === "slug" && process.env.STUB_KNOWN_SLUGS === "1") rows = values.map((v) => ({ id: `id:${String(v)}`, slug: v }));
          return chain;
        },
        eq: () => chain,
        order: () => chain,
        range: () => chain,
        then(resolve: (v: { data: Row[]; error: null }) => unknown, reject?: (e: unknown) => unknown) {
          return Promise.resolve({ data: rows, error: null }).then(resolve, reject);
        },
      };
      return chain;
    },
    insert(rows: Row[]) {
      calls.push({ op: "insert", table, count: rows.length, sha: sha(rows) });
      return Promise.resolve({ data: null, error: null });
    },
    update(patch: Row) {
      calls.push({ op: "update", table, sha: sha(patch) });
      return { eq: () => Promise.resolve({ data: null, error: null }) };
    },
    upsert(rows: Row[], opts: unknown) {
      const kinds = table === "edges" ? rows.reduce<Record<string, number>>((acc, r) => ({ ...acc, [String(r.kind)]: (acc[String(r.kind)] ?? 0) + 1 }), {}) : undefined;
      calls.push({ op: "upsert", table, count: rows.length, sha: sha(rows), first: rows[0] ?? null, opts, ...(kinds ? { kinds } : {}) });
      const error = fail === table ? { message: `${table} stub failure` } : null;
      const result = { data: null, error };
      return {
        select(cols: string) {
          calls.push({ op: "select", table, args: cols });
          return Promise.resolve({
            data: error ? null : rows.map((r) => ({ id: `id:${String(r.slug)}`, slug: r.slug })),
            error,
          });
        },
        then(resolve: (v: typeof result) => unknown, reject?: (e: unknown) => unknown) {
          return Promise.resolve(result).then(resolve, reject);
        },
      };
    },
  };
}

const fakeSupabase = {
  createClient(url: string, key: string, opts: unknown) {
    calls.push({ op: "createClient", args: { url, key, opts } });
    return {
      from: (table: string) => builder(table),
      rpc(name: string) {
        calls.push({ op: "rpc", args: name });
        if (fail === "rpc" || fail === `rpc:${name}`) return Promise.resolve({ data: null, error: { message: "rpc stub failure" } });
        return Promise.resolve({ data: 3, error: null });
      },
    };
  },
};

const supabasePath = require.resolve("@supabase/supabase-js");
const ModuleCtor = module.constructor as new (id: string) => NodeModule;
const stubModule = new ModuleCtor(supabasePath);
stubModule.exports = fakeSupabase;
stubModule.loaded = true;
require.cache[supabasePath] = stubModule;

if (process.env.STUB_LLM === "1") {
  globalThis.fetch = (async (input: RequestInfo | URL, init: RequestInit = {}) => {
    calls.push({ op: "fetch", args: { url: String(input), sha: sha(init.body ?? null) } });
    const content = JSON.stringify({ prerequisite: true, confidence: 0.8, justification: "stub" });
    return new Response(JSON.stringify({ choices: [{ message: { content } }], usage: { prompt_tokens: 1, completion_tokens: 1 } }), { status: 200 });
  }) as typeof fetch;
}

process.on("exit", () => {
  const out = process.env.STUB_LOG;
  if (out) fs.writeFileSync(out, JSON.stringify(calls));
});
