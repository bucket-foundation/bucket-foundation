/** Missing-prime decisions: slug, branch and tier choice, approve, reject, idempotence, overrides. */
import test from "node:test";
import assert from "node:assert/strict";
import { confidenceFor } from "../src/lib/research-os/decompose-further";
import { chooseBranch, chooseTier, decideNodeProposal, DEFAULT_TIER, nodeSlug, type NodeProposalRecord } from "../src/lib/research-os/inference/decide-node";

const record: NodeProposalRecord = {
  status: "pending",
  key: "equality",
  title: "Equality",
  branch: "01-mathematics",
  justification: "Both sides of an equation name one value.",
  namedBy: ["kinematics", "stoichiometry"],
  aliases: ["Equality / equivalence"],
  reasons: { kinematics: "Position equals the integral of velocity.", stoichiometry: "A balanced equation equates atoms on both sides." },
  baseMatch: "THE SAME (equality)",
  model: "sonnet",
};
const branchOf = new Map<string, string | null>([
  ["kinematics", "02-physics"],
  ["stoichiometry", "03-chemistry"],
]);
const tierOf = new Map<string, number | null>([
  ["kinematics", 14],
  ["stoichiometry", 15],
]);
const ctx = { proposalId: "p1", branch: "01-mathematics", branchOf, tierOf, impactOf: new Map([["kinematics", 52]]) };

test("slugs are concept- plus the hyphenated key", () => {
  assert.equal(nodeSlug("equality"), "concept-equality");
  assert.equal(nodeSlug("cause and effect"), "concept-cause-and-effect");
  assert.equal(nodeSlug("!!!"), "concept-idea");
});

test("the proposer's branch wins when the graph has it, else the targets' most common branch", () => {
  const known = new Set(["01-mathematics", "02-physics"]);
  assert.equal(chooseBranch("01-mathematics", known, ["02-physics"]), "01-mathematics");
  assert.equal(chooseBranch("mathematics", known, ["02-physics", "02-physics", "03-chemistry"]), "02-physics");
  assert.equal(chooseBranch("x", known, []), "01-mathematics");
});

test("a base idea takes the lowest grade tier among its naming nodes", () => {
  assert.equal(chooseTier([14, 15, null]), 14);
  assert.equal(chooseTier([]), DEFAULT_TIER);
  assert.equal(chooseTier([undefined, null]), DEFAULT_TIER);
});

test("approving creates a concept at the naming nodes' grade tier with locale labels, and queues unchecked proposals with each node's reason", () => {
  const d = decideNodeProposal(record, "approved", ctx);
  assert.equal(d.status, "approved");
  assert.equal(d.alreadyDecided, false);
  const n = d.nodeToCreate!;
  assert.equal(n.slug, "concept-equality");
  assert.equal(n.tier, 14);
  assert.equal(n.kind, "concept");
  assert.deepEqual(n.labels, { en: { title: "Equality", summary: "Both sides of an equation name one value." } });
  assert.equal(n.provenance.type, "node_proposal");
  assert.equal(n.provenance.base_idea_hint, "THE SAME (equality)");
  assert.deepEqual(n.provenance.aliases, ["Equality / equivalence"]);
  const [e1, e2] = d.edgeProposals!;
  assert.equal(e1.from_slug, "concept-equality");
  assert.equal(e1.to_slug, "kinematics");
  assert.equal(e1.justification, "Position equals the integral of velocity.");
  assert.equal(e1.verification, "unchecked");
  assert.equal(e1.origin, "base_idea");
  assert.equal(e1.confidence, confidenceFor("unchecked"));
  assert.equal(e1.impact, 52);
  assert.equal(e1.cross_branch, true);
  assert.equal(e2.impact, 0);
});

test("the reviewer's title, summary and branch override the proposal's", () => {
  const d = decideNodeProposal(record, "approved", { ...ctx, overrides: { title: "Equality (=)", summary: "Two expressions name one value.", branch: "02-physics" } });
  assert.equal(d.nodeToCreate!.title, "Equality (=)");
  assert.equal(d.nodeToCreate!.summary, "Two expressions name one value.");
  assert.equal(d.nodeToCreate!.branch, "02-physics");
  assert.equal(d.edgeProposals![0].cross_branch, false);
});

test("rejecting writes nothing and a decided proposal stays decided", () => {
  assert.deepEqual(decideNodeProposal(record, "rejected", ctx), { status: "rejected", alreadyDecided: false });
  assert.deepEqual(decideNodeProposal({ ...record, status: "approved" }, "rejected", ctx), { status: "approved", alreadyDecided: true });
});
