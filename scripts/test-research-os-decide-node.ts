/** Missing-prime decisions: slug, branch choice, approve, reject, idempotence. */
import test from "node:test";
import assert from "node:assert/strict";
import { chooseBranch, decideNodeProposal, nodeSlug, type NodeProposalRecord } from "../src/lib/research-os/inference/decide-node";

const record: NodeProposalRecord = {
  status: "pending",
  key: "equality",
  title: "Equality",
  branch: "01-mathematics",
  justification: "Both sides of an equation name one value.",
  namedBy: ["kinematics", "stoichiometry"],
  baseMatch: "THE SAME (equality)",
  model: "sonnet",
};
const branchOf = new Map<string, string | null>([
  ["kinematics", "02-physics"],
  ["stoichiometry", "03-chemistry"],
]);

test("slugs are prime- plus the hyphenated key", () => {
  assert.equal(nodeSlug("equality"), "prime-equality");
  assert.equal(nodeSlug("cause and effect"), "prime-cause-and-effect");
  assert.equal(nodeSlug("!!!"), "prime-idea");
});

test("the proposer's branch wins when the graph has it, else the targets' most common branch", () => {
  const known = new Set(["01-mathematics", "02-physics"]);
  assert.equal(chooseBranch("01-mathematics", known, ["02-physics"]), "01-mathematics");
  assert.equal(chooseBranch("mathematics", known, ["02-physics", "02-physics", "03-chemistry"]), "02-physics");
  assert.equal(chooseBranch("x", known, []), "01-mathematics");
});

test("approving creates a tier-0 concept and queues unconfirmed proposals to every naming target", () => {
  const d = decideNodeProposal(record, "approved", { proposalId: "p1", branch: "01-mathematics", branchOf });
  assert.equal(d.status, "approved");
  assert.equal(d.alreadyDecided, false);
  assert.deepEqual(d.nodeToCreate, {
    slug: "prime-equality",
    title: "Equality",
    kind: "concept",
    tier: 0,
    branch: "01-mathematics",
    summary: "Both sides of an equation name one value.",
    labels: { base_idea: "THE SAME (equality)" },
    provenance: { type: "node_proposal", proposal_id: "p1", proposed_by: "prime_decompose_llm", model: "sonnet", named_by: ["kinematics", "stoichiometry"] },
  });
  assert.equal(d.edgeProposals!.length, 2);
  const e = d.edgeProposals![0];
  assert.equal(e.from_slug, "prime-equality");
  assert.equal(e.to_slug, "kinematics");
  assert.equal(e.branch, "02-physics");
  assert.equal(e.agreement, false);
  assert.equal(e.cross_branch, true);
  assert.equal(e.status, "pending");
});

test("rejecting writes nothing and a decided proposal stays decided", () => {
  const r = decideNodeProposal(record, "rejected", { proposalId: "p1", branch: "01-mathematics", branchOf });
  assert.deepEqual(r, { status: "rejected", alreadyDecided: false });
  const again = decideNodeProposal({ ...record, status: "approved" }, "rejected", { proposalId: "p1", branch: "01-mathematics", branchOf });
  assert.deepEqual(again, { status: "approved", alreadyDecided: true });
});
