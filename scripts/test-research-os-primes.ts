/** Prime decomposition: factors, statuses, signatures, cycles, penetration. */
import test from "node:test";
import assert from "node:assert/strict";
import { contractedFactorEdges, decompose, factorMap, movesSince, penetration, summarize, type DepEdge } from "../src/lib/research-os/primes";

const pre = (from: string, to: string, confidence?: number): DepEdge => ({ fromId: from, toId: to, kind: "prerequisite", confidence });
const der = (from: string, to: string, confidence?: number): DepEdge => ({ fromId: from, toId: to, kind: "derives_from", confidence });

test("a prerequisite's from end and a derives_from's to end are the factors", () => {
  const f = factorMap([pre("eq", "linear"), der("ohm", "linear", 0.7), { fromId: "a", toId: "b", kind: "cites" }]);
  assert.deepEqual(Array.from(f.get("linear")!.keys()), ["eq"]);
  assert.equal(f.get("ohm")!.get("linear"), 0.7);
  assert.equal(f.has("b"), false);
});

test("duplicate factor edges keep the highest confidence and ignore self-loops", () => {
  const f = factorMap([pre("a", "b", 0.4), der("b", "a", 0.9), pre("c", "c")]);
  assert.equal(f.get("b")!.get("a"), 0.9);
  assert.equal(f.has("c"), false);
});

test("the equals sign is a prime every composite above it contains", () => {
  const nodes = ["eq", "num", "linear", "ohm", "lonely"].map((id) => ({ id, branch: id === "ohm" ? "02-physics" : "01-mathematics" }));
  const edges = [pre("eq", "linear"), pre("num", "linear"), der("ohm", "linear"), der("ohm", "eq")];
  const d = decompose(nodes, edges);
  assert.equal(d.get("eq")!.status, "prime");
  assert.equal(d.get("num")!.status, "prime");
  assert.equal(d.get("lonely")!.status, "unfactored");
  assert.equal(d.get("linear")!.status, "composite");
  assert.equal(d.get("linear")!.depth, 1);
  // ohm reaches eq twice: directly and through linear.
  assert.deepEqual(Object.fromEntries(d.get("ohm")!.signature), { eq: 2, num: 1 });
  assert.equal(d.get("ohm")!.tier, 2);
  const pen = penetration(nodes, d);
  assert.equal(pen[0].id, "eq");
  assert.equal(pen[0].composites, 2);
  assert.equal(pen[0].branches, 2);
  assert.ok(pen[0].spread > 0);
});

test("a diamond counts both paths to the shared prime", () => {
  const edges = [pre("p", "a"), pre("p", "b"), pre("a", "top"), pre("b", "top")];
  const d = decompose([], edges);
  assert.equal(d.get("top")!.signature.get("p"), 2);
  assert.equal(d.get("top")!.depth, 2);
});

test("a dependency cycle collapses into one unit whose members share a signature", () => {
  const edges = [pre("x", "y"), pre("y", "x"), pre("base", "x"), pre("y", "top")];
  const d = decompose([], edges);
  assert.equal(d.get("x")!.inCycle, true);
  assert.equal(d.get("y")!.inCycle, true);
  assert.equal(d.get("x")!.status, "composite");
  assert.deepEqual(Object.fromEntries(d.get("x")!.signature), { base: 1 });
  assert.deepEqual(Object.fromEntries(d.get("top")!.signature), { base: 1 });
  assert.equal(d.get("top")!.depth, 2);
});

test("a cycle with no outside factors is a prime cluster", () => {
  const d = decompose([], [pre("x", "y"), pre("y", "x")]);
  assert.equal(d.get("x")!.status, "prime");
  assert.deepEqual(Object.fromEntries(d.get("x")!.signature), { x: 1, y: 1 });
});

test("summary counts statuses and tiers", () => {
  const d = decompose([{ id: "solo" }], [pre("p", "a"), pre("a", "b")]);
  const s = summarize(d);
  assert.equal(s.nodes, 4);
  assert.equal(s.prime, 1);
  assert.equal(s.composite, 2);
  assert.equal(s.unfactored, 1);
  assert.deepEqual(s.tiers, [1, 1, 1]);
  assert.equal(s.maxDepth, 2);
});

test("a long chain decomposes without recursion limits", () => {
  const edges: DepEdge[] = [];
  for (let i = 0; i < 20000; i++) edges.push(pre(`n${i}`, `n${i + 1}`));
  const d = decompose([], edges);
  assert.equal(d.get("n20000")!.depth, 20000);
  assert.deepEqual(Object.fromEntries(d.get("n20000")!.signature), { n0: 1 });
});

test("moves since an earlier run: a prime that gains a factor, a new base idea, and nodes that join", () => {
  const before = decompose([{ id: "lonely" }], [pre("kin", "dyn")]);
  const prior = Array.from(before.values()).map((d) => ({ id: d.id, status: d.status, depth: d.depth }));
  // A new base idea "eq" now sits under "kin", and "lonely" rests on "kin".
  const after = decompose([{ id: "lonely" }], [pre("kin", "dyn"), pre("eq", "kin"), pre("kin", "lonely")]);
  const m = movesSince(prior, after);
  assert.deepEqual(m.decomposed, ["kin"]);
  assert.deepEqual(m.newPrimes.sort(), ["eq"]);
  assert.deepEqual(m.joined.sort(), ["eq", "lonely"]);
  assert.equal(m.deeper, 1);
  assert.equal(m.shallower, 0);
});

test("contracted edges carry an idea through facts to the next idea, and stop there", () => {
  const der = (from: string, to: string, confidence = 1): DepEdge => ({ fromId: from, toId: to, kind: "derives_from", confidence });
  // law rests on paper (derives_from), paper rests on wave (prerequisite wave -> paper),
  // wave rests on fact2, fact2 rests on base; fact3 and fact4 loop on each other under law.
  const edges: DepEdge[] = [
    der("law", "paper", 0.9),
    { fromId: "wave", toId: "paper", kind: "prerequisite", confidence: 0.7 },
    der("wave", "fact2"),
    der("fact2", "base"),
    der("law", "fact3"),
    der("fact3", "fact4"),
    der("fact4", "fact3"),
  ];
  const keep = new Set(["law", "wave", "base"]);
  const out = contractedFactorEdges(keep, edges).map((e) => `${e.fromId}->${e.toId}@${e.confidence}`).sort();
  // law rests on wave through the paper at the lower confidence; wave rests on base through fact2;
  // law does not reach base directly, since wave, an idea, stands between them.
  assert.deepEqual(out, ["base->wave@1", "wave->law@0.7"]);
});
