export type Row = Record<string, unknown>;
type Filter = (r: Row) => boolean;

export function fakeDb(tables: Record<string, Row[]>, keys: Record<string, string[]> = {}) {
  const log: string[] = [];
  const from = (table: string) => {
    let op: "select" | "update" | "delete" | "upsert" | "insert" = "select";
    let patch: Row = {};
    let single = false;
    let ignore = false;
    let returning = false;
    let order: { col: string; asc: boolean } | null = null;
    let lim = Infinity;
    const filters: Filter[] = [];
    const run = async () => {
      await Promise.resolve();
      tables[table] ??= [];
      const rows = tables[table];
      if (op === "insert" && Array.isArray(patch)) {
        rows.push(...(patch as Row[]).map((r) => ({ ...r })));
        log.push(`insert ${table}`);
        return { data: null, error: null };
      }
      if (op === "upsert" || op === "insert") {
        const k = keys[table] ?? [];
        const hit = k.length ? rows.find((r) => k.every((c) => r[c] === patch[c])) : undefined;
        if (hit && op === "insert") return { data: null, error: { code: "23505", message: "duplicate key" } };
        if (hit && op === "upsert" && ignore) return { data: returning ? [] : null, error: null };
        if (hit && op === "upsert") Object.assign(hit, patch);
        else rows.push({ ...patch });
        log.push(`${op} ${table}`);
        return { data: returning ? [{ ...patch }] : null, error: null };
      }
      let hit = rows.filter((r) => filters.every((f) => f(r)));
      if (op === "update") for (const r of hit) Object.assign(r, patch);
      if (op === "delete") tables[table] = rows.filter((r) => !hit.includes(r));
      if (op !== "select") log.push(`${op} ${table} ${hit.length}`);
      if (order) {
        const { col, asc } = order;
        hit = hit.slice().sort((a, b) => (Number(a[col]) - Number(b[col])) * (asc ? 1 : -1));
      }
      hit = hit.slice(0, lim);
      const data = hit.map((r) => ({ ...r }));
      return { data: single ? data[0] ?? null : data, error: null };
    };
    const chain = {
      select: () => ((returning = op !== "select"), chain),
      update: (p: Row) => ((op = "update"), (patch = p), chain),
      upsert: (p: Row, o?: { ignoreDuplicates?: boolean }) => ((op = "upsert"), (patch = p), (ignore = o?.ignoreDuplicates === true), chain),
      insert: (p: Row | Row[]) => ((op = "insert"), (patch = p as Row), chain),
      delete: () => ((op = "delete"), chain),
      eq: (c: string, v: unknown) => (filters.push((r) => r[c] === v), chain),
      neq: (c: string, v: unknown) => (filters.push((r) => r[c] !== v), chain),
      lt: (c: string, v: string) => (filters.push((r) => String(r[c]) < v), chain),
      in: (c: string, vs: unknown[]) => (filters.push((r) => vs.includes(r[c])), chain),
      order: (col: string, o?: { ascending?: boolean }) => ((order = { col, asc: o?.ascending !== false }), chain),
      limit: (n: number) => ((lim = n), chain),
      maybeSingle: () => ((single = true), chain),
      then: (ok: (v: unknown) => unknown, bad: (e: unknown) => unknown) => run().then(ok, bad),
    };
    return chain;
  };
  const rpc = async () => ({ data: true, error: null });
  return { db: { from, rpc }, log, tables };
}
