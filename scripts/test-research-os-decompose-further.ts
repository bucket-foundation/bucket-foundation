/** Decompose-further queue: targets, shortlist, prompt, parsing, proposals. */
import test from "node:test";
import assert from "node:assert/strict";
import { decompose, type DepEdge } from "../src/lib/research-os/primes";
import {
  aggregateMissing,
  buildPrompt,
  parseAnswer,
  PROPOSAL_CONFIDENCE,
  selectTargets,
  shortlist,
  toProposals,
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

test("proposals are pending prerequisite rows from each factor to the target", () => {
  const target = selectTargets(nodes, dec)[0];
  const rows = toProposals(target, { irreducible: false, factors: [{ slug: "sets", why: "time as a function" }], missing: [] }, "sonnet", "abc");
  assert.deepEqual(rows, [
    {
      from_slug: "sets",
      to_slug: "kinematics",
      branch: "02-physics",
      confidence: PROPOSAL_CONFIDENCE,
      confidence_source: "prime_decompose_llm",
      agreement: null,
      justification: "time as a function",
      model: "sonnet",
      prompt_hash: "abc",
      status: "pending",
    },
  ]);
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
