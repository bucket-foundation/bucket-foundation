import type { GraphEdge, GraphNode } from "@/lib/research-os/types";

export type Row = Record<string, unknown>;

export const live: { learner: string | null; tables: Record<string, Row[]> } = { learner: null, tables: {} };

function query(source: Row[]) {
  let rows = [...source];
  let head = false;
  const b = {
    select(_cols?: string, opts?: { head?: boolean }) {
      if (opts?.head) head = true;
      return b;
    },
    eq(k: string, v: unknown) {
      rows = rows.filter((r) => r[k] === v);
      return b;
    },
    neq(k: string, v: unknown) {
      rows = rows.filter((r) => r[k] !== v);
      return b;
    },
    in(k: string, vs: unknown[]) {
      rows = rows.filter((r) => vs.includes(r[k]));
      return b;
    },
    is(k: string, v: unknown) {
      rows = rows.filter((r) => (r[k] ?? null) === v);
      return b;
    },
    or: () => b,
    order: () => b,
    limit(n: number) {
      rows = rows.slice(0, n);
      return b;
    },
    range(from: number, to: number) {
      rows = rows.slice(from, to + 1);
      return b;
    },
    maybeSingle: async () => ({ data: rows[0] ?? null, error: null }),
    then<T>(ok: (v: { data: Row[] | null; count: number; error: null }) => T, fail?: (e: unknown) => T) {
      return Promise.resolve({ data: head ? null : rows, count: rows.length, error: null }).then(ok, fail);
    },
  };
  return b;
}

export const fakeService = () => ({ from: (t: string) => query(live.tables[t] ?? []) });

export function fakeSubgraph(branch: string): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const nodes = (live.tables.nodes ?? [])
    .filter((r) => r.branch === branch)
    .map((r) => ({
      id: r.id as string,
      slug: r.slug as string,
      title: r.title as string,
      kind: r.kind as GraphNode["kind"],
      tier: r.tier as number,
      branch: r.branch as string,
      summary: (r.summary as string | null) ?? null,
      provenance: r.provenance as GraphNode["provenance"],
      visibility: "public" as const,
      ownerId: null,
      frontierFlag: (r.frontier_flag as GraphNode["frontierFlag"]) ?? null,
    }));
  const ids = new Set(nodes.map((n) => n.id));
  const edges = (live.tables.edges ?? [])
    .filter((e) => ids.has(e.from_id as string))
    .map((e) => ({ id: e.id as string, fromId: e.from_id as string, toId: e.to_id as string, kind: e.kind as GraphEdge["kind"] }));
  return { nodes, edges };
}
