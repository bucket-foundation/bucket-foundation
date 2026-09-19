/** The node page's "made of" section: decomposition place, primes under a node, and what waits on review for it. */
import test from "node:test";
import assert from "node:assert/strict";
import { decompose, factorMap, penetration, type DepEdge } from "../src/lib/research-os/primes";
import { buildMakeup, forgetMakeupSnapshot, liveCycles, makeupForViewer, makeupSnapshot, pairInGraph, pairStandings, snapshotFrom, type MakeupNode, type Snapshot } from "../src/lib/research-os/makeup";

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
  factors: factorMap(edges),
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
  assert.deepEqual(m.factors.map((f) => [f.slug, f.throughEvidence]), [["derivatives", false], ["kinematics", false]]);
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

test("the snapshot sees ideas under an idea through its evidence, and lists the evidence apart", () => {
  const rows: MakeupNode[] = [
    { id: "law", slug: "rayleigh-law", title: "Rayleigh scattering law", branch: "02-physics", kind: "law", provenanceType: "reference" },
    { id: "paper", slug: "rayleigh-1871", title: "Rayleigh 1871", branch: "02-physics", kind: "primary_source", provenanceType: "canon_paper" },
    { id: "size", slug: "size-vs-wavelength", title: "Scattering strength and particle size", branch: "02-physics", kind: "concept", provenanceType: "reference" },
    { id: "hidden", slug: "unlinked", title: "An unlinked idea", branch: "02-physics", kind: "concept", provenanceType: "reference" },
  ];
  const s = snapshotFrom(rows, [
    { fromId: "law", toId: "paper", kind: "derives_from" },
    { fromId: "size", toId: "paper", kind: "prerequisite" },
    { fromId: "hidden-elsewhere", toId: "law", kind: "prerequisite" },
  ]);
  const m = buildMakeup("law", s, none)!;
  assert.equal(m.status, "composite");
  assert.deepEqual(m.primes.map((p) => p.slug), ["size-vs-wavelength"]);
  assert.deepEqual(m.evidence.items.map((e) => e.slug), ["rayleigh-1871"]);
  assert.deepEqual(m.factors.map((f) => [f.slug, f.throughEvidence]), [["size-vs-wavelength", true]]);
  assert.equal(s.edges.length, 2, "edges to nodes outside the public set are dropped");
  assert.deepEqual(s.reach.get("size"), { id: "size", composites: 1, branches: 1, spread: 0 });
});

test("a pair the graph already implies, and a pair whose factor already rests on its target, are told apart", () => {
  // dyn rests on kin, kin rests on der, der rests on eq.
  assert.deepEqual(pairInGraph(snap, "equality", "dynamics"), { graphLoop: false, implied: true });
  assert.deepEqual(pairInGraph(snap, "dynamics", "equality"), { graphLoop: true, implied: false });
  assert.deepEqual(pairInGraph(snap, "lonely", "dynamics"), { graphLoop: false, implied: false });
  assert.deepEqual(pairInGraph(snap, "nope", "dynamics"), { graphLoop: false, implied: false });
});

test("a pending pair that confirmed pending pairs already lead to is flagged as a shortcut", () => {
  // Pending: vectors -> lonely, equality -> vectors, equality -> lonely. The last is a shortcut past the first two.
  const st = pairStandings(snap, [
    { from_slug: "vectors", to_slug: "lonely", verification: "confirmed" },
    { from_slug: "equality", to_slug: "vectors", verification: "confirmed" },
    { from_slug: "equality", to_slug: "lonely", verification: "refuted" },
  ]);
  assert.equal(st.get("equality->lonely")!.viaPending, true);
  assert.deepEqual(st.get("equality->lonely")!.through, [{ slug: "vectors", title: "Vectors" }], "the note names the chain it shortcuts");
  assert.deepEqual(st.get("vectors->lonely")!.through, [], "no chain, nothing named");
  // A chain through a refuted pair does not count.
  const weak = pairStandings(snap, [
    { from_slug: "vectors", to_slug: "lonely", verification: "refuted" },
    { from_slug: "equality", to_slug: "vectors", verification: "confirmed" },
    { from_slug: "equality", to_slug: "lonely", verification: "confirmed" },
  ]);
  assert.equal(weak.get("equality->lonely")!.viaPending, false);
  assert.equal(st.get("vectors->lonely")!.viaPending, false);
  assert.equal(st.get("equality->vectors")!.viaPending, false);
  // A pair the graph already implies is marked implied and not also a pending shortcut.
  const g = pairStandings(snap, [{ from_slug: "equality", to_slug: "dynamics" }]).get("equality->dynamics")!;
  assert.deepEqual(g, { graphLoop: false, implied: true, viaPending: false, through: [{ slug: "derivatives", title: "Derivatives" }] });
  // A loop with the graph names no chain, so the page never offers the shortcut note beside the loop warning.
  const loop = pairStandings(snap, [{ from_slug: "dynamics", to_slug: "equality" }]).get("dynamics->equality")!;
  assert.deepEqual(loop, { graphLoop: true, implied: false, viaPending: false, through: [] });
});

test("the shortest chain is the one named", () => {
  // dyn rests on kin and der, kin rests on der: dyn to eq runs through der alone.
  const st = pairStandings(snap, [{ from_slug: "equality", to_slug: "dynamics" }]);
  assert.deepEqual(st.get("equality->dynamics")!.through.map((t) => t.slug), ["derivatives"]);
  const s = pairStandings(snap, [{ from_slug: "vectors", to_slug: "dynamics" }]);
  assert.deepEqual(s.get("vectors->dynamics")!.through.map((t) => t.slug), ["kinematics"]);
});

test("the graph check follows chains through evidence", () => {
  const rows: MakeupNode[] = [
    { id: "a", slug: "law", title: "Law", branch: "b", kind: "law", provenanceType: "reference" },
    { id: "p", slug: "paper", title: "Paper", branch: "b", kind: "primary_source", provenanceType: "canon_paper" },
    { id: "c", slug: "idea", title: "Idea", branch: "b", kind: "concept", provenanceType: "reference" },
  ];
  // law rests on paper, paper rests on idea.
  const s2 = snapshotFrom(rows, [
    { fromId: "a", toId: "p", kind: "derives_from" },
    { fromId: "c", toId: "p", kind: "prerequisite" },
  ]);
  assert.deepEqual(pairInGraph(s2, "idea", "law"), { graphLoop: false, implied: true });
  assert.deepEqual(pairInGraph(s2, "law", "idea"), { graphLoop: true, implied: false });
});
