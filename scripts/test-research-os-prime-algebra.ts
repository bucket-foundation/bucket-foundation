import test from "node:test";
import assert from "node:assert/strict";
import { decompose, type DepEdge } from "../src/lib/research-os/primes";
import { attend, coverage, depthPolynomials, firstPrimes, frontier, implications, leibnizPrimes, pmiPairs, primeBasis, withinGroup } from "../src/lib/research-os/prime-algebra";

const pre = (from: string, to: string): DepEdge => ({ fromId: from, toId: to, kind: "prerequisite" });
const near = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-9, `${a} vs ${b}`);

const graph = decompose([], [pre("a", "u"), pre("b", "u"), pre("a", "v"), pre("b", "v"), pre("a", "w"), pre("c", "w"), pre("c", "t"), pre("u", "top")]);

test("idf and vectors follow the composites that hold each prime", () => {
  const b = primeBasis(graph);
  assert.equal(b.composites, 5);
  assert.deepEqual(Object.fromEntries(b.df), { a: 4, b: 3, c: 2 });
  near(b.idf.get("a")!, Math.log(6 / 5));
  near(b.idf.get("c")!, Math.log(2));
  near(b.vectors.get("w")!.get("c")!, Math.log(2) * Math.log(2));
});

test("attention ranks by cosine in the prime basis and softmaxes with temperature", () => {
  const ia = Math.log(6 / 5);
  const ib = Math.log(6 / 4);
  const ic = Math.log(2);
  const cosW = (ia * ia) / (Math.sqrt(ia * ia + ib * ib) * Math.sqrt(ia * ia + ic * ic));
  const out = attend(graph, ["u"], { tau: 0.5 });
  assert.deepEqual(out.map((x) => x.id), ["v", "top", "w"]);
  near(out[0].score, 1);
  near(out[2].score, cosW);
  const z = 2 * Math.exp(0) + Math.exp((cosW - 1) / 0.5);
  near(out[0].weight, 1 / z);
  near(out[2].weight, Math.exp((cosW - 1) / 0.5) / z);
  assert.deepEqual(out[1].sharedPrimes, ["b", "a"]);
  assert.deepEqual(out[2].sharedPrimes, ["a"]);
  assert.equal(attend(graph, ["u"], { k: 1 }).length, 1);
});

test("a query of several nodes sums their vectors", () => {
  const out = attend(graph, ["w", "t"]);
  const ids = out.map((x) => x.id);
  assert.ok(!ids.includes("w") && !ids.includes("t"));
  assert.deepEqual(ids, ["u", "v", "top"]);
  assert.deepEqual(out[0].sharedPrimes, ["a"]);
});

test("equal scores break by depth, then by the tie-break given", () => {
  assert.deepEqual(attend(graph, ["u"]).map((x) => x.id), ["v", "top", "w"]);
  assert.deepEqual(attend(graph, ["u"], { tieBreak: (a, b) => b.localeCompare(a) }).map((x) => x.id), ["v", "top", "w"]);
  assert.deepEqual(attend(graph, ["w"], { tieBreak: (a, b) => b.localeCompare(a) }).slice(1).map((x) => x.id), ["v", "u", "top"]);
});

test("a node with no primes attends to nothing", () => {
  const d = decompose([{ id: "lonely" }], [pre("a", "u")]);
  assert.deepEqual(attend(d, ["lonely"]), []);
  assert.deepEqual(attend(d, ["missing"]), []);
});

test("Leibniz numbers give the most penetrating prime 2", () => {
  assert.deepEqual(firstPrimes(6), [2, 3, 5, 7, 11, 13]);
  const lp = leibnizPrimes(graph);
  assert.deepEqual(lp.map((p) => `${p.id}=${p.q}`), ["a=2", "b=3", "c=5"]);
});

test("coverage is the Dirichlet series over distinct supports divided by the Euler product less the empty set", () => {
  const c1 = coverage(graph, 1);
  assert.equal(c1.supports, 3);
  near(Math.exp(c1.logD), 1 / 6 + 1 / 10 + 1 / 5);
  near(Math.exp(c1.logClosure), 2.4 - 1);
  near(c1.coverage, (1 / 6 + 1 / 10 + 1 / 5) / 1.4);
  const c2 = coverage(graph, 2);
  near(c2.coverage, (1 / 36 + 1 / 100 + 1 / 25) / ((1 + 1 / 4) * (1 + 1 / 9) * (1 + 1 / 25) - 1));
  const full = decompose([], [pre("a", "x"), pre("b", "x"), pre("a", "y"), pre("b", "z")]);
  near(coverage(full, 1).coverage, 1);
});

test("coverage stays finite where the plain product would underflow", () => {
  const edges: DepEdge[] = [];
  for (let i = 0; i < 200; i++) edges.push(pre(`p${i}`, "big"));
  const c = coverage(decompose([], edges), 4);
  const logN = firstPrimes(200).reduce((t, q) => t + Math.log(q), 0);
  assert.ok(Math.exp(-4 * logN) === 0);
  near(c.logD, -4 * logN);
  assert.ok(Number.isFinite(c.logClosure));
});

test("minimal nonfaces: a pair never combined, ranked by expected count", () => {
  const f = frontier(graph);
  assert.equal(f.pairs, 1);
  assert.equal(f.triples, 0);
  assert.deepEqual(f.nonfaces[0].primes, ["b", "c"]);
  near(f.nonfaces[0].expected, 5 * (3 / 5) * (2 / 5));
  assert.equal(f.expectedAtLeastOne, 1);
  const branch = (m: Record<string, string>) => (p: string) => m[p];
  assert.equal(withinGroup(f.nonfaces, branch({ a: "m", b: "m", c: "p" })).length, 0);
  assert.equal(withinGroup(f.nonfaces, branch({ a: "m", b: "p", c: "p" })).length, 1);
});

test("minimal nonfaces: a triple whose pairs all occur", () => {
  const d = decompose([], [pre("a", "x"), pre("b", "x"), pre("b", "y"), pre("c", "y"), pre("a", "z"), pre("c", "z")]);
  const f = frontier(d);
  assert.equal(f.pairs, 0);
  assert.equal(f.triples, 1);
  assert.deepEqual(f.nonfaces[0].primes, ["a", "b", "c"]);
  near(f.nonfaces[0].expected, 3 * (2 / 3) ** 3);
  assert.equal(f.expectedAtLeastOne, 0);
  assert.equal(frontier(d, 2).triples, 0);
});

test("a triple held by one composite is a face", () => {
  const d = decompose([], [pre("a", "x"), pre("b", "x"), pre("c", "x")]);
  assert.equal(frontier(d).nonfaces.length, 0);
});

test("PMI over prime pairs", () => {
  const all = pmiPairs(graph, 1);
  assert.deepEqual(all.map((p) => `${p.a}${p.b}`), ["ab", "ac"]);
  near(all[0].pmi, Math.log((3 * 5) / (4 * 3)));
  near(all[1].pmi, Math.log((1 * 5) / (4 * 2)));
  assert.deepEqual(pmiPairs(graph).map((p) => `${p.a}${p.b}`), ["ab"]);
});

test("full-support implications propose a factor", () => {
  assert.deepEqual(implications(graph), [{ node: "b", factor: "a", support: 3, mutual: false }]);
  const d = decompose([], ["x", "y", "z"].flatMap((c) => [pre("p", c), pre("q", c)]));
  assert.deepEqual(implications(d), [
    { node: "p", factor: "q", support: 3, mutual: true },
    { node: "q", factor: "p", support: 3, mutual: true },
  ]);
  assert.deepEqual(implications(d, 4), []);
});

test("depth polynomials: coefficients, penetration and mean reach depth", () => {
  const polys = Object.fromEntries(depthPolynomials(graph).map((p) => [p.id, p]));
  assert.deepEqual(polys.a.coefficients, [0, 3, 1]);
  assert.equal(polys.a.penetration, 4);
  near(polys.a.meanDepth, 5 / 4);
  assert.equal(polys.a.degree, 2);
  assert.deepEqual(polys.c.coefficients, [0, 2]);
  near(polys.c.meanDepth, 1);
  assert.deepEqual(depthPolynomials(graph).map((p) => p.id), ["a", "b", "c"]);
});

test("an empty graph yields empty results", () => {
  const d = decompose([], []);
  assert.deepEqual(frontier(d).nonfaces, []);
  assert.deepEqual(pmiPairs(d), []);
  assert.deepEqual(implications(d), []);
  assert.deepEqual(depthPolynomials(d), []);
  assert.equal(coverage(d, 1).coverage, 0);
});
