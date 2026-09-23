import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { decideEdgeProposal, TEACHER_APPROVED_CONFIDENCE, type EdgeProposalRecord } from "../src/lib/research-os/inference/decide";
import { isGraphReviewer, isReviewerEmail } from "../src/lib/research-os/reviewer";

function pending(): EdgeProposalRecord {
  return { status: "pending", fromSlug: "wavefunction", toSlug: "uncertainty" };
}

test("decideEdgeProposal: approving a pending proposal writes a teacher-confidence prerequisite edge", () => {
  const outcome = decideEdgeProposal(pending(), "approved");
  assert.equal(outcome.alreadyDecided, false);
  assert.equal(outcome.status, "approved");
  assert.deepEqual(outcome.edgeToWrite, {
    fromSlug: "wavefunction",
    toSlug: "uncertainty",
    kind: "prerequisite",
    confidence: TEACHER_APPROVED_CONFIDENCE,
    confidenceSource: "teacher",
  });
});

test("decideEdgeProposal: TEACHER_APPROVED_CONFIDENCE stays below full confidence, above canon_map's 0.9 curator tier", () => {
  assert.equal(TEACHER_APPROVED_CONFIDENCE, 0.95);
  assert.ok(TEACHER_APPROVED_CONFIDENCE < 1.0);
  assert.ok(TEACHER_APPROVED_CONFIDENCE > 0.9);
});

test("decideEdgeProposal: rejecting a pending proposal writes no edge", () => {
  const outcome = decideEdgeProposal(pending(), "rejected");
  assert.equal(outcome.alreadyDecided, false);
  assert.equal(outcome.status, "rejected");
  assert.equal(outcome.edgeToWrite, null);
});

test("decideEdgeProposal: re-approving an already-approved proposal is idempotent, no second edge", () => {
  const already: EdgeProposalRecord = { status: "approved", fromSlug: "wavefunction", toSlug: "uncertainty" };
  const outcome = decideEdgeProposal(already, "approved");
  assert.equal(outcome.alreadyDecided, true);
  assert.equal(outcome.status, "approved");
  assert.equal(outcome.edgeToWrite, null, "an already-decided proposal never re-triggers an edge write");
});

test("decideEdgeProposal: rejecting an already-rejected proposal is idempotent", () => {
  const already: EdgeProposalRecord = { status: "rejected", fromSlug: "wavefunction", toSlug: "uncertainty" };
  const outcome = decideEdgeProposal(already, "rejected");
  assert.equal(outcome.alreadyDecided, true);
  assert.equal(outcome.status, "rejected");
});

test("decideEdgeProposal: an already-rejected proposal cannot be flipped to approved by a later call", () => {
  const already: EdgeProposalRecord = { status: "rejected", fromSlug: "wavefunction", toSlug: "uncertainty" };
  const outcome = decideEdgeProposal(already, "approved");
  assert.equal(outcome.alreadyDecided, true);
  assert.equal(outcome.status, "rejected", "the recorded decision wins, not the new request");
  assert.equal(outcome.edgeToWrite, null);
});

test("isReviewerEmail: /research-os/edges shares the same allowlist gate as /research-os/review", () => {
  const prior = process.env.RESEARCH_OS_REVIEWER_EMAILS;
  process.env.RESEARCH_OS_REVIEWER_EMAILS = "reviewer@school.example";
  try {
    assert.equal(isReviewerEmail("reviewer@school.example"), true);
    assert.equal(isReviewerEmail("learner@school.example"), false, "a non-reviewer must be rejected -- route.ts turns this into a 403");
  } finally {
    if (prior === undefined) delete process.env.RESEARCH_OS_REVIEWER_EMAILS;
    else process.env.RESEARCH_OS_REVIEWER_EMAILS = prior;
  }
});

test("isReviewerEmail: an unset allowlist fails closed for the edges route too", () => {
  const prior = process.env.RESEARCH_OS_REVIEWER_EMAILS;
  delete process.env.RESEARCH_OS_REVIEWER_EMAILS;
  try {
    assert.equal(isReviewerEmail("anyone@school.example"), false);
  } finally {
    if (prior === undefined) delete process.env.RESEARCH_OS_REVIEWER_EMAILS;
    else process.env.RESEARCH_OS_REVIEWER_EMAILS = prior;
  }
});

const EDGE_PROPOSALS_MIGRATION = join(__dirname, "..", "supabase", "migrations", "20260910050001_research_os_edge_proposals.sql");

test("graph.edge_proposals migration: RLS enabled, pair uniqueness, and a closed status enum", () => {
  const sql = readFileSync(EDGE_PROPOSALS_MIGRATION, "utf8");
  assert.match(sql, /create table if not exists graph\.edge_proposals/);
  assert.match(sql, /constraint graph_edge_proposals_pair_uidx unique \(from_slug, to_slug\)/, "one proposal row per pair, so a re-run never duplicates a queued or decided row");
  assert.match(sql, /status\s+text\s+not null default 'pending' check \(status in \('pending', 'approved', 'rejected'\)\)/);
  assert.match(sql, /confidence_source\s+text\s+not null default 'inferred_llm' check \(confidence_source = 'inferred_llm'\)/);
  assert.match(sql, /alter table graph\.edge_proposals enable row level security/);
  assert.doesNotMatch(sql, /create policy .* on graph\.edge_proposals/, "no client-facing policy: every access goes through the service-role client, gated by reviewer.ts");
});

test("decideEdgeProposal: approving as derives_from runs the edge from the target to the factor", () => {
  const outcome = decideEdgeProposal(pending(), "approved", "derives_from");
  const p = pending();
  assert.equal(outcome.edgeToWrite?.kind, "derives_from");
  assert.equal(outcome.edgeToWrite?.fromSlug, p.toSlug);
  assert.equal(outcome.edgeToWrite?.toSlug, p.fromSlug);
  assert.equal(outcome.edgeToWrite?.confidence, TEACHER_APPROVED_CONFIDENCE);
});

test("isGraphReviewer: only the allowlist changes the graph, whatever classes the person teaches", () => {
  const prior = process.env.RESEARCH_OS_REVIEWER_EMAILS;
  process.env.RESEARCH_OS_REVIEWER_EMAILS = "reviewer@school.example";
  try {
    assert.deepEqual(isGraphReviewer({ id: "u1", email: "Reviewer@School.example" }), { id: "u1", email: "Reviewer@School.example" });
    assert.equal(isGraphReviewer({ id: "u2", email: "teacher@school.example" }), null);
    assert.equal(isGraphReviewer({ id: "u3", email: null }), null);
    assert.equal(isGraphReviewer(null), null);
    delete process.env.RESEARCH_OS_REVIEWER_EMAILS;
    assert.equal(isGraphReviewer({ id: "u1", email: "reviewer@school.example" }), null);
  } finally {
    if (prior === undefined) delete process.env.RESEARCH_OS_REVIEWER_EMAILS;
    else process.env.RESEARCH_OS_REVIEWER_EMAILS = prior;
  }
});

test("every route that changes the graph through review uses the allowlist gate", () => {
  for (const route of ["edges", "node-proposals", "irreducible", "makeup"]) {
    const src = readFileSync(join(__dirname, "..", "src", "app", "api", "research-os", route, "route.ts"), "utf8");
    assert.match(src, /verifyGraphReviewer\(req\)/, `${route} checks the graph reviewer`);
    assert.doesNotMatch(src, /\bverifyReviewer\(/, `${route} does not use the teacher gate`);
  }
});
