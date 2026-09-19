/** Decompose-further queue: targets, shortlist, prompt, parsing, proposals. */
import test from "node:test";
import assert from "node:assert/strict";
import { decompose, type DepEdge } from "../src/lib/research-os/primes";
import {
  agreementStats,
  answeringModel,
  applyVerdicts,
  clipText,
  ideaLayer,
  irreducibleAction,
  modelMatchesAlias,
  reuseEarlierKeys,
  aggregateMissing,
  blindSet,
  buildConsolidatePrompt,
  buildPrompt,
  buildVerifyPrompt,
  confidenceFor,
  consolidate,
  cosine,
  cyclicPairs,
  headNoun,
  idfOf,
  impactOf,
  isCandidateIdea,
  isIdea,
  lexicalScore,
  matchBase,
  missingKey,
  parseAnswer,
  parseConsolidation,
  parseVerdicts,
  selectTargets,
  shortlist,
  stem,
  toProposals,
  verificationOf,
  CONFIDENCE_SOURCE,
  promptHash,
  type Candidate,
  type GraphNode,
  type NodeProposalRow,
  type ProposalRow,
} from "../src/lib/research-os/decompose-further";
import { DISAGREEMENT_CONFIDENCE, INFERRED_CONFIDENCE_MAX, INFERRED_CONFIDENCE_MIN } from "../src/lib/research-os/inference/calibration";

const node = (id: string, branch: string, kind = "concept", title = id, provenanceType = "academy_atom"): GraphNode => ({ id, slug: id, title, kind, branch, summary: null, provenanceType });
const pre = (from: string, to: string): DepEdge => ({ fromId: from, toId: to, kind: "prerequisite" });

const nodes = [
  node("kinematics", "02-physics", "concept", "Kinematics, describing motion"),
  node("velocity", "02-physics", "concept", "Velocity and acceleration"),
  node("newton", "02-physics", "concept", "Newton's laws of motion"),
  node("sets", "01-mathematics", "concept", "Sets and functions"),
  node("functions", "01-mathematics", "concept", "Functions and their graphs"),
  node("lonely", "03-chemistry", "concept", "Chemical equilibrium and motion of molecules"),
  node("paper", "02-physics", "primary_source", "A paper"),
  node("euler-tag", "01-mathematics", "concept", "Euler", "canon_concept"),
  node("bridge", "02-physics", "concept", "Bridge: Einstein across 6 branches", "canon_bridge"),
  node("base-equality", "01-mathematics", "concept", "Equality", "node_proposal"),
];
const edges = [pre("kinematics", "velocity"), pre("velocity", "newton"), pre("sets", "functions")];
const dec = decompose(nodes, edges);
const pool: Candidate[] = nodes.map((n) => ({ ...n, tier: dec.get(n.id)!.status === "unfactored" ? null : dec.get(n.id)!.tier, prime: dec.get(n.id)!.status === "prime" }));

test("targets are primes and unfactored ideas, primes first, sources skipped", () => {
  const t = selectTargets(nodes, dec);
  assert.deepEqual(t.map((x) => [x.slug, x.status]), [["kinematics", "prime"], ["sets", "prime"], ["base-equality", "unfactored"], ["lonely", "unfactored"]]);
});

test("the shortlist spans branches and leaves out nodes that rest on the target", () => {
  const target = selectTargets(nodes, dec).find((t) => t.slug === "kinematics")!;
  const s = shortlist(target, pool, dec).map((c) => c.slug);
  assert.ok(s.includes("sets"), "a prime from another branch is offered");
  assert.ok(s.includes("functions"), "a tier-1 node from another branch is offered");
  assert.ok(!s.includes("velocity") && !s.includes("newton"), "nodes resting on kinematics would close a cycle");
  assert.ok(!s.includes("kinematics") && !s.includes("paper"));
});

test("lexical neighbours join the shortlist for an unfactored target", () => {
  const target = selectTargets(nodes, dec).find((t) => t.slug === "lonely")!;
  const s = shortlist(target, pool, dec).map((c) => c.slug);
  assert.ok(s.includes("newton"), "shares the word motion");
});

test("the prompt lists every candidate and asks for JSON", () => {
  const target = selectTargets(nodes, dec)[0];
  const p = buildPrompt(target, shortlist(target, pool, dec));
  assert.match(p, /Node: Kinematics, describing motion/);
  assert.match(p, /- sets \| 01-mathematics \| Sets and functions/);
  assert.match(p, /Answer with JSON only/);
});

test("parsing keeps shortlisted factors only, drops the target and duplicates, and caps lists", () => {
  const allowed = new Set(["sets", "functions"]);
  const reply = `Here you go: {"irreducible": false, "factors": [{"slug": "sets", "why": "motion is a function of time"}, {"slug": "sets", "why": "dup"}, {"slug": "kinematics", "why": "self"}, {"slug": "made-up", "why": "not offered"}, {"slug": "functions", "why": "position over time"}], "missing": [{"title": "Measurement", "branch": "02-physics", "why": "quantities"}, {"title": "", "branch": "x", "why": "empty"}]}`;
  const a = parseAnswer(reply, allowed, "kinematics");
  assert.ok(!("error" in a));
  if ("error" in a) return;
  assert.deepEqual(a.factors.map((f) => f.slug), ["sets", "functions"]);
  assert.deepEqual(a.missing.map((m) => m.title), ["Measurement"]);
  assert.equal(a.irreducible, false);
});

test("irreducible holds only when no factor survives", () => {
  const a = parseAnswer('{"irreducible": true, "factors": [{"slug": "sets", "why": "x"}], "missing": []}', new Set(["sets"]), "t");
  assert.ok(!("error" in a) && a.irreducible === false);
  const b = parseAnswer('{"irreducible": true, "factors": [], "missing": []}', new Set(), "t");
  assert.ok(!("error" in b) && b.irreducible === true);
});

test("a reply with no JSON is an error", () => {
  assert.ok("error" in parseAnswer("I cannot help with that.", new Set(), "t"));
  assert.ok("error" in parseAnswer("{not json}", new Set(), "t"));
});

test("proposals carry the verifier's verdict as agreement and confidence, plus impact and branch crossing", () => {
  const target = selectTargets(nodes, dec)[0];
  const answer = { irreducible: false, factors: [{ slug: "sets", why: "time as a function" }, { slug: "functions", why: "position over time" }], missing: [] };
  const verdicts = new Map([["sets", { holds: true, why: "motion maps time to position" }], ["functions", { holds: false, why: "taught later" }]]);
  const rows = toProposals(target, answer, {
    model: "sonnet",
    hash: "abc",
    verdicts,
    verifyModel: "opus",
    verifyHash: "def",
    impact: impactOf(target.id, dec),
    branchOf: new Map(nodes.map((n) => [n.slug, n.branch])),
  });
  assert.equal(rows.length, 2);
  assert.deepEqual(rows[0], {
    from_slug: "sets",
    to_slug: "kinematics",
    branch: "02-physics",
    confidence: INFERRED_CONFIDENCE_MAX,
    confidence_source: "prime_decompose_llm",
    agreement: true,
    justification: "time as a function",
    secondary_justification: "opus: motion maps time to position",
    model: "sonnet",
    prompt_hash: "abc",
    secondary_prompt_hash: "def",
    status: "pending",
    impact: 2,
    cross_branch: true,
    verification: "confirmed",
    origin: "proposer",
    refd: null,
  });
  assert.equal(rows[1].agreement, false);
  assert.equal(rows[1].verification, "refuted");
  assert.equal(rows[1].confidence, DISAGREEMENT_CONFIDENCE);
});

test("a factor the verifier never answered counts as unconfirmed", () => {
  const target = selectTargets(nodes, dec)[0];
  const rows = toProposals(target, { irreducible: false, factors: [{ slug: "sets", why: "" }], missing: [] }, {
    model: "sonnet",
    hash: "abc",
    verdicts: new Map(),
    verifyModel: "opus",
    verifyHash: null,
    impact: 0,
    branchOf: new Map(),
  });
  assert.equal(rows[0].agreement, false);
  assert.equal(rows[0].verification, "unchecked");
  assert.equal(rows[0].confidence, INFERRED_CONFIDENCE_MIN);
  assert.equal(rows[0].secondary_justification, null);
  assert.match(rows[0].justification, /named as a factor/);
});

test("impact counts the nodes resting on a target", () => {
  assert.equal(impactOf("kinematics", dec), 2);
  assert.equal(impactOf("newton", dec), 0);
});

test("the verify prompt lists each factor and the verdict parser keeps only asked slugs with a boolean", () => {
  const target = selectTargets(nodes, dec)[0];
  const factors = pool.filter((c) => c.slug === "sets" || c.slug === "functions");
  const p = buildVerifyPrompt(target, factors);
  assert.match(p, /- functions \| 01-mathematics/);
  assert.match(p, /must understand the candidate before/);
  const v = parseVerdicts('{"verdicts": [{"slug": "sets", "holds": true, "why": "x"}, {"slug": "sets", "holds": false, "why": "dup"}, {"slug": "other", "holds": true, "why": "not asked"}, {"slug": "functions", "holds": "yes", "why": "not boolean"}]}', new Set(["sets", "functions"]));
  assert.ok(!("error" in v));
  if ("error" in v) return;
  assert.deepEqual(Array.from(v.keys()), ["sets"]);
  assert.equal(v.get("sets")!.holds, true);
  assert.ok("error" in parseVerdicts("no", new Set()));
});

test("base-idea hints read the head noun of the first phrase, so neighbouring ideas do not match", () => {
  assert.equal(headNoun("Physical quantity and measurement"), "quantity");
  assert.equal(headNoun("Vector space"), "space");
  assert.equal(matchBase("Equality"), "THE SAME (equality)");
  assert.equal(matchBase("Equality / equivalence"), "THE SAME (equality)");
  assert.equal(matchBase("Causation"), "BECAUSE (cause)");
  assert.equal(matchBase("Units and measurement"), "measurement");
  assert.equal(matchBase("Collection / object"), "set");
  assert.equal(matchBase("Vector space"), null);
  assert.equal(matchBase("Physical quantity and measurement"), null);
  assert.equal(matchBase("Finite sequence / chain"), null);
  assert.equal(matchBase("Photosynthesis"), null);
});

test("missing ideas merge by key with each naming node's reason and a branch count", () => {
  const t = selectTargets(nodes, dec);
  const agg = aggregateMissing([
    { target: t[1], answer: { irreducible: false, factors: [], missing: [{ title: "the equality", branch: "01-mathematics", why: "sets need sameness" }, { title: "Cause", branch: "07-mind", why: "" }] } },
    { target: t[0], answer: { irreducible: false, factors: [], missing: [{ title: "Equality", branch: "01-mathematics", why: "position equals" }] } },
  ]);
  assert.equal(agg[0].key, "equality");
  assert.deepEqual(agg[0].targets, ["kinematics", "sets"]);
  assert.deepEqual(agg[0].reasons, { kinematics: "position equals", sets: "sets need sameness" });
  assert.deepEqual(agg[0].branches, { "01-mathematics": 2 });
  assert.deepEqual(agg[0].titles.sort(), ["Equality", "the equality"]);
  assert.equal(agg[1].key, "cause");
});

test("missing-prime keys drop slash synonyms, parentheticals, and articles", () => {
  assert.equal(missingKey("Equality / equivalence"), "equality");
  assert.equal(missingKey("Boolean truth value (true/false)"), "boolean truth value");
  assert.equal(missingKey("The concept of number"), "concept of number");
  assert.equal(missingKey("Input/output"), "input output");
});

test("groupings and people are neither targets nor factors; a reviewer-added base idea is both, so decomposition goes on below it", () => {
  const targets = selectTargets(nodes, dec).map((t) => t.slug);
  assert.ok(!targets.includes("euler-tag") && !targets.includes("bridge"));
  assert.ok(targets.includes("base-equality"));
  const by = (id: string) => nodes.find((n) => n.id === id)!;
  assert.equal(isIdea(by("kinematics")), true);
  assert.equal(isIdea(by("euler-tag")), false);
  assert.equal(isIdea(by("bridge")), false);
  assert.equal(isIdea(by("base-equality")), true);
  assert.equal(isCandidateIdea(by("base-equality")), true);
  assert.equal(isCandidateIdea(by("bridge")), false);
  assert.equal(isCandidateIdea(by("paper")), false);
});

test("stemming matches plurals and verb forms", () => {
  assert.equal(stem("vectors"), "vector");
  assert.equal(stem("theories"), "theory");
  assert.equal(stem("classes"), "class");
  assert.equal(stem("mass"), "mass");
  assert.equal(stem("modeling"), "model");
});

test("IDF weighting makes a shared rare word count more than a shared common one", () => {
  const pool = [
    { title: "Dot product of vectors" },
    { title: "Cross product of vectors" },
    { title: "Product rule for derivatives" },
    { title: "Inner product spaces" },
    { title: "Vector spaces" },
  ];
  const idf = idfOf(pool);
  const target = "Vectors and the dot and cross product";
  assert.ok(lexicalScore(target, "Vector spaces", idf) > 0);
  assert.ok(lexicalScore(target, "Vector spaces", idf) > lexicalScore(target, "Product rule for derivatives", idf));
});

test("cosine of unit vectors", () => {
  assert.equal(cosine([1, 0], [1, 0]), 1);
  assert.equal(cosine([1, 0], [0, 1]), 0);
  assert.equal(cosine([0, 0], [1, 0]), 0);
});

test("the shortlist adds semantic neighbours when vectors are given and caps each branch's base layer", () => {
  const target = selectTargets(nodes, dec).find((t) => t.slug === "lonely")!;
  const vectors = new Map<string, number[]>([
    ["lonely", [1, 0, 0]],
    ["functions", [0.9, 0.1, 0]],
    ["sets", [0, 1, 0]],
    ["newton", [0, 0, 1]],
    ["velocity", [0, 0.1, 0.9]],
  ]);
  const withVec = shortlist(target, pool, dec, { vectors, perBranch: 1, semantic: 1, lexical: 0 }).map((c) => c.slug);
  assert.ok(withVec.includes("functions"), "nearest by embedding");
  assert.ok(withVec.includes("sets") && withVec.includes("kinematics"), "one base node per branch");
  assert.ok(!withVec.includes("velocity"), "beyond the per-branch cap and not a semantic pick");
});

test("verdicts map to verification states and the shared confidence scale", () => {
  assert.equal(verificationOf({ holds: true, why: "" }), "confirmed");
  assert.equal(verificationOf({ holds: false, why: "" }), "refuted");
  assert.equal(verificationOf(undefined), "unchecked");
  assert.equal(confidenceFor("confirmed"), INFERRED_CONFIDENCE_MAX);
  assert.equal(confidenceFor("refuted"), DISAGREEMENT_CONFIDENCE);
  assert.equal(confidenceFor("unchecked"), INFERRED_CONFIDENCE_MIN);
});

test("the blinded set mixes picks with at least two passed-over candidates, and is the same on a rerun", () => {
  const target = selectTargets(nodes, dec)[0];
  const cands = shortlist(target, pool, dec);
  const picks = cands.slice(0, 1);
  const a = blindSet(target, picks, cands);
  const b = blindSet(target, picks, cands);
  assert.deepEqual(a.items.map((c) => c.slug), b.items.map((c) => c.slug));
  assert.ok(a.items.some((c) => c.slug === picks[0].slug));
  assert.equal(a.items.length, Math.min(cands.length, 1 + 2));
  assert.deepEqual(Array.from(a.picked), [picks[0].slug]);
});

test("kappa is 1 for perfect agreement, 0 at chance, and carries a bootstrap interval", () => {
  const perfect = [
    { target: "a", picked: true, holds: true },
    { target: "a", picked: false, holds: false },
    { target: "b", picked: true, holds: true },
    { target: "b", picked: false, holds: false },
  ];
  assert.equal(agreementStats(perfect).kappa, 1);
  const chance = [
    { target: "a", picked: true, holds: true },
    { target: "a", picked: true, holds: false },
    { target: "b", picked: false, holds: true },
    { target: "b", picked: false, holds: false },
  ];
  const s = agreementStats(chance);
  assert.equal(s.kappa, 0);
  assert.deepEqual(s.table, { pickedHolds: 1, pickedNot: 1, passedHolds: 1, passedNot: 1 });
  assert.ok(s.kappaInterval && s.kappaInterval[0] <= s.kappaInterval[1]);
  assert.equal(agreementStats([]).kappa, null);
});

test("consolidation keeps each id in one group, accepts same_as only from the members' nearest nodes, and adds leftover singletons", () => {
  const items = [
    { id: "causation", title: "Causation", branch: "04-information", nearest: [{ slug: "cause-node", title: "Cause and effect" }] },
    { id: "causality", title: "Causality", branch: "01-mathematics", nearest: [] },
    { id: "vector space", title: "Vector space", branch: "01-mathematics", nearest: [{ slug: "academy-01-mathematics-vector-space", title: "Vector spaces" }] },
    { id: "charge", title: "Electric charge", branch: "02-physics", nearest: [] },
  ];
  const prompt = buildConsolidatePrompt(items);
  assert.match(prompt, /- causation \| 04-information \| Causation \| nearest existing: cause-node = Cause and effect/);
  const reply = JSON.stringify({
    groups: [
      { canonical: "Causation", branch: "04-information", definition: "  One event bringing about another.  ", members: ["causation", "causality", "causation"], same_as: "invented-slug" },
      { canonical: "Vector space", branch: "01-mathematics", members: ["vector space"], same_as: "academy-01-mathematics-vector-space" },
    ],
  });
  const g = parseConsolidation(reply, items);
  assert.ok(!("error" in g));
  if ("error" in g) return;
  assert.equal(g.length, 3);
  assert.deepEqual(g[0], { canonical: "Causation", branch: "04-information", members: ["causation", "causality"], sameAs: null, definition: "One event bringing about another." });
  assert.equal(g[1].definition, null);
  assert.match(prompt, /definition: one sentence that says what the idea is/);
  assert.equal(g[1].sameAs, "academy-01-mathematics-vector-space");
  assert.deepEqual(g[2].members, ["charge"]);
});

test("consolidate turns a matched group into factors and the rest into missing primes with aliases and reasons", () => {
  const t = selectTargets(nodes, dec);
  const missing = aggregateMissing([
    { target: t[0], answer: { irreducible: false, factors: [], missing: [{ title: "Causation", branch: "04-information", why: "motion has causes" }, { title: "Vector space", branch: "01-mathematics", why: "vectors live in one" }] } },
    { target: t[1], answer: { irreducible: false, factors: [], missing: [{ title: "Causality", branch: "01-mathematics", why: "functions map causes" }] } },
  ]);
  const groups = [
    { canonical: "Causation", branch: "04-information", members: ["causation", "causality"], sameAs: null, definition: "One event bringing about another." },
    { canonical: "Vector space", branch: "01-mathematics", members: ["vector space"], sameAs: "academy-01-mathematics-vector-space", definition: null },
  ];
  const out = consolidate(groups, missing, "sonnet", () => [{ slug: "cause-node", title: "Cause and effect", similarity: 0.77 }]);
  assert.deepEqual(out.matched, [{ slug: "academy-01-mathematics-vector-space", targets: ["kinematics"], reasons: { kinematics: "vectors live in one" }, titles: ["Vector space"] }]);
  assert.equal(out.nodeProposals.length, 1);
  const r = out.nodeProposals[0];
  assert.equal(r.key, "causation");
  assert.deepEqual(r.named_by, ["kinematics", "sets"]);
  assert.deepEqual(r.aliases, ["Causality"]);
  assert.deepEqual(r.reasons, { kinematics: "motion has causes", sets: "functions map causes" });
  assert.equal(r.base_match, "BECAUSE (cause)");
  assert.equal(r.summary, "One event bringing about another.");
  assert.equal(r.possible_duplicates[0].slug, "cause-node");
});

test("a pair is in a cycle when proposals and existing edges close a loop", () => {
  const idOf = new Map(nodes.map((n) => [n.slug, n.id]));
  const existing = [pre("sets", "functions")];
  const cyc = cyclicPairs(existing, [{ from_slug: "functions", to_slug: "sets" }, { from_slug: "sets", to_slug: "kinematics" }], idOf);
  assert.ok(cyc.has("functions->sets"));
  assert.ok(!cyc.has("sets->kinematics"));
});

test("an irreducible answer keeps its reason", () => {
  const a = parseAnswer('{"irreducible": true, "irreducible_why": "Nothing simpler than sameness.", "factors": [], "missing": []}', new Set(), "t");
  assert.ok(!("error" in a) && a.irreducible && a.irreducibleWhy === "Nothing simpler than sameness.");
});

test("the answering model is the one with the most output, whatever order the usage lists", () => {
  const usage = {
    "claude-haiku-4-5-20251001": { outputTokens: 8, inputTokens: 899 },
    "claude-opus-5": { outputTokens: 52, inputTokens: 2 },
  };
  assert.equal(answeringModel(usage, "opus"), "claude-opus-5");
  assert.equal(answeringModel(undefined, "opus"), "opus");
  assert.equal(answeringModel({}, "sonnet"), "sonnet");
});

test("the kappa interval is the same whatever order the rows arrive in", () => {
  const rows = ["a", "b", "c", "d", "e"].flatMap((t, i) => [
    { target: t, picked: true, holds: i % 2 === 0 },
    { target: t, picked: false, holds: i === 3 },
    { target: t, picked: true, holds: true },
  ]);
  const shuffled = rows.slice().reverse();
  assert.deepEqual(agreementStats(rows).kappaInterval, agreementStats(shuffled).kappaInterval);
});

test("long model text ends at a sentence or a whole word", () => {
  assert.equal(clipText("  short  ", 20), "short");
  assert.equal(clipText("First sentence here. Second sentence runs on and on.", 30), "First sentence here.");
  assert.equal(clipText("one two three four five six", 12), "one two…");
  assert.equal(clipText(42, 10), "");
});

test("a node whose irreducible verdict was rejected gets a prompt with the reviewer's reason and a new hash", () => {
  const t = selectTargets(nodes, dec)[0];
  const cands = shortlist(t, pool, dec);
  const plain = buildPrompt(t, cands);
  const again = buildPrompt(t, cands, { rejectedIrreducible: "It rests on vectors." });
  const bare = buildPrompt(t, cands, { rejectedIrreducible: "" });
  assert.doesNotMatch(plain, /rejected/);
  assert.match(again, /A reviewer rejected an earlier answer that this node is irreducible, with this reason: It rests on vectors\. Name what it rests on\./);
  assert.match(bare, /A reviewer rejected an earlier answer that this node is irreducible\. Name what it rests on\./);
  assert.notEqual(promptHash(plain), promptHash(again));
  assert.equal(buildPrompt(t, cands, { rejectedIrreducible: null }), plain);
});

test("stage 5 write-back sets each verified pair's state and leaves the rest unchecked", () => {
  const row = (from: string): ProposalRow => ({
    from_slug: from, to_slug: "t", branch: "b", confidence: 0.3, confidence_source: CONFIDENCE_SOURCE, agreement: false,
    justification: "j", secondary_justification: null, model: "m", prompt_hash: "h", secondary_prompt_hash: null, status: "pending",
    impact: 0, cross_branch: false, verification: "unchecked", origin: "missing_matched", refd: null,
  });
  const rows = [row("a"), row("b"), row("c")];
  const n = applyVerdicts(rows, new Map([["a", { holds: true, why: "needed" }], ["b", { holds: false, why: "" }]]), "claude-opus-5", "vh");
  assert.equal(n, 2);
  assert.deepEqual([rows[0].verification, rows[0].confidence, rows[0].agreement, rows[0].secondary_justification], ["confirmed", 0.65, true, "claude-opus-5: needed"]);
  assert.deepEqual([rows[1].verification, rows[1].confidence, rows[1].secondary_justification], ["refuted", 0.4, "claude-opus-5: not confirmed"]);
  assert.deepEqual([rows[2].verification, rows[2].confidence, rows[2].secondary_prompt_hash], ["unchecked", 0.3, null]);
});

test("a new missing prime takes an earlier run's key at the threshold or above, and keeps its title as an alias", () => {
  const np = (key: string, title: string): NodeProposalRow => ({
    key, title, branch: "01-mathematics", justification: "", summary: null, named_by: ["t"], aliases: [], reasons: {}, possible_duplicates: [], base_match: null, model: "m",
  });
  const rows = [np("sameness", "Sameness"), np("causation", "Causation"), np("equality", "Equality")];
  const earlier = [{ key: "equality", title: "Equality" }, { key: "cause", title: "Cause" }];
  const sim: Record<string, number> = { "sameness|equality": 0.93, "sameness|cause": 0.2, "causation|cause": 0.92, "causation|equality": 0.1 };
  const n = reuseEarlierKeys(rows, earlier, (a, b) => sim[`${a}|${b}`] ?? 0, 0.93);
  assert.equal(n, 1);
  assert.deepEqual([rows[0].key, rows[0].title, rows[0].aliases], ["equality", "Equality", ["Sameness"]]);
  assert.equal(rows[1].key, "causation");
  assert.equal(rows[2].key, "equality");
});

test("an irreducible verdict inserts once, reopens a rejected row with both reasons and cleared decision fields, and leaves the rest", () => {
  const ctx = { model: "claude-sonnet-5", promptHash: "h" };
  assert.deepEqual(irreducibleAction(null, " Nothing simpler. ", ctx), { op: "insert", row: { justification: "Nothing simpler.", model: "claude-sonnet-5", prompt_hash: "h" } });
  const re = irreducibleAction({ status: "rejected", decision_reason: "It rests on vectors." }, "Still nothing simpler.", ctx);
  assert.equal(re.op, "reopen");
  if (re.op === "reopen") {
    assert.equal(re.row.justification, "Still nothing simpler. A reviewer rejected an earlier verdict: It rests on vectors.");
    assert.equal(re.row.decision_reason, null);
    assert.equal(re.row.reviewer_id, null);
    assert.equal(re.row.status, "pending");
  }
  assert.deepEqual(irreducibleAction({ status: "confirmed", decision_reason: null }, "x", ctx), { op: "skip" });
  assert.deepEqual(irreducibleAction({ status: "pending", decision_reason: null }, "x", ctx), { op: "skip" });
});

test("the base-idea hint reads past 'X as Y' and 'the law of X'", () => {
  assert.equal(matchBase("Time as an independent physical parameter"), "TIME");
  assert.equal(matchBase("Propositions as truth-bearing objects"), "TRUE (truth)");
  assert.equal(matchBase("The law of bivalence (excluded middle)"), "TRUE (truth)");
  assert.equal(matchBase("The principle of causality"), "BECAUSE (cause)");
  assert.equal(matchBase("Conservation of energy"), null);
  assert.equal(matchBase("Law of large numbers"), null);
  assert.equal(matchBase("The idea of a set"), "set");
  assert.equal(matchBase("Equality and identity"), "THE SAME (equality)");
});

test("the idea layer keeps idea-to-idea paths through evidence and drops the evidence itself", () => {
  const ns = [
    node("law", "02-physics", "law", "Rayleigh scattering law"),
    node("paper", "02-physics", "primary_source", "Rayleigh 1871", "canon_paper"),
    node("wave", "02-physics", "concept", "Wave optics"),
    node("lonely-law", "02-physics", "law", "A law on a fact"),
    node("fact", "02-physics", "fact", "The sky is blue at noon", "canon_claim"),
  ];
  // law rests on the paper, which rests on wave optics; lonely-law rests only on a fact.
  const es: DepEdge[] = [
    { fromId: "law", toId: "paper", kind: "derives_from" },
    pre("wave", "paper"),
    { fromId: "lonely-law", toId: "fact", kind: "derives_from" },
  ];
  const layer = ideaLayer(ns, es);
  assert.deepEqual(layer.nodes.map((n) => n.id).sort(), ["law", "lonely-law", "wave"]);
  assert.deepEqual(layer.edges.map((e) => `${e.fromId}->${e.toId}`), ["wave->law"]);
  const ideas = decompose(layer.nodes, layer.edges);
  assert.equal(ideas.get("law")!.status, "composite", "the law rests on wave optics through the paper");
  assert.equal(ideas.get("lonely-law")!.status, "unfactored", "an idea resting only on a fact is asked to decompose");
  assert.ok(selectTargets(ns, ideas).some((t) => t.slug === "lonely-law"));
  assert.ok(!selectTargets(ns, ideas).some((t) => t.slug === "law"));
});

test("a model alias resolves only inside its family, and a full id only to itself", () => {
  assert.equal(modelMatchesAlias("sonnet", "claude-sonnet-5"), true);
  assert.equal(modelMatchesAlias("opus", "claude-haiku-4-5-20251001"), false);
  assert.equal(modelMatchesAlias("claude-opus-5", "claude-opus-5"), true);
  assert.equal(modelMatchesAlias("claude-opus-5", "claude-opus-4"), false);
});
