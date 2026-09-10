/**
 * Unit tests: the teacher class view and the Production accept path
 * (bkt-ros, ros-06), src/lib/research-os/class-view.ts,
 * src/lib/research-os/reviewer.ts's isReviewerEmail, and
 * src/lib/research-os/stages.ts's onProductionReview composed with the
 * real (unmodified) src/lib/research-os/engine-bridge.ts's
 * buildProductionOutboxRow. No database: matching every other
 * scripts/test-research-os-*.ts file's convention (node:test +
 * node:assert, no framework configured in this repo), the class grid and
 * blocked/ready computations run against plain fixture arrays, and the
 * "accept path reaches the outbox" test proves the *shape* the accept path
 * produces is exactly what the real, unmodified outbox builder accepts --
 * writeProductionOutbox itself (a live Supabase upsert) is out of reach of
 * this no-DB test suite, same as every other DB-touching function in this
 * repo; see learning/research-os/TEACHER-LAYER.md, "What this suite does
 * not cover."
 *
 * Run:
 *   npx ts-node --compiler-options '{"module":"commonjs"}' scripts/test-research-os-teacher-class.ts
 */
import { strict as assert } from "node:assert";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { seedPathOrder, buildClassGrid, findBlockedLearners, findReadyForHarderTarget } from "../src/lib/research-os/class-view";
import type { GraphNode, GraphEdge, LearnerNodeState, Stage } from "../src/lib/research-os/types";
import { isReviewerEmail } from "../src/lib/research-os/reviewer";
import { onProductionReview, onProductionReturned } from "../src/lib/research-os/stages";
import { buildProductionOutboxRow, type GraphProductionRow } from "../src/lib/research-os/engine-bridge";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const SEED_PATH = join(__dirname, "..", "supabase", "seed", "research-os-sky-blue.json");

interface SeedNode {
  slug: string;
  title: string;
  kind: GraphNode["kind"];
  tier: number;
  branch: string;
  summary: string;
}
interface SeedEdge {
  from: string;
  to: string;
  kind: GraphEdge["kind"];
}
interface Seed {
  target_slug: string;
  nodes: SeedNode[];
  edges: SeedEdge[];
}

function loadSeedGraph(): { nodes: GraphNode[]; edges: GraphEdge[]; targetId: string } {
  const seed = JSON.parse(readFileSync(SEED_PATH, "utf8")) as Seed;
  const nodes: GraphNode[] = seed.nodes.map((n) => ({ id: n.slug, slug: n.slug, title: n.title, kind: n.kind, tier: n.tier, branch: n.branch, summary: n.summary }));
  const edges: GraphEdge[] = seed.edges.map((e) => ({ fromId: e.from, toId: e.to, kind: e.kind }));
  return { nodes, edges, targetId: seed.target_slug };
}

function state(nodeId: string, stage: Stage, updatedAt?: string): LearnerNodeState {
  return { nodeId, stage, updatedAt };
}

// A small hand-traceable graph for the blocked/ready computations: A and Y
// are roots; B depends on A; Z depends on both X and Y; W depends on Z.
function synthNode(id: string, title = id): GraphNode {
  return { id, slug: id, title, kind: "concept", tier: 5, branch: "test", summary: null };
}
const SYNTH_NODES: GraphNode[] = ["A", "B", "C", "X", "Y", "Z", "W"].map((id) => synthNode(id));
const SYNTH_EDGES: GraphEdge[] = [
  { fromId: "A", toId: "B", kind: "prerequisite" },
  { fromId: "B", toId: "C", kind: "prerequisite" },
  { fromId: "X", toId: "Z", kind: "prerequisite" },
  { fromId: "Y", toId: "Z", kind: "prerequisite" },
  { fromId: "Z", toId: "W", kind: "prerequisite" },
];

const NOW = new Date("2026-09-10T00:00:00Z");
function daysAgo(n: number): string {
  return new Date(NOW.getTime() - n * 24 * 60 * 60 * 1000).toISOString();
}

// ---------------------------------------------------------------------------
// A fixture class of three learners on the real seed path
// ---------------------------------------------------------------------------

test("seedPathOrder: the real seed path has 19 K-12 nodes (the canon-bridge tier-90 nodes are not prerequisite-reachable from the target)", () => {
  const { nodes, edges, targetId } = loadSeedGraph();
  const path = seedPathOrder(nodes, edges, targetId);
  assert.equal(path.length, 19);
  assert.ok(path.every((n) => n.tier < 90), "no canon-bridge node on the seed path");
  assert.equal(path[path.length - 1].slug, "why-the-sky-is-blue", "target is last, forward order");
});

test("buildClassGrid: a fixture class of three learners on the seed path", () => {
  const { nodes, edges, targetId } = loadSeedGraph();
  const path = seedPathOrder(nodes, edges, targetId);

  const statesByLearner = new Map<string, LearnerNodeState[]>([
    ["learner-fresh", []], // no records at all
    ["learner-midpath", [state("light-travels-in-straight-lines", "internalization", daysAgo(30)), state("light-can-scatter-off-small-things", "awareness", daysAgo(10))]],
    ["learner-near-done", path.slice(0, -1).map((n) => state(n.id, "internalization", daysAgo(1)))], // everything but the target itself
  ]);

  const grid = buildClassGrid(path, ["learner-fresh", "learner-midpath", "learner-near-done"], statesByLearner);
  assert.equal(grid.path.length, 19);
  assert.equal(grid.rows.length, 3);

  const fresh = grid.rows.find((r) => r.learnerId === "learner-fresh")!;
  assert.ok(fresh.cells.every((c) => c.stage === "access" && c.updatedAt === null), "no record reads as access, no timestamp");

  const midpath = grid.rows.find((r) => r.learnerId === "learner-midpath")!;
  const scatterCell = midpath.cells.find((c) => c.nodeId === "light-can-scatter-off-small-things")!;
  assert.equal(scatterCell.stage, "awareness");
  assert.equal(scatterCell.updatedAt, daysAgo(10));

  const nearDone = grid.rows.find((r) => r.learnerId === "learner-near-done")!;
  assert.equal(nearDone.cells.find((c) => c.nodeId === "light-travels-in-straight-lines")!.stage, "internalization");
  assert.equal(nearDone.cells.find((c) => c.nodeId === "why-the-sky-is-blue")!.stage, "access", "the target itself was left unstarted on purpose");
});

// ---------------------------------------------------------------------------
// Blocked
// ---------------------------------------------------------------------------

test("findBlockedLearners: a below-Understanding node stale past the threshold is blocked", () => {
  const states: LearnerNodeState[] = [state("A", "understanding", daysAgo(60)), state("B", "awareness", daysAgo(10))];
  const byLearner = new Map([["l1", states]]);
  const out = findBlockedLearners(SYNTH_NODES, SYNTH_EDGES, "C", ["l1"], byLearner, NOW, 3);
  assert.equal(out.length, 1);
  assert.equal(out[0].nodeId, "B");
  assert.equal(out[0].stage, "awareness");
  assert.equal(out[0].staleDays, 10);
});

test("findBlockedLearners: the same node NOT yet stale past the threshold is not blocked", () => {
  const states: LearnerNodeState[] = [state("A", "understanding", daysAgo(60)), state("B", "awareness", daysAgo(1))];
  const byLearner = new Map([["l1", states]]);
  const out = findBlockedLearners(SYNTH_NODES, SYNTH_EDGES, "C", ["l1"], byLearner, NOW, 3);
  assert.equal(out.length, 0);
});

test("findBlockedLearners: a next node with NO record at all is 'not started', not blocked, even with an old `now`", () => {
  const states: LearnerNodeState[] = [state("A", "understanding", daysAgo(60))]; // B has no record
  const byLearner = new Map([["l1", states]]);
  const out = findBlockedLearners(SYNTH_NODES, SYNTH_EDGES, "C", ["l1"], byLearner, NOW, 3);
  assert.equal(out.length, 0);
});

test("findBlockedLearners: a node already at Understanding or above is never blocked", () => {
  const states: LearnerNodeState[] = [state("A", "understanding", daysAgo(60)), state("B", "understanding", daysAgo(90))];
  const byLearner = new Map([["l1", states]]);
  const out = findBlockedLearners(SYNTH_NODES, SYNTH_EDGES, "C", ["l1"], byLearner, NOW, 3);
  assert.equal(out.length, 0);
});

// ---------------------------------------------------------------------------
// Ready for a harder target
// ---------------------------------------------------------------------------

test("findReadyForHarderTarget: every prerequisite at internalization, node unstarted -> ready", () => {
  const states: LearnerNodeState[] = [state("X", "internalization"), state("Y", "internalization")];
  const byLearner = new Map([["l1", states]]);
  const out = findReadyForHarderTarget(SYNTH_NODES, SYNTH_EDGES, ["l1"], byLearner);
  assert.deepEqual(
    out.map((r) => r.nodeId).sort(),
    ["Z"],
  );
});

test("findReadyForHarderTarget: one prerequisite below internalization -> not ready", () => {
  const states: LearnerNodeState[] = [state("X", "internalization"), state("Y", "understanding")];
  const byLearner = new Map([["l1", states]]);
  const out = findReadyForHarderTarget(SYNTH_NODES, SYNTH_EDGES, ["l1"], byLearner);
  assert.equal(out.length, 0);
});

test("findReadyForHarderTarget: a node the learner already started is excluded even if every prerequisite qualifies", () => {
  const states: LearnerNodeState[] = [state("X", "internalization"), state("Y", "internalization"), state("Z", "access")];
  const byLearner = new Map([["l1", states]]);
  const out = findReadyForHarderTarget(SYNTH_NODES, SYNTH_EDGES, ["l1"], byLearner);
  assert.equal(out.length, 0);
});

test("findReadyForHarderTarget: a root node never qualifies (nothing to have already cleared)", () => {
  const byLearner = new Map([["l1", [] as LearnerNodeState[]]]);
  const out = findReadyForHarderTarget(SYNTH_NODES, SYNTH_EDGES, ["l1"], byLearner);
  assert.ok(!out.some((r) => r.nodeId === "A" || r.nodeId === "X" || r.nodeId === "Y"));
});

// ---------------------------------------------------------------------------
// Reviewer gate rejects a non-reviewer
// ---------------------------------------------------------------------------

test("isReviewerEmail: allows an address on RESEARCH_OS_REVIEWER_EMAILS, rejects one that is not", () => {
  const prior = process.env.RESEARCH_OS_REVIEWER_EMAILS;
  process.env.RESEARCH_OS_REVIEWER_EMAILS = "teacher@school.example, Second.Teacher@School.example";
  try {
    assert.equal(isReviewerEmail("teacher@school.example"), true);
    assert.equal(isReviewerEmail("TEACHER@SCHOOL.EXAMPLE"), true, "case-insensitive");
    assert.equal(isReviewerEmail(" second.teacher@school.example "), true, "trims whitespace");
    assert.equal(isReviewerEmail("student@school.example"), false, "a non-reviewer is rejected");
  } finally {
    if (prior === undefined) delete process.env.RESEARCH_OS_REVIEWER_EMAILS;
    else process.env.RESEARCH_OS_REVIEWER_EMAILS = prior;
  }
});

test("isReviewerEmail: an unset or empty allowlist rejects every email (fails closed)", () => {
  const prior = process.env.RESEARCH_OS_REVIEWER_EMAILS;
  delete process.env.RESEARCH_OS_REVIEWER_EMAILS;
  try {
    assert.equal(isReviewerEmail("teacher@school.example"), false);
  } finally {
    if (prior === undefined) delete process.env.RESEARCH_OS_REVIEWER_EMAILS;
    else process.env.RESEARCH_OS_REVIEWER_EMAILS = prior;
  }
});

// ---------------------------------------------------------------------------
// Accept path end to end through the outbox row
// ---------------------------------------------------------------------------

test("onProductionReview: an approval re-affirms `production` and logs a teacher_review evidence event, with fromStage/toStage/reviewId", () => {
  const transition = onProductionReview("reviewer-1", "clean write-up, cites the law correctly", "review-1");
  assert.equal(transition.nextStage, "production");
  assert.equal(transition.event.kind, "teacher_review");
  assert.equal(transition.event.reviewerId, "reviewer-1");
  assert.equal(transition.event.note, "clean write-up, cites the law correctly");
  assert.equal(transition.event.fromStage, "production");
  assert.equal(transition.event.toStage, "production");
  assert.equal(transition.event.reviewId, "review-1");
});

test("onProductionReturned: a return keeps `stage` at 'production' (high-water mark, never backward) but logs the correction as its own evidence kind", () => {
  const transition = onProductionReturned("reviewer-1", "citation is not from a primary source", "review-2");
  assert.equal(transition.nextStage, "production", "stage does not move backward on a return");
  assert.equal(transition.event.kind, "production_returned");
  assert.equal(transition.event.held, true);
  assert.equal(transition.event.heldReason, "citation is not from a primary source");
  assert.equal(transition.event.fromStage, "production");
  assert.equal(transition.event.toStage, "production");
  assert.equal(transition.event.reviewId, "review-2");
});

test("accept path: a production the review route just flipped to 'accepted' passes through the REAL, unmodified buildProductionOutboxRow", () => {
  const acceptedRow: GraphProductionRow = {
    id: "prod-1",
    target_node_id: "why-the-sky-is-blue",
    claim: "The sky is blue because short wavelengths scatter more.",
    evidence: [{ nodeId: "rayleigh-scattering-law", quote: "..." }],
    sources: [{ label: "Rayleigh 1871" }],
    status: "accepted", // the review route's own decision sets this field, ahead of this test
    created_at: "2026-09-01T00:00:00Z",
    updated_at: "2026-09-10T00:00:00Z",
  };
  const targetNode = { slug: "why-the-sky-is-blue", title: "Why is the sky blue?", tier: 10, branch: "02-physics" };
  const outboxRow = buildProductionOutboxRow(acceptedRow, targetNode);
  assert.equal(outboxRow.id, "prod-1");
  assert.equal(outboxRow.status, "accepted");
  assert.equal(outboxRow.target_node_id, "why-the-sky-is-blue");
  assert.deepEqual(outboxRow._target_node, targetNode);
});

test("accept path: a RETURNED production (status back to 'draft') never reaches the outbox builder -- it throws, matching the review route's own guard", () => {
  const returnedRow: GraphProductionRow = {
    id: "prod-2",
    target_node_id: "why-the-sky-is-blue",
    claim: "draft claim",
    evidence: [],
    sources: [],
    status: "draft", // the review route's own "returned -> draft" contract
    created_at: "2026-09-01T00:00:00Z",
  };
  assert.throws(() => buildProductionOutboxRow(returnedRow, null), /not accepted/);
});

// ---------------------------------------------------------------------------
// RLS scoping (static: this repo runs no test against a live Postgres; see
// the file header. This asserts the migration text declares the scoping
// this PR's own header describes, catching a regression that silently
// drops a policy or RLS itself.)
// ---------------------------------------------------------------------------

const CLASSES_MIGRATION = join(__dirname, "..", "supabase", "migrations", "20260910030000_research_os_classes.sql");

test("RLS scoping: graph.classes and graph.class_members enable RLS with reviewer/learner-scoped policies", () => {
  const sql = readFileSync(CLASSES_MIGRATION, "utf8");
  assert.match(sql, /alter table graph\.classes enable row level security/);
  assert.match(sql, /alter table graph\.class_members enable row level security/);
  assert.match(sql, /create policy reviewer_select on graph\.classes for select[\s\S]*?reviewer_email/);
  assert.match(sql, /create policy own_select on graph\.class_members for select[\s\S]*?auth\.uid\(\)\s*=\s*learner_id/);
  assert.match(sql, /create policy reviewer_select on graph\.class_members for select[\s\S]*?c\.reviewer_email/, "a reviewer's class-member read is scoped through graph.classes.reviewer_email, not open to every signed-in user");
});
