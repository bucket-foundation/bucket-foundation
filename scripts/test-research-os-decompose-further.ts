/** Decompose-further queue: targets, shortlist, prompt, parsing, proposals. */
import test from "node:test";
import assert from "node:assert/strict";
import { decompose, type DepEdge } from "../src/lib/research-os/primes";
import {
  aggregateMissing,
  buildPrompt,
  buildVerifyPrompt,
  CONFIRMED_CONFIDENCE,
  impactOf,
  matchBase,
  parseAnswer,
  parseVerdicts,
  selectTargets,
  shortlist,
  toNodeProposals,
  toProposals,
  UNCONFIRMED_CONFIDENCE,
  type Candidate,
  type GraphNode,
} from "../src/lib/research-os/decompose-further";

const node = (id: string, branch: string, kind = "concept", title = id): GraphNode => ({ id, slug: id, title, kind, branch, summary: null });
const pre = (from: string, to: string): DepEdge => ({ fromId: from, toId: to, kind: "prerequisite" });

const nodes = [
  node("kinematics", "02-physics", "concept", "Kinematics, describing motion"),
  node("velocity", "02-physics", "concept", "Velocity and acceleration"),
  node("newton", "02-physics", "concept", "Newton's laws of motion"),
  node("sets", "01-mathematics", "concept", "Sets and functions"),
  node("functions", "01-mathematics", "concept", "Functions and their graphs"),
  node("lonely", "03-chemistry", "concept", "Chemical equilibrium and motion of molecules"),
  node("paper", "02-physics", "primary_source", "A paper"),
];
const edges = [pre("kinematics", "velocity"), pre("velocity", "newton"), pre("sets", "functions")];
const dec = decompose(nodes, edges);
const pool: Candidate[] = nodes.map((n) => ({ ...n, tier: dec.get(n.id)!.status === "unfactored" ? null : dec.get(n.id)!.tier, prime: dec.get(n.id)!.status === "prime" }));

test("targets are primes and unfactored ideas, primes first, sources skipped", () => {
  const t = selectTargets(nodes, dec);
  assert.deepEqual(t.map((x) => [x.slug, x.status]), [["kinematics", "prime"], ["sets", "prime"], ["lonely", "unfactored"]]);
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
    confidence: CONFIRMED_CONFIDENCE,
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
  });
  assert.equal(rows[1].agreement, false);
  assert.equal(rows[1].confidence, UNCONFIRMED_CONFIDENCE);
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

test("base ideas match the semantic primes and the foundations of mathematics", () => {
  assert.equal(matchBase("Equality"), "THE SAME (equality)");
  assert.equal(matchBase("The concept of number"), "ONE, TWO (number)");
  assert.equal(matchBase("Causation and mechanism"), "BECAUSE (cause)");
  assert.equal(matchBase("Units and measurement"), "measurement");
  assert.equal(matchBase("Photosynthesis"), null);
});

test("missing base ideas merge by normalized title and count their targets", () => {
  const t = selectTargets(nodes, dec);
  const agg = aggregateMissing([
    { target: t[0], answer: { irreducible: false, factors: [], missing: [{ title: "Equality", branch: "01-mathematics", why: "" }] } },
    { target: t[1], answer: { irreducible: false, factors: [], missing: [{ title: "the equality", branch: "01-mathematics", why: "" }, { title: "Cause", branch: "07-mind", why: "" }] } },
  ]);
  assert.equal(agg[0].key, "equality");
  assert.deepEqual(agg[0].targets, ["kinematics", "sets"]);
  assert.equal(agg[1].key, "cause");
});

test("node proposals keep the first justification, the first branch, the sorted targets, and the base match", () => {
  const t = selectTargets(nodes, dec);
  const agg = aggregateMissing([
    { target: t[1], answer: { irreducible: false, factors: [], missing: [{ title: "Equality", branch: "01-mathematics", why: "both sides name one value" }] } },
    { target: t[0], answer: { irreducible: false, factors: [], missing: [{ title: "equality", branch: "02-physics", why: "later why" }] } },
  ]);
  const rows = toNodeProposals(agg, "sonnet");
  assert.deepEqual(rows, [
    {
      key: "equality",
      title: "Equality",
      branch: "01-mathematics",
      justification: "both sides name one value",
      named_by: ["kinematics", "sets"],
      base_match: "THE SAME (equality)",
      model: "sonnet",
      status: "pending",
    },
  ]);
});
