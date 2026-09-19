/** The node page's "made of" section: decomposition place, primes under a node, and what waits on review for it. */
import test from "node:test";
import assert from "node:assert/strict";
import { decompose, penetration, type DepEdge } from "../src/lib/research-os/primes";
import { buildMakeup, type MakeupNode, type Snapshot } from "../src/lib/research-os/makeup";

const nodes: MakeupNode[] = [
  { id: "eq", slug: "equality", title: "Equality", branch: "01-mathematics" },
  { id: "vec", slug: "vectors", title: "Vectors", branch: "02-physics" },
  { id: "der", slug: "derivatives", title: "Derivatives", branch: "01-mathematics" },
  { id: "kin", slug: "kinematics", title: "Kinematics", branch: "02-physics" },
  { id: "dyn", slug: "dynamics", title: "Dynamics", branch: "02-physics" },
  { id: "lone", slug: "lonely", title: "Lonely idea", branch: "07-mind" },
];
// kin rests on vec and der; der rests on eq; dyn rests on kin and der.
const pre = (from: string, to: string): DepEdge => ({ fromId: from, toId: to, kind: "prerequisite" });
const edges = [pre("vec", "kin"), pre("der", "kin"), pre("eq", "der"), pre("kin", "dyn"), pre("der", "dyn")];
const dec = decompose(nodes, edges);
const snap: Snapshot = {
  dec,
  byId: new Map(nodes.map((n) => [n.id, n])),
  bySlug: new Map(nodes.map((n) => [n.slug, n])),
  reach: new Map(penetration(nodes, dec).map((p) => [p.id, p])),
};
const none = { proposals: [], missing: [], irreducible: null };

test("a composite lists its primes, the most-reached first, and what it rests on directly", () => {
  const m = buildMakeup("dyn", snap, none)!;
  assert.equal(m.status, "composite");
  assert.equal(m.primeCount, 2);
  // Equality reaches dynamics by two paths (through derivatives, and through kinematics then derivatives).
  assert.deepEqual(m.primes.map((p) => [p.slug, p.paths]), [["equality", 2], ["vectors", 1]]);
  assert.deepEqual(m.factors.map((f) => f.slug), ["derivatives", "kinematics"]);
  assert.equal(m.reach, null);
});

test("a prime lists no primes under it and says how far it reaches", () => {
  const m = buildMakeup("eq", snap, none)!;
  assert.equal(m.status, "prime");
  assert.equal(m.primeCount, 0);
  assert.deepEqual(m.reach, { composites: 3, branches: 2 });
});

test("pending proposals sort agreed first, name unknown factors by slug, and missing ideas carry this node's reason", () => {
  const m = buildMakeup("lone", snap, {
    proposals: [
      { id: "p1", from_slug: "vectors", verification: "refuted", refd: -0.1, cross_branch: true, in_cycle: false, confidence_source: "prime_decompose_llm" },
      { id: "p2", from_slug: "equality", verification: "confirmed", refd: 0.2, cross_branch: true, in_cycle: null, confidence_source: "prime_decompose_llm" },
      { id: "p3", from_slug: "concept-gone", verification: "unchecked", refd: null, cross_branch: false, in_cycle: true, confidence_source: "prime_decompose_llm" },
    ],
    missing: [{ key: "attention", title: "Attention", summary: "Selecting what to process.", reasons: { lonely: "It needs focus.", other: "x" } }],
    irreducible: { status: "pending", justification: "Nothing simpler." },
  })!;
  assert.equal(m.status, "unfactored");
  assert.deepEqual(m.proposals.map((p) => [p.id, p.factor.title]), [["p2", "Equality"], ["p3", "concept-gone"], ["p1", "Vectors"]]);
  assert.equal(m.proposals[1].factor.id, null);
  assert.equal(m.proposals[1].inCycle, true);
  assert.deepEqual(m.missing, [{ key: "attention", title: "Attention", summary: "Selecting what to process.", reason: "It needs focus." }]);
  assert.equal(m.irreducible?.status, "pending");
});

test("an unknown node has no makeup, and the prime list stops at the limit", () => {
  assert.equal(buildMakeup("nope", snap, none), null);
  assert.equal(buildMakeup("dyn", snap, none, 1)!.primes.length, 1);
  assert.equal(buildMakeup("dyn", snap, none, 1)!.primeCount, 2);
});
