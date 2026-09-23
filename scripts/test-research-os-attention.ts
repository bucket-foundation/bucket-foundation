import test from "node:test";
import assert from "node:assert/strict";
import { answerAttend, attentionIndex, coneOf, parseAttendParams, phraseEntries, publicFactorIds, rankByAttention, type AttendDeps } from "../src/lib/research-os/attention";
import { snapshotFrom, type MakeupNode } from "../src/lib/research-os/makeup";
import { queryVectorOf } from "../src/lib/research-os/prime-algebra";
import type { DepEdge } from "../src/lib/research-os/primes";

const idea = (id: string, title: string, summary: string | null = null, branch = "02-physics"): MakeupNode & { summary: string | null } => ({
  id,
  slug: id,
  title,
  branch,
  kind: "concept",
  provenanceType: "academy_atom",
  summary,
});
const fact = (id: string): MakeupNode => ({ id, slug: id, title: id, branch: "02-physics", kind: "fact", provenanceType: "canon_fact" });
const pre = (from: string, to: string): DepEdge => ({ fromId: from, toId: to, kind: "prerequisite" });

const rows = [
  idea("vec", "Vectors", "Arrows with length and direction"),
  idea("der", "Derivatives", "Rates of change"),
  idea("prob", "Probability", "Chance of outcomes", "04-information"),
  idea("kin", "Kinematics", "Motion described with vectors and derivatives"),
  idea("dyn", "Dynamics", "Forces change motion"),
  idea("osc", "Oscillation", "Motion that repeats"),
  idea("stat", "Statistical mechanics", "Probability over many particles"),
  idea("gas", "Ideal gas", "Particles with random velocities"),
  idea("heat", "Heat engines", "Work from heat"),
  fact("f1"),
];
const edges = [
  pre("vec", "kin"),
  pre("der", "kin"),
  pre("kin", "dyn"),
  pre("der", "osc"),
  pre("vec", "osc"),
  pre("prob", "stat"),
  pre("vec", "gas"),
  pre("prob", "gas"),
  pre("stat", "heat"),
  pre("der", "heat"),
  pre("prob", "f1"),
];
const snap = snapshotFrom(rows, edges);

test("each term is the prime's product over qn times vn, and the terms add up to the cosine", () => {
  const r = rankByAttention(snap, { ids: ["kin"], cone: "show", k: 50 });
  assert.ok(r.hits.length > 0);
  const basis = attentionIndex(snap).basis;
  const q = queryVectorOf(basis, [{ id: "kin" }]);
  const qn = Math.sqrt(Array.from(q.values()).reduce((a, w) => a + w * w, 0));
  for (const h of r.hits) {
    const x = basis.vectors.get(h.id)!;
    const vn = basis.norms.get(h.id)!;
    const sum = h.terms.reduce((a, t) => a + t.term, 0);
    assert.ok(Math.abs(sum - h.score) < 1e-12, `${h.id}: ${sum} vs ${h.score}`);
    for (const t of h.terms) assert.ok(Math.abs(t.term - (q.get(t.id)! * x.get(t.id)!) / (qn * vn)) < 1e-12);
    for (let i = 1; i < h.terms.length; i++) assert.ok(h.terms[i - 1].term >= h.terms[i].term);
  }
});

test("the factor cone is hidden by default and shown on request", () => {
  assert.deepEqual(Array.from(coneOf(snap.dec, ["kin"])).sort(), ["der", "dyn", "vec"]);
  const hidden = rankByAttention(snap, { ids: ["kin"] });
  const shown = rankByAttention(snap, { ids: ["kin"], cone: "show" });
  const h = hidden.hits.map((x) => x.id);
  const s = shown.hits.map((x) => x.id);
  assert.ok(!h.includes("dyn") && s.includes("dyn"), "a dependent of the query is in its cone");
  assert.ok(h.includes("osc") && h.includes("gas"));
  assert.equal(hidden.masked, 1);
  assert.equal(shown.masked, 0);
  assert.ok(!s.includes("kin"), "a query node never ranks itself");
});

test("k caps the list", () => {
  assert.equal(rankByAttention(snap, { ids: ["kin"], cone: "show", k: 1 }).hits.length, 1);
});

test("a phrase enters through the ideas whose words it shares, weighted by the overlap", () => {
  const index = attentionIndex(snap);
  const entries = phraseEntries("probability over many particles", index);
  assert.equal(entries[0].id, "stat");
  assert.ok(entries.every((e) => e.score >= 0.1));
  assert.deepEqual(phraseEntries("zzz qqq", index), []);
  assert.ok(!phraseEntries("probability over many particles", index, { exclude: new Set(["stat"]) }).some((e) => e.id === "stat"));
  const one = rankByAttention(snap, { entries: [{ id: "stat", score: 0.5 }], cone: "show" });
  const plain = rankByAttention(snap, { ids: ["stat"], cone: "show" });
  assert.deepEqual(one.hits.map((h) => [h.id, h.score.toFixed(9)]), plain.hits.map((h) => [h.id, h.score.toFixed(9)]), "one weighted entry ranks as the node itself");
});

test("a private node's vector comes from its factor edges into public ideas", () => {
  const priv = "secret";
  const edgesOfPrivate = [
    { from_id: "vec", to_id: priv, kind: "prerequisite" },
    { from_id: priv, to_id: "prob", kind: "derives_from" },
    { from_id: "f1", to_id: priv, kind: "prerequisite" },
    { from_id: "other-private", to_id: priv, kind: "prerequisite" },
    { from_id: "der", to_id: priv, kind: "relates_to" },
    { from_id: priv, to_id: "heat", kind: "prerequisite" },
  ];
  assert.deepEqual(publicFactorIds(priv, edgesOfPrivate, snap), ["prob", "vec"]);
  const basis = attentionIndex(snap).basis;
  const fromFactors = queryVectorOf(basis, [{ id: "prob" }, { id: "vec" }]);
  const direct = queryVectorOf(basis, [{ id: "vec" }]);
  for (const [p, w] of Array.from(basis.vectors.get("prob")!)) direct.set(p, (direct.get(p) ?? 0) + w);
  assert.deepEqual(fromFactors, direct);
  const r = rankByAttention(snap, { privateFactors: [["prob", "vec"]], k: 50 });
  const ids = r.hits.map((h) => h.id);
  assert.ok(ids.includes("gas") && ids.includes("osc") && ids.includes("stat"), "the factors' other dependents still rank");
  assert.ok(!ids.includes("prob") && !ids.includes("vec") && !ids.includes(priv), "the private node's factors sit in its cone");
});

const deps = (over: Partial<AttendDeps> = {}): AttendDeps => ({
  snapshot: async () => snap,
  privateFactors: async (slugs, _s, learnerId) => (learnerId ? { factors: [["prob", "vec"]], denied: 0, missing: 0 } : { factors: [], denied: slugs.length, missing: 0 }),
  ...over,
});
const params = (s: string) => {
  const p = parseAttendParams(new URLSearchParams(s));
  if ("error" in p) throw new Error(p.error);
  return p;
};

test("parameters are capped and checked", () => {
  assert.deepEqual(parseAttendParams(new URLSearchParams("")), { error: "ids or q is required", status: 400 });
  assert.equal((parseAttendParams(new URLSearchParams(`ids=${Array.from({ length: 9 }, (_, i) => `a${i}`).join(",")}`)) as { status: number }).status, 400);
  assert.equal((parseAttendParams(new URLSearchParams(`q=${"x".repeat(201)}`)) as { status: number }).status, 400);
  assert.equal((parseAttendParams(new URLSearchParams("q=x&k=51")) as { status: number }).status, 400);
  assert.equal((parseAttendParams(new URLSearchParams("q=x&cone=all")) as { status: number }).status, 400);
  assert.deepEqual(params("ids=kin,kin,dyn&k=5"), { ids: ["kin", "dyn"], q: "", k: 5, cone: "hide" });
});

test("an anonymous caller gets public results and a denied count for a private id", async () => {
  const out = await answerAttend(params("ids=kin,secret"), null, deps());
  assert.ok(!("error" in out));
  if ("error" in out) return;
  assert.equal(out.denied, 1);
  assert.deepEqual(out.query.map((n) => n.slug), ["kin"]);
  assert.ok(out.hits.every((h) => h.slug !== "secret"));
});

test("a signed-in viewer's private node enters through its public factors", async () => {
  const out = await answerAttend(params("ids=secret"), "learner-1", deps());
  assert.ok(!("error" in out) && out.hits.length > 0);
});

test("the answer reports 404 and 503 plainly", async () => {
  assert.deepEqual(await answerAttend(params("ids=nowhere"), null, deps()), { error: "no query node resolved", status: 404 });
  assert.deepEqual(await answerAttend(params("q=zzz"), null, deps()), { error: "no query node resolved", status: 404 });
  const down = await answerAttend(params("ids=kin"), null, deps({ snapshot: async () => Promise.reject(new Error("down")) }));
  assert.deepEqual(down, { error: "graph_read_failed", status: 503 });
  const noAccess = await answerAttend(params("ids=secret"), "learner-1", deps({ privateFactors: async () => Promise.reject(new Error("down")) }));
  assert.deepEqual(noAccess, { error: "access_unavailable", status: 503 });
});

test("a phrase answer names its entries and marks the lexical entry", async () => {
  const out = await answerAttend(params("q=probability over many particles"), null, deps());
  assert.ok(!("error" in out));
  if ("error" in out) return;
  assert.equal(out.entry, "lexical");
  assert.equal(out.entries[0].slug, "stat");
  assert.ok(out.hits.every((h) => !out.entries.some((e) => e.id === h.id)));
});

test("the evaluation's measures and query picker hold on hand-worked cases", async () => {
  const { fuse, ndcgAt, pairedInterval, queryFor, recallAt } = await import("./research-os/eval-attention");
  const rel = new Set(["a", "c"]);
  assert.ok(Math.abs(ndcgAt(["a", "b", "c"], rel, 10) - (1 + 1 / 2) / (1 + 1 / Math.log2(3))) < 1e-12);
  assert.equal(ndcgAt(["b"], rel, 10), 0);
  assert.equal(recallAt(["a", "b"], rel, 20), 0.5);
  assert.deepEqual(fuse([["a", "b"], ["b", "c"]]), ["b", "a", "c"]);
  const same = pairedInterval([0.5, 0.2], [0.5, 0.2], "s", 50);
  assert.deepEqual(same, { mean: 0, interval: [0, 0] });
  assert.equal(queryFor("Kinematics", "### Intuition\n\nKinematics names motion in six words here. Picture a sprinter filmed from the side at speed."), "Picture a sprinter filmed from the side at speed.");
});
