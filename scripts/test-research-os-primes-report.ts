import test from "node:test";
import assert from "node:assert/strict";
import { NON_IDEA_REPORT_KINDS } from "../src/lib/research-os/idea";
import { buildPrimesReport, forgetPrimesReport, loadPrimesReport, pendingPairIds, readPrimesInputs, type PrimesReport, type ReportEdge, type ReportNode } from "../src/lib/research-os/primes-report";

const node = (id: string, kind = "concept", branch = "02-physics"): ReportNode => ({ id, slug: id, title: id.toUpperCase(), kind, branch });

const nodes = [node("p1"), node("p2", "concept", "01-mathematics"), node("c"), node("top"), node("u", "artifact")];
const edges: ReportEdge[] = [
  { from_id: "p1", to_id: "c", kind: "prerequisite", confidence: 0.9 },
  { from_id: "c", to_id: "p2", kind: "derives_from", confidence: 1 },
  { from_id: "top", to_id: "c", kind: "derives_from", confidence: 1 },
  { from_id: "p2", to_id: "top", kind: "prerequisite", confidence: 0.8 },
  { from_id: "c", to_id: "u", kind: "relates_to", confidence: 1 },
  { from_id: "p1", to_id: "gone", kind: "prerequisite", confidence: 1 },
];

test("counts primes, composites and unfactored nodes", () => {
  const r = buildPrimesReport(nodes, edges, new Set(), { now: new Date("2026-09-21T00:00:00Z") });
  assert.equal(r.summary.nodes, 5);
  assert.equal(r.summary.prime, 2);
  assert.equal(r.summary.composite, 2);
  assert.equal(r.summary.unfactored, 1);
  assert.deepEqual(r.unfactoredByKind, [{ kind: "artifact", count: 1 }]);
  assert.equal(r.generatedAt, "2026-09-21T00:00:00.000Z");
});

test("ranks the deepest composite first and links by slug", () => {
  const r = buildPrimesReport(nodes, edges, new Set());
  assert.equal(r.deepest[0].slug, "top");
  assert.ok(r.deepest[0].depth > r.deepest[1].depth);
  assert.equal(r.deepest[0].primes, 2);
  assert.equal(r.widest.length, 2);
});

test("penetration puts the prime both composites rest on first", () => {
  const r = buildPrimesReport(nodes, edges, new Set());
  const top = r.penetrating[0];
  assert.equal(top.composites, 2);
  assert.ok(["p1", "p2"].includes(top.slug ?? ""));
});

test("confirmed irreducible primes, and confirmed nodes that gained factors", () => {
  const r = buildPrimesReport(nodes, edges, new Set(["p1", "c"]));
  assert.equal(r.confirmedIrreducible.count, 1);
  assert.equal(r.confirmedIrreducible.of, 2);
  assert.deepEqual(r.reviewAgain.map((n) => n.slug), ["c"]);
});

test("an empty graph gives an empty report", () => {
  const r = buildPrimesReport([], [], new Set());
  assert.equal(r.summary.nodes, 0);
  assert.equal(r.penetrating.length, 0);
  assert.equal(r.deepest.length, 0);
});

test("the algebra sections: coverage, unexplored combinations, primes that travel together, implied factors, reach", () => {
  const r0 = buildPrimesReport(nodes, edges, new Set());
  assert.deepEqual(r0.algebra.coverage.map((c) => c.s), [1, 2]);
  assert.ok(Math.abs(r0.algebra.coverage[0].coverage - 1 / 6 / 1) < 1e-12);
  assert.deepEqual(r0.algebra.reach[0].coefficients, [0, 1, 1]);

  const ns = [node("a"), node("b"), node("c"), node("m", "concept", "01-mathematics"), ...["x", "y", "z", "w", "v"].map((id) => node(id))];
  const pre = (from: string, to: string): ReportEdge => ({ from_id: from, to_id: to, kind: "prerequisite", confidence: 1 });
  const es = [...["x", "y", "z"].flatMap((c) => [pre("a", c), pre("b", c)]), pre("c", "w"), pre("m", "v")];
  const r = buildPrimesReport(ns, es, new Set()).algebra;
  assert.equal(r.frontier.pairs, 5);
  assert.equal(r.frontier.withinBranch, 2);
  assert.deepEqual(r.frontier.topWithinBranch.map((x) => x.primes.map((p) => p.slug).join("+")).sort(), ["a+c", "b+c"]);
  assert.equal(r.frontier.top.length, 5);
  assert.deepEqual(r.implied.map((x) => `${x.node.slug}->${x.factor.slug}:${x.mutual}`), ["a->b:true"]);
  assert.deepEqual(r.together.map((x) => `${x.a.slug}${x.b.slug}`), ["ab"]);
});

test("primes with no branch never share a branch in the unexplored list", () => {
  const ns = [{ ...node("a"), branch: null }, { ...node("b"), branch: null }, node("x"), node("y")];
  const pre = (from: string, to: string): ReportEdge => ({ from_id: from, to_id: to, kind: "prerequisite", confidence: 1 });
  const r = buildPrimesReport(ns, [pre("a", "x"), pre("b", "y")], new Set()).algebra;
  assert.equal(r.frontier.pairs, 1);
  assert.equal(r.frontier.withinBranch, 0);
});

test("the report is read once a minute, shared by concurrent loads, and forgotten after a decision", async () => {
  forgetPrimesReport();
  let reads = 0;
  const read = async () => {
    reads++;
    await new Promise((r) => setTimeout(r, 5));
    return buildPrimesReport(nodes, edges, new Set());
  };
  const svc = {} as Parameters<typeof loadPrimesReport>[0];
  const [a, b] = await Promise.all([loadPrimesReport(svc, 60_000, read), loadPrimesReport(svc, 60_000, read)]);
  assert.equal(a, b);
  assert.equal(reads, 1);
  const c: PrimesReport = await loadPrimesReport(svc, 60_000, read);
  assert.equal(c, a);
  forgetPrimesReport();
  await loadPrimesReport(svc, 60_000, read);
  assert.equal(reads, 2);
  forgetPrimesReport();
});

test("confirmed pending pairs mark the nonfaces they would close as missing edges", () => {
  const ns = [node("a"), node("b", "concept", "01-mathematics"), node("x"), node("y")];
  const pre = (from: string, to: string): ReportEdge => ({ from_id: from, to_id: to, kind: "prerequisite", confidence: 1 });
  const es = [pre("a", "x"), pre("b", "y")];
  const without = buildPrimesReport(ns, es, new Set(), { nullDraws: 50 }).algebra.frontier;
  assert.deepEqual(without.gaps.counts, { missing_edge: 0, chance: 1, real: 0 });
  assert.equal(without.top[0].gap, "chance");
  assert.equal(without.gaps.draws, 50);
  const pending = pendingPairIds(ns, [
    { from_slug: "b", to_slug: "a" },
    { from_slug: "b", to_slug: "gone" },
  ]);
  assert.deepEqual(pending, [{ from_id: "b", to_id: "a" }]);
  const withPairs = buildPrimesReport(ns, es, new Set(), { nullDraws: 50, pendingConfirmed: pending }).algebra.frontier;
  assert.deepEqual(withPairs.gaps.counts, { missing_edge: 1, chance: 0, real: 0 });
  assert.equal(withPairs.gaps.counterfactualPairs, 1);
  assert.equal(withPairs.top[0].gap, "missing_edge");
  assert.match(withPairs.top[0].p, /^(<0\.02|[01]\.\d+)$/);
});

type Row = Record<string, unknown>;

class FakeQuery {
  private preds: ((r: Row) => boolean)[] = [];
  private slice: [number, number] = [0, Number.MAX_SAFE_INTEGER];
  constructor(private rows: Row[]) {}
  select() { return this; }
  order() { return this; }
  range(from: number, to: number) { this.slice = [from, to]; return this; }
  eq(col: string, v: unknown) { this.preds.push((r) => r[col] === v); return this; }
  neq(col: string, v: unknown) { this.preds.push((r) => r[col] !== v); return this; }
  is(col: string, v: unknown) { this.preds.push((r) => (r[col] ?? null) === v); return this; }
  in(col: string, vs: unknown[]) { this.preds.push((r) => vs.includes(r[col])); return this; }
  not(col: string, op: string, list: string) {
    assert.equal(op, "in");
    const vs = list.replace(/^\(|\)$/g, "").split(",");
    this.preds.push((r) => !vs.includes(String(r[col])));
    return this;
  }
  then<R>(done: (v: { data: Row[]; error: null }) => R) {
    const data = this.rows.filter((r) => this.preds.every((p) => p(r))).slice(this.slice[0], this.slice[1] + 1);
    return Promise.resolve({ data, error: null }).then(done);
  }
}

test("an event node never enters the primes inputs, so unfactoredByKind is unchanged", async () => {
  const tables: Record<string, Row[]> = {
    nodes: [...nodes, node("battle-of-marathon", "event", "00-history")].map((n) => ({ ...n, visibility: "public", superseded_by: null })),
    edges: edges.map((e, i) => ({ id: `e${i}`, ...e })),
    irreducible_proposals: [],
    edge_proposals: [],
  };
  const svc = { from: (t: string) => new FakeQuery(tables[t] ?? []) } as unknown as Parameters<typeof readPrimesInputs>[0];
  const x = await readPrimesInputs(svc);
  assert.ok(!x.nodeRows.some((n) => n.kind === "event"));
  const r = buildPrimesReport(x.nodeRows, x.edgeRows, x.irreducible);
  assert.equal(r.summary.nodes, 5);
  assert.deepEqual(r.unfactoredByKind, [{ kind: "artifact", count: 1 }]);
});

test("the six evolution kinds never enter the primes inputs, so unfactoredByKind is pinned", async () => {
  const work = ["occupation", "task", "technology", "software", "discovery", "topic"].map((k) => node(`evo-${k}`, k, "11-work"));
  const tables: Record<string, Row[]> = {
    nodes: [...nodes, node("battle-of-marathon", "event", "00-history"), ...work].map((n) => ({ ...n, visibility: "public", superseded_by: null })),
    edges: [...edges, { from_id: "evo-occupation", to_id: "evo-task", kind: "performs", confidence: 1 }].map((e, i) => ({ id: `e${i}`, ...e })),
    irreducible_proposals: [],
    edge_proposals: [],
  };
  const svc = { from: (t: string) => new FakeQuery(tables[t] ?? []) } as unknown as Parameters<typeof readPrimesInputs>[0];
  const x = await readPrimesInputs(svc);
  assert.deepEqual(x.nodeRows.map((n) => n.kind).filter((k) => !["concept", "artifact"].includes(k ?? "")), []);
  assert.ok(!x.edgeRows.some((e) => e.kind === "performs"));
  const r = buildPrimesReport(x.nodeRows, x.edgeRows, x.irreducible);
  assert.equal(r.summary.nodes, 5);
  assert.deepEqual(r.unfactoredByKind, [{ kind: "artifact", count: 1 }]);
});

test("NON_IDEA_REPORT_KINDS names event and the six evolution kinds", () => {
  assert.deepEqual([...NON_IDEA_REPORT_KINDS].sort(), ["discovery", "event", "occupation", "software", "task", "technology", "topic"]);
});
