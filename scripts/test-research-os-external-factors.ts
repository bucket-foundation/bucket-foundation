/**
 * A branch's factors from other branches, as node pages and routing load
 * them (src/lib/research-os/db.ts addExternalFactors): closure ancestors,
 * incoming prerequisite edges, and derives_from factors join the subgraph
 * with the edges among them, and nothing unrelated comes along.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { addExternalFactors, type EdgeRow } from "../src/lib/research-os/db";
import type { GraphNode } from "../src/lib/research-os/types";

type Row = Record<string, any>;

function fake(tables: Record<string, Row[]>, failOn?: string) {
  return {
    from(table: string) {
      const filters: ((r: Row) => boolean)[] = [];
      const q = {
        select: () => q,
        in: (c: string, vs: unknown[]) => (filters.push((r) => vs.includes(r[c])), q),
        then(res: (v: { data: Row[] | null; error: { message: string } | null }) => unknown) {
          if (failOn === table) return Promise.resolve({ data: null, error: { message: "down" } }).then(res);
          return Promise.resolve({ data: (tables[table] ?? []).filter((r) => filters.every((f) => f(r))), error: null }).then(res);
        },
      };
      return q;
    },
  } as any;
}

const node = (id: string, branch: string): Row => ({ id, slug: id, title: id.toUpperCase(), kind: "concept", tier: 13, branch, summary: null, labels: null, provenance: null, worked_example: null, visibility: "public", owner_id: null, frontier_flag: null });
const edge = (id: string, from: string, to: string, kind: string): EdgeRow => ({ id, from_id: from, to_id: to, kind, weight: null, confidence: 1, confidence_source: null } as EdgeRow);

test("factors from other branches join the subgraph with the edges among them", async () => {
  const tables = {
    nodes: [node("b1", "phys"), node("b2", "phys"), node("x1", "math"), node("x2", "math"), node("x3", "chem"), node("x4", "chem"), node("y", "mind")],
    prereq_ancestor: [{ node_id: "b1", ancestor_id: "x1" }, { node_id: "b1", ancestor_id: "b2" }],
    edges: [
      edge("e1", "x2", "b1", "prerequisite"),
      edge("e2", "x1", "x2", "prerequisite"),
      edge("e3", "x1", "y", "prerequisite"),
      edge("e4", "x4", "b2", "bridges"),
    ],
  };
  const nodes: GraphNode[] = [];
  const edgeRows: EdgeRow[] = [edge("e5", "b2", "x3", "derives_from")];
  await addExternalFactors(fake(tables), ["b1", "b2"], nodes, edgeRows);
  assert.deepEqual(nodes.map((n) => n.id).sort(), ["x1", "x2", "x3"]);
  assert.deepEqual(edgeRows.map((e) => e.id).sort(), ["e1", "e2", "e5"]);
});

test("a failed read surfaces as an error", async () => {
  await assert.rejects(addExternalFactors(fake({ nodes: [], edges: [] }, "prereq_ancestor"), ["b1"], [], []));
});
