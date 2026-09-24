import test from "node:test";
import assert from "node:assert/strict";
import { answerAttend, attentionIndex, centroid, coneOf, fuseRanks, nearestByVector, parseAttendParams, phraseEntries, publicFactorIds, rankByAttention, rankQuery, type AttendDeps, type NodeVectors } from "../src/lib/research-os/attention";
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
  assert.ok(entries.every((e) => e.score >= 0.05));
  assert.equal(entries.length, 1);
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
  vectors: async () => ({ vectors: new Map(), stale: 0 }),
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
  assert.deepEqual(params("ids=kin,kin,dyn&k=5"), { ids: ["kin", "dyn"], q: "", k: 5, cone: "hide", rank: null });
  assert.equal(params("ids=kin&rank=attention").rank, "attention");
  assert.equal((parseAttendParams(new URLSearchParams("ids=kin&rank=best")) as { status: number }).status, 400);
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

const unit = (xs: number[]) => {
  const n = Math.sqrt(xs.reduce((a, x) => a + x * x, 0));
  return xs.map((x) => x / n);
};
const vecs: NodeVectors = new Map([
  ["kin", unit([1, 0, 0])],
  ["dyn", unit([0.9, 0.1, 0])],
  ["osc", unit([0.2, 1, 0])],
  ["gas", unit([0, 0.3, 1])],
  ["stat", unit([0, 0, 1])],
  ["heat", unit([0.1, 0, 0.9])],
  ["vec", unit([0.8, 0.2, 0])],
]);

test("centroids, vector neighbours and rank fusion behave on a small case", () => {
  assert.deepEqual(centroid(vecs, [{ id: "kin" }, { id: "missing" }]), [1, 0, 0]);
  assert.equal(centroid(vecs, [{ id: "missing" }]), null);
  assert.deepEqual(nearestByVector(vecs, [1, 0, 0], new Set(["kin"]), 2).map((e) => e.id), ["dyn", "vec"]);
  assert.deepEqual(fuseRanks([["a", "b"], ["b", "c"]]).map((e) => e.id), ["b", "a", "c"]);
});

test("each rank mode orders by its own signal and keeps the prime terms as the reason", () => {
  const att = rankQuery(snap, vecs, { ids: ["kin"], cone: "show", rank: "attention" });
  assert.deepEqual(att.hits.map((h) => h.id), rankByAttention(snap, { ids: ["kin"], cone: "show", k: 50 }).hits.map((h) => h.id));
  const vec = rankQuery(snap, vecs, { ids: ["kin"], cone: "show", rank: "vector" });
  assert.deepEqual(vec.hits.slice(0, 2).map((h) => h.id), ["dyn", "vec"]);
  assert.ok(vec.hits.every((h, i) => i === 0 || vec.hits[i - 1].embedding! >= h.embedding!));
  const fused = rankQuery(snap, vecs, { ids: ["kin"], cone: "show", rank: "fused" });
  assert.equal(fused.hits[0].id, "dyn", "first in both lists");
  for (const h of fused.hits) {
    const sum = h.terms.reduce((a, t) => a + t.term, 0);
    if (h.attention !== null) assert.ok(Math.abs(sum - h.attention) < 1e-12);
    else assert.deepEqual(h.terms, []);
  }
  const hidden = rankQuery(snap, vecs, { ids: ["kin"], cone: "hide", rank: "vector" });
  assert.ok(!hidden.hits.some((h) => ["dyn", "vec", "der"].includes(h.id)), "the cone leaves the vector list too");
  assert.equal(rankQuery(snap, new Map(), { ids: ["kin"], rank: "vector" }).vectors, false);
});

test("concepts and phrases rank fused unless the caller asks", async () => {
  const d = deps({ vectors: async () => ({ vectors: vecs, stale: 0 }) });
  const concept = await answerAttend(params("ids=kin"), null, d);
  const phrase = await answerAttend(params("q=probability over many particles"), null, d);
  const flagged = await answerAttend(params("ids=kin&rank=attention"), null, d);
  assert.ok(!("error" in concept) && !("error" in phrase) && !("error" in flagged));
  if ("error" in concept || "error" in phrase || "error" in flagged) return;
  assert.equal(concept.rank, "fused");
  assert.equal(phrase.rank, "fused");
  assert.equal(flagged.rank, "attention");
  const down = await answerAttend(params("ids=kin"), null, deps({ vectors: async () => Promise.reject(new Error("down")) }));
  assert.ok(!("error" in down) && down.vectorsUnavailable && down.hits.length > 0);
});

test("the blind sheet merges both arms, drops arm labels and shuffles by seed", async () => {
  const { blindRows } = await import("./research-os/export-attention-labels");
  const a = blindRows({ embedding: ["x", "y"], product: ["y", "z"] }, "s");
  assert.deepEqual(a.items.slice().sort(), ["x", "y", "z"]);
  assert.deepEqual(a.from.y.sort(), ["embedding", "product"]);
  assert.deepEqual(blindRows({ embedding: ["x", "y"], product: ["y", "z"] }, "s").items, a.items);
});

test("vector loads ask only for the snapshot's node ids and reread them after the ttl", async () => {
  const { embeddingTextHash, vectorLoader } = await import("../src/lib/research-os/attention-db");
  const { embedText } = await import("../src/lib/research-os/attention");
  const current = (id: string) => embeddingTextHash(embedText(snap.byId.get(id)!.title, snap.summaries.get(id)));
  const asked: string[][] = [];
  let clock = 0;
  const load = vectorLoader(
    async (ids) => {
      asked.push(ids);
      return ids.filter((id) => id === "kin").map((id) => ({ node_id: id, text_hash: current(id), vector: [1, 0, 0] }));
    },
    1000,
    () => clock,
  );
  const first = await load(snap);
  assert.deepEqual(Array.from(first.vectors.keys()), ["kin"]);
  assert.deepEqual(asked, [Array.from(snap.byId.keys()).sort()]);
  clock = 500;
  await load(snap);
  assert.equal(asked.length, 1, "a warm cache reads nothing");
  clock = 1500;
  await load(snap);
  assert.equal(asked.length, 2, "an expired cache rereads");
  assert.ok(asked.flat().every((id) => snap.byId.has(id)), "no id outside the snapshot is read");
});

test("filtered vector loads rank exactly as the unfiltered read did, private query included", async () => {
  const { embeddingTextHash, freshVectors, vectorLoader } = await import("../src/lib/research-os/attention-db");
  const { embedText } = await import("../src/lib/research-os/attention");
  const hashOf = (id: string) => embeddingTextHash(embedText(snap.byId.get(id)!.title, snap.summaries.get(id)));
  const dims = 8;
  const unit = (seed: number) => {
    const v = Array.from({ length: dims }, (_, i) => Math.sin(seed * 7.3 + i * 1.7));
    const n = Math.sqrt(v.reduce((a, x) => a + x * x, 0));
    return v.map((x) => x / n);
  };
  const stored = rows.map((r, i) => ({ node_id: r.id, text_hash: r.id === "heat" ? "stale" : hashOf(r.id), vector: unit(i + 1) }));
  const vecOf = new Map(stored.map((r) => [r.node_id, r.vector]));
  const privateVector = vecOf.get("prob")!.map((x, i) => (x + vecOf.get("vec")![i]) / 2);
  const all = stored.concat(
    { node_id: "secret-draft", text_hash: "private", vector: privateVector },
    { node_id: "deleted-node", text_hash: "gone", vector: unit(99) },
  );
  const unfiltered = freshVectors(all, snap);
  const byId = new Map<string, typeof all>();
  for (const r of all) byId.set(r.node_id, (byId.get(r.node_id) ?? []).concat(r));
  const filtered = await vectorLoader(async (ids) => ids.flatMap((id) => byId.get(id) ?? []))(snap);
  assert.deepEqual(Array.from(filtered.vectors.entries()).sort(), Array.from(unfiltered.vectors.entries()).sort());
  assert.equal(filtered.stale, unfiltered.stale);
  assert.equal(unfiltered.stale, 1);
  assert.ok(!filtered.vectors.has("secret-draft") && !filtered.vectors.has("deleted-node"));

  const privateDeps = (v: typeof unfiltered) =>
    deps({ vectors: async () => v, privateFactors: async () => ({ factors: [["prob", "vec"]], denied: 0, missing: 0 }) });
  for (const q of ["ids=secret-draft", "ids=secret-draft&rank=vector", "ids=kin&rank=vector", "ids=kin", "q=motion%20vectors", "ids=secret-draft&cone=show"]) {
    const a = await answerAttend(params(q), "learner", privateDeps(unfiltered));
    const b = await answerAttend(params(q), "learner", privateDeps(filtered));
    assert.deepEqual(b, a, q);
  }
  for (const query of [{ ids: ["kin"] }, { privateFactors: [["prob", "vec"]] }, { ids: ["gas"], cone: "show" as const }]) {
    assert.deepEqual(rankByAttention(snap, { ...query, k: 50 }), rankByAttention(snap, { ...query, k: 50 }));
    assert.deepEqual(rankQuery(snap, filtered.vectors, { ...query, k: 50, rank: "fused" }), rankQuery(snap, unfiltered.vectors, { ...query, k: 50, rank: "fused" }));
  }
});

test("a stored vector whose text changed is skipped and counted as stale", async () => {
  const { embeddingTextHash, freshVectors } = await import("../src/lib/research-os/attention-db");
  const { embedText } = await import("../src/lib/research-os/attention");
  const current = (id: string) => embeddingTextHash(embedText(snap.byId.get(id)!.title, snap.summaries.get(id)));
  const rows = [
    { node_id: "kin", text_hash: current("kin"), vector: [1, 0, 0] },
    { node_id: "dyn", text_hash: embeddingTextHash(embedText("Dynamics", "an older summary")), vector: [0, 1, 0] },
    { node_id: "gone", text_hash: "x", vector: [0, 0, 1] },
  ];
  const { vectors, stale } = freshVectors(rows, snap);
  assert.deepEqual(Array.from(vectors.keys()), ["kin"]);
  assert.equal(stale, 1);
  const out = await answerAttend(params("ids=kin"), null, deps({ vectors: async (s) => freshVectors(rows, s) }));
  assert.ok(!("error" in out));
  if ("error" in out) return;
  assert.equal(out.staleVectors, 1);
  assert.ok(out.hits.every((h) => h.id !== "dyn" || h.embedding === null), "a stale node carries no text score");
});
