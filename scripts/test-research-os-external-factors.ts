/**
 * A branch's factors from other branches, as node pages and routing load
 * them (src/lib/research-os/db.ts addExternalFactors): closure ancestors,
 * incoming prerequisite edges, and derives_from factors join the subgraph
 * with the edges among them, and nothing unrelated comes along.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { PAGE, PagingError, addExternalFactors, inChunks, pagedRead, type EdgeRow } from "../src/lib/research-os/db";
import type { GraphNode } from "../src/lib/research-os/types";

type Row = Record<string, any>;

/**
 * A stand-in for the PostgREST builder that honours `order` and `range`
 * rather than ignoring them, and caps an unranged read at PAGE rows the
 * way the server does. A caller that forgets `.range()` therefore reads
 * the same full page forever here too, which is what the paging guard in
 * db.ts exists to catch (Bucket critic C42).
 */
function fake(tables: Record<string, Row[]>, failOn?: string) {
  return {
    from(table: string) {
      const filters: ((r: Row) => boolean)[] = [];
      const sorts: { col: string; asc: boolean }[] = [];
      let span: { from: number; to: number } | null = null;
      const q = {
        select: () => q,
        in: (c: string, vs: unknown[]) => (filters.push((r) => vs.includes(r[c])), q),
        eq: (c: string, v: unknown) => (filters.push((r) => r[c] === v), q),
        neq: (c: string, v: unknown) => (filters.push((r) => r[c] !== v), q),
        order: (col: string, opts?: { ascending?: boolean }) => (sorts.push({ col, asc: opts?.ascending !== false }), q),
        range: (from: number, to: number) => ((span = { from, to }), q),
        then(res: (v: { data: Row[] | null; error: { message: string } | null }) => unknown) {
          if (failOn === table) return Promise.resolve({ data: null, error: { message: "down" } }).then(res);
          let rows = (tables[table] ?? []).filter((r) => filters.every((f) => f(r)));
          for (const s of [...sorts].reverse()) {
            rows = [...rows].sort((x, y) => (String(x[s.col]) < String(y[s.col]) ? -1 : String(x[s.col]) > String(y[s.col]) ? 1 : 0) * (s.asc ? 1 : -1));
          }
          // PostgREST answers at most PAGE rows whether or not a range
          // was asked for.
          rows = span ? rows.slice(span.from, span.to + 1) : rows;
          rows = rows.slice(0, PAGE);
          return Promise.resolve({ data: rows, error: null }).then(res);
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

test("a chunked read pages past the row cap instead of truncating", async () => {
  // PostgREST answers at most PAGE rows. Chunking the id list bounds the
  // request line and says nothing about that, so a read without a page
  // loop returns the first thousand and reads as the whole answer
  // (Bucket critic C42).
  const rows: Row[] = Array.from({ length: PAGE * 2 + 7 }, (_, i) => ({
    id: String(i).padStart(6, "0"),
    from_id: "n1",
  }));
  const svc = fake({ edges: rows });
  const got = await inChunks<Row>(["n1"], (chunk, page) =>
    svc.from("edges").select("id,from_id").in("from_id", chunk).order("id").range(page.from, page.to),
  );
  assert.equal(got.length, rows.length, "every row came back, not the first page");
  assert.equal(new Set(got.map((r) => r.id)).size, rows.length, "and none came back twice");
});

test("a read that forgets its range fails loudly rather than spinning", async () => {
  const rows: Row[] = Array.from({ length: PAGE + 1 }, (_, i) => ({ id: String(i), from_id: "n1" }));
  const svc = fake({ edges: rows });
  await assert.rejects(
    () => inChunks<Row>(["n1"], (chunk) => svc.from("edges").select("id,from_id").in("from_id", chunk).order("id")),
    (err: unknown) => err instanceof PagingError,
    "an unranged callback answers the same page forever, so the loop has to stop itself",
  );
});

test("pagedRead walks every page of a read with no id list to chunk", async () => {
  // The helper this branch is named for had no executed test: making it
  // stop after the first page left the whole suite green.
  const rows: Row[] = Array.from({ length: PAGE * 2 + 9 }, (_, i) => ({ id: String(i).padStart(6, "0"), learner_id: "l1" }));
  const svc = fake({ learner_node_state: rows });
  const got = await pagedRead<Row>((page) =>
    svc.from("learner_node_state").select("id,learner_id").eq("learner_id", "l1").order("id").range(page.from, page.to),
  );
  assert.equal(got.length, rows.length, `every row came back, not the first page: ${got.length}`);
  assert.equal(new Set(got.map((r) => r.id)).size, rows.length, "and none came back twice");
});

test("pagedRead stops on a short page rather than asking for one more", async () => {
  const rows: Row[] = Array.from({ length: 3 }, (_, i) => ({ id: String(i), learner_id: "l1" }));
  let calls = 0;
  const svc = fake({ learner_node_state: rows });
  await pagedRead<Row>((page) => {
    calls += 1;
    return svc.from("learner_node_state").select("id").eq("learner_id", "l1").order("id").range(page.from, page.to);
  });
  assert.equal(calls, 1, "a page shorter than the cap is the last one");
});

test("pagedRead that forgets its range fails loudly rather than spinning", async () => {
  const rows: Row[] = Array.from({ length: PAGE + 1 }, (_, i) => ({ id: String(i), learner_id: "l1" }));
  const svc = fake({ learner_node_state: rows });
  await assert.rejects(
    () => pagedRead<Row>(() => svc.from("learner_node_state").select("id").eq("learner_id", "l1").order("id")),
    (err: unknown) => err instanceof PagingError,
    "an unranged callback answers the same page forever, so the loop has to stop itself",
  );
});

test("pagedRead surfaces a failed read rather than returning what it got", async () => {
  const svc = fake({ learner_node_state: [] }, "learner_node_state");
  await assert.rejects(
    () => pagedRead<Row>((page) => svc.from("learner_node_state").select("id").order("id").range(page.from, page.to)),
    /down/,
  );
});
