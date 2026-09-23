import fs from "node:fs";

type Row = Record<string, unknown>;
const tables = JSON.parse(fs.readFileSync(process.env.STUB_TABLES!, "utf8")) as Record<string, Row[]>;
const calls: { op: string; table?: string; args?: unknown }[] = [];

function query(table: string) {
  const filters: ((r: Row) => boolean)[] = [];
  let range: [number, number] | null = null;
  let one = false;
  const q = {
    select(cols: string) {
      calls.push({ op: "select", table, args: cols });
      return q;
    },
    eq(c: string, v: unknown) {
      filters.push((r) => r[c] === v);
      return q;
    },
    is(c: string, v: unknown) {
      filters.push((r) => (r[c] ?? null) === v);
      return q;
    },
    in(c: string, vs: unknown[]) {
      filters.push((r) => vs.includes(r[c]));
      return q;
    },
    order: () => q,
    range(a: number, b: number) {
      range = [a, b];
      return q;
    },
    maybeSingle() {
      one = true;
      return q;
    },
    then(resolve: (v: { data: unknown; error: null }) => unknown, reject?: (e: unknown) => unknown) {
      let rows = (tables[table] ?? []).filter((r) => filters.every((f) => f(r)));
      if (range) rows = rows.slice(range[0], range[1] + 1);
      return Promise.resolve({ data: one ? (rows[0] ?? null) : rows, error: null }).then(resolve, reject);
    },
  };
  return q;
}

const fake = {
  createClient() {
    return {
      from: (table: string) => query(table),
      rpc(name: string, args: unknown) {
        calls.push({ op: "rpc", args: { name, args } });
        if (name === "withdraw_evidence_source") return Promise.resolve({ data: 1, error: null });
        if (name === "restore_withdrawn_node") return Promise.resolve({ data: { ok: true, visibility: "public" }, error: null });
        return Promise.resolve({ data: null, error: { message: `unexpected rpc ${name}` } });
      },
      auth: { admin: { listUsers: () => Promise.resolve({ data: { users: tables.users ?? [] }, error: null }) } },
    };
  },
};

const supabasePath = require.resolve("@supabase/supabase-js");
const ModuleCtor = module.constructor as new (id: string) => NodeModule;
const stubModule = new ModuleCtor(supabasePath);
stubModule.exports = fake;
stubModule.loaded = true;
require.cache[supabasePath] = stubModule;

process.on("exit", () => {
  if (process.env.STUB_LOG) fs.writeFileSync(process.env.STUB_LOG, JSON.stringify(calls));
});
