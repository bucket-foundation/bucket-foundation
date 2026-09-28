import test from "node:test";
import assert from "node:assert/strict";
import { loadPlan, practiceMastered, type ClosureNodeRow, type PlanStore } from "../src/lib/research-os/learning-plan-db";

function row(id: string, extra: Partial<ClosureNodeRow> = {}): ClosureNodeRow {
  return { id, slug: `s-${id}`, title: `T ${id}`, tier: 13, branch: "02-physics", provenance: { type: "academy_atom", atom_id: id, source: "learning/app/corpus/02-physics.json" }, visibility: "public", owner_id: null, ...extra };
}

function store(nodes: ClosureNodeRow[], edges: [string, string][], progress: Record<string, unknown> = {}, hidden: string[] = [], down = false): PlanStore & { reads: number } {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const s = {
    reads: 0,
    async nodeBySlug(slug: string) {
      return nodes.find((n) => n.slug === slug) ?? null;
    },
    async nodesByIds(ids: string[]) {
      return ids.map((id) => byId.get(id)).filter((n): n is ClosureNodeRow => Boolean(n));
    },
    async prerequisiteParents(ids: string[]) {
      s.reads++;
      return edges.filter(([, to]) => ids.includes(to)).map(([from_id, to_id]) => ({ from_id, to_id }));
    },
    async practiceProgress() {
      return progress;
    },
    async filterForViewer(ns: ClosureNodeRow[]) {
      if (down) return { ok: false as const };
      return { ok: true as const, ids: new Set(ns.filter((n) => !hidden.includes(n.id)).map((n) => n.id)) };
    },
  };
  return s;
}

const NODES = ["a", "b", "c", "t", "x"].map((id) => row(id));
const EDGES: [string, string][] = [["a", "b"], ["a", "c"], ["b", "t"], ["c", "t"], ["x", "a"]];

test("the closure crosses branches and the plan ends at the target", async () => {
  const nodes = NODES.map((n) => (n.id === "x" ? { ...n, branch: "01-mathematics" } : n));
  const r = await loadPlan(store(nodes, EDGES), "s-t", null);
  assert.equal(r.status, "plan");
  if (r.status !== "plan" || r.plan.status !== "ready") throw new Error(JSON.stringify(r));
  assert.deepEqual(r.plan.studyOrder, ["x", "a", "b", "c", "t"]);
  assert.equal(r.nodes.x.branch, "01-mathematics");
});

test("a hidden node anywhere in the closure gives one opaque unavailable", async () => {
  const r = await loadPlan(store(NODES, EDGES, {}, ["x"]), "s-t", "viewer");
  assert.deepEqual(r, { status: "unavailable" });
  assert.deepEqual(await loadPlan(store(NODES, EDGES, {}, [], true), "s-t", "viewer"), { status: "unavailable" });
  assert.deepEqual(await loadPlan(store(NODES, EDGES, {}, ["t"]), "s-t", "viewer"), { status: "not_found" });
  assert.deepEqual(await loadPlan(store(NODES, EDGES), "s-none", null), { status: "not_found" });
});

test("an edge to a node with no row is unavailable", async () => {
  const r = await loadPlan(store(NODES, [...EDGES, ["ghost", "x"]]), "s-t", null);
  assert.deepEqual(r, { status: "unavailable" });
});

test("closure caps return limit with no plan", async () => {
  const r = await loadPlan(store(NODES, EDGES), "s-t", null, { nodes: 3, edges: 100 });
  assert.equal(r.status, "limit");
  const e = await loadPlan(store(NODES, EDGES), "s-t", null, { nodes: 100, edges: 2 });
  assert.equal(e.status, "limit");
});

const strong = { stability: 400, reps: 5, lastReview: Date.now() };

test("practice mastery drops known nodes; anonymous viewers get none", async () => {
  const progress = { "02-physics": { cards: { x: strong, a: strong } } };
  const r = await loadPlan(store(NODES, EDGES, progress), "s-t", "viewer");
  if (r.status !== "plan" || r.plan.status !== "ready") throw new Error(JSON.stringify(r));
  assert.deepEqual(r.plan.studyOrder, ["b", "c", "t"]);
  assert.deepEqual(r.plan.ready, ["b", "c"]);
  const anon = await loadPlan(store(NODES, EDGES, progress), "s-t", null);
  if (anon.status !== "plan" || anon.plan.status !== "ready") throw new Error("anon");
  assert.equal(anon.plan.studyOrder.length, 5);
});

test("practice that skips a prerequisite is a mastery conflict", async () => {
  const r = await loadPlan(store(NODES, EDGES, { "02-physics": { cards: { b: strong } } }), "s-t", "viewer");
  assert.ok(r.status === "plan" && r.plan.status === "mastery_conflict");
});

test("weak cards and non-academy nodes never count as mastered", () => {
  const nodes = [
    { id: "a", slug: "a", title: "a", tier: 1, branch: "02-physics", learnHref: null, atom: { branchFile: "02-physics", atomId: "a" } },
    { id: "k", slug: "k", title: "k", tier: 1, branch: "02-physics", learnHref: null, atom: null },
  ];
  assert.deepEqual(Array.from(practiceMastered(nodes, { "02-physics": { cards: { a: { stability: 0.5 }, k: strong } } })), []);
  assert.deepEqual(Array.from(practiceMastered(nodes, { "02-physics": { cards: { a: strong } } })), ["a"]);
});

test("biophysics atoms map to the biophysics deck key", async () => {
  const bio = row("m", { branch: "05-biophysics", provenance: { type: "academy_atom", atom_id: "m", source: "learning/app/corpus/biophysics.json" } });
  const r = await loadPlan(store([bio], [], { biophysics: { cards: { m: strong } } }), "s-m", "viewer");
  assert.ok(r.status === "plan" && r.plan.status === "ready" && r.plan.studyOrder.length === 0);
});
