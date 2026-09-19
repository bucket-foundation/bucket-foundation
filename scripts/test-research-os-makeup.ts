/** The node page's "made of" section: decomposition place, primes under a node, and what waits on review for it. */
import test from "node:test";
import assert from "node:assert/strict";
import { decompose, penetration, type DepEdge } from "../src/lib/research-os/primes";
import { buildMakeup, forgetMakeupSnapshot, liveCycles, makeupForViewer, makeupSnapshot, type MakeupNode, type Snapshot } from "../src/lib/research-os/makeup";

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
  edges,
  evidence: new Map([["kin", [{ id: "f1", slug: "fact-motion", title: "A ball falls 4.9 m in the first second", branch: "02-physics" }]]]),
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

test("concurrent reads share one graph read, and a read an approval overtook is served once and never cached", async () => {
  let reads = 0;
  let release!: () => void;
  const gate = new Promise<void>((r) => (release = r));
  const slow = async () => {
    reads++;
    await gate;
    return snap;
  };
  forgetMakeupSnapshot();
  const a = makeupSnapshot({} as any, 60_000, slow);
  const b = makeupSnapshot({} as any, 60_000, slow);
  assert.equal(reads, 1, "the second request joins the first read");
  forgetMakeupSnapshot(); // an approval lands while the read runs
  const c = makeupSnapshot({} as any, 60_000, slow);
  assert.equal(reads, 2, "a request after the approval starts a fresh read");
  release();
  await Promise.all([a, b, c]);
  const d = makeupSnapshot({} as any, 60_000, slow);
  await d;
  assert.equal(reads, 2, "the fresh read was cached; the overtaken one was not");
  forgetMakeupSnapshot();
});

test("cycle flags come from the current pending set and the graph", () => {
  // derivatives -> equality exists as a pending pair; equality rests on nothing, derivatives rests on equality already.
  const loops = liveCycles(snap, [
    { from_slug: "derivatives", to_slug: "equality" },
    { from_slug: "vectors", to_slug: "lonely" },
  ]);
  assert.ok(loops.has("derivatives->equality"));
  assert.ok(!loops.has("vectors->lonely"));
  assert.equal(liveCycles(snap, [{ from_slug: "vectors", to_slug: "lonely" }]).size, 0);
});

test("a viewer who is not a reviewer gets the decomposition and counts, and no review data", () => {
  const full = buildMakeup("lone", snap, {
    proposals: [{ id: "p1", from_slug: "vectors", verification: "confirmed", refd: 0.2, cross_branch: true, in_cycle: false, confidence_source: "prime_decompose_llm" }],
    missing: [{ key: "attention", title: "Attention", summary: "s", reasons: { lonely: "r" } }],
    irreducible: { status: "pending", justification: "j" },
  })!;
  const counts = { proposals: 1, missing: 1, irreducible: true, truncated: false };
  const learner = makeupForViewer(full, counts, false);
  assert.equal(learner.canReview, false);
  assert.deepEqual([learner.makeup.proposals, learner.makeup.missing, learner.makeup.irreducible], [[], [], null]);
  assert.deepEqual(learner.pending, counts);
  assert.equal(learner.makeup.status, full.status);
  const confirmed = makeupForViewer({ ...full, irreducible: { status: "confirmed", justification: "j" } }, counts, false);
  assert.equal(confirmed.makeup.irreducible?.status, "confirmed");
  const reviewer = makeupForViewer(full, counts, true);
  assert.equal(reviewer.makeup.proposals.length, 1);
  assert.equal(reviewer.canReview, true);
});

test("an idea's evidence is listed apart from its primes", () => {
  const m = buildMakeup("kin", snap, none)!;
  assert.deepEqual(m.evidence, { count: 1, items: [{ id: "f1", slug: "fact-motion", title: "A ball falls 4.9 m in the first second", branch: "02-physics" }] });
  assert.ok(!m.primes.some((p) => p.id === "f1"));
  assert.deepEqual(buildMakeup("dyn", snap, none)!.evidence, { count: 0, items: [] });
});
