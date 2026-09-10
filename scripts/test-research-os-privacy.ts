/**
 * Unit tests: the minors compliance pack's export/delete logic (bkt-ros
 * ros-07 task item 2), src/lib/research-os/privacy.ts. Every function under
 * test is pure (no I/O, no live Supabase), matching scripts/test-research-
 * os-engine-bridge.ts's own convention: node:test + node:assert, plain
 * fixture objects, no framework configured in this repo.
 *
 * Run:
 *   npx ts-node --compiler-options '{"module":"commonjs"}' scripts/test-research-os-privacy.ts
 */
import { strict as assert } from "node:assert";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  PRIVACY_TABLES,
  buildExportEnvelope,
  hashLearnerId,
  simulateLearnerDelete,
  type FixtureStore,
} from "../src/lib/research-os/privacy";

// ---------------------------------------------------------------------------
// hashLearnerId
// ---------------------------------------------------------------------------

test("hashLearnerId: deterministic for the same input", () => {
  const a = hashLearnerId("11111111-1111-1111-1111-111111111111");
  const b = hashLearnerId("11111111-1111-1111-1111-111111111111");
  assert.equal(a, b);
});

test("hashLearnerId: different inputs hash to different outputs", () => {
  const a = hashLearnerId("11111111-1111-1111-1111-111111111111");
  const b = hashLearnerId("22222222-2222-2222-2222-222222222222");
  assert.notEqual(a, b);
});

test("hashLearnerId: output is a 64-char hex sha256 digest, never the raw id", () => {
  const id = "11111111-1111-1111-1111-111111111111";
  const h = hashLearnerId(id);
  assert.match(h, /^[0-9a-f]{64}$/);
  assert.notEqual(h, id);
});

// ---------------------------------------------------------------------------
// buildExportEnvelope: "export returns only the caller's rows"
// ---------------------------------------------------------------------------

const LEARNER_A = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const LEARNER_B = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";

test("buildExportEnvelope: returns only rows matching the requested learnerId, across every table", () => {
  const rowsByLabel: Record<string, Record<string, unknown>[]> = {
    learner_node_state: [
      { learner_id: LEARNER_A, node_id: "n1", stage: "access" },
      { learner_id: LEARNER_B, node_id: "n1", stage: "production" },
    ],
    productions: [
      { learner_id: LEARNER_A, claim: "A's claim" },
      { learner_id: LEARNER_B, claim: "B's claim" },
      { learner_id: LEARNER_A, claim: "A's second claim" },
    ],
  };
  const envelope = buildExportEnvelope(rowsByLabel, LEARNER_A, "2026-09-10T00:00:00.000Z");

  assert.equal(envelope.learnerId, LEARNER_A);
  assert.equal(envelope.tables.learner_node_state.length, 1);
  assert.equal(envelope.tables.learner_node_state[0].learner_id, LEARNER_A);
  assert.equal(envelope.tables.productions.length, 2);
  assert.ok(envelope.tables.productions.every((r) => r.learner_id === LEARNER_A));
});

test("buildExportEnvelope: every PRIVACY_TABLES label is present even when the input omitted it", () => {
  const envelope = buildExportEnvelope({}, LEARNER_A, "2026-09-10T00:00:00.000Z");
  for (const cfg of PRIVACY_TABLES) {
    assert.ok(cfg.label in envelope.tables, `missing label ${cfg.label}`);
    assert.deepEqual(envelope.tables[cfg.label], []);
  }
});

test("buildExportEnvelope: a row keyed by the wrong learner column value is dropped even if the caller forgot to filter upstream", () => {
  // Simulates a defense-in-depth scenario: the DB query's own .eq() filter
  // is assumed to have failed or been forgotten; the pure function must
  // still not leak the other learner's row.
  const rowsByLabel = {
    edge_flags: [
      { learner_id: LEARNER_A, edge_id: "e1" },
      { learner_id: LEARNER_B, edge_id: "e2" },
    ],
  };
  const envelope = buildExportEnvelope(rowsByLabel, LEARNER_A, "2026-09-10T00:00:00.000Z");
  assert.deepEqual(
    envelope.tables.edge_flags.map((r) => r.edge_id),
    ["e1"],
  );
});

// ---------------------------------------------------------------------------
// simulateLearnerDelete: "delete leaves zero rows for that learner and one
// audit row; another learner's rows untouched"
// ---------------------------------------------------------------------------

function fixtureStore(): FixtureStore {
  return {
    learner_node_state: [
      { learner_id: LEARNER_A, node_id: "n1" },
      { learner_id: LEARNER_A, node_id: "n2" },
      { learner_id: LEARNER_B, node_id: "n1" },
    ],
    productions: [
      { learner_id: LEARNER_A, claim: "A's claim" },
      { learner_id: LEARNER_B, claim: "B's claim" },
    ],
    teacher_reviews: [{ learner_id: LEARNER_B, decision: "approved" }],
    edge_flags: [{ learner_id: LEARNER_A, edge_id: "e1" }],
    learner_profile: [{ learner_id: LEARNER_A, role: "student" }],
    academy_progress: [
      { user_id: LEARNER_A, branch: "02-physics" },
      { user_id: LEARNER_B, branch: "02-physics" },
    ],
    academy_profile: [{ user_id: LEARNER_A, handle: "a-handle" }],
    academy_credentials: [],
  };
}

test("simulateLearnerDelete: zero rows remain for the deleted learner across every table", () => {
  const store = fixtureStore();
  simulateLearnerDelete(store, LEARNER_A);
  for (const cfg of PRIVACY_TABLES) {
    const remaining = store[cfg.label] ?? [];
    assert.ok(
      remaining.every((r) => r[cfg.learnerColumn] !== LEARNER_A),
      `table ${cfg.label} still has a row for the deleted learner`,
    );
  }
});

test("simulateLearnerDelete: another learner's rows are untouched", () => {
  const store = fixtureStore();
  const before = JSON.parse(JSON.stringify(store.academy_progress.filter((r: Record<string, unknown>) => r.user_id === LEARNER_B)));
  simulateLearnerDelete(store, LEARNER_A);
  const after = store.academy_progress.filter((r) => r.user_id === LEARNER_B);
  assert.deepEqual(after, before);
  assert.equal(store.productions.filter((r) => r.learner_id === LEARNER_B).length, 1);
  assert.equal(store.teacher_reviews.filter((r) => r.learner_id === LEARNER_B).length, 1);
});

test("simulateLearnerDelete: writes exactly one audit row, hashed, action delete", () => {
  const store = fixtureStore();
  const result = simulateLearnerDelete(store, LEARNER_A);
  assert.equal(result.auditRowsWritten, 1);
  assert.equal(store.privacy_events?.length, 1);
  const row = store.privacy_events![0];
  assert.equal(row.action, "delete");
  assert.equal(row.learner_id_hash, hashLearnerId(LEARNER_A));
  assert.notEqual(row.learner_id_hash, LEARNER_A);
});

test("simulateLearnerDelete: reported deleted counts match what was actually removed", () => {
  const store = fixtureStore();
  const result = simulateLearnerDelete(store, LEARNER_A);
  assert.equal(result.deleted.learner_node_state, 2);
  assert.equal(result.deleted.productions, 1);
  assert.equal(result.deleted.teacher_reviews, 0);
  assert.equal(result.deleted.edge_flags, 1);
  assert.equal(result.deleted.learner_profile, 1);
  assert.equal(result.deleted.academy_progress, 1);
  assert.equal(result.deleted.academy_profile, 1);
  assert.equal(result.deleted.academy_credentials, 0);
});

test("simulateLearnerDelete: deleting a learner with no rows anywhere is a no-op, not an error", () => {
  const store = fixtureStore();
  const result = simulateLearnerDelete(store, "cccccccc-cccc-cccc-cccc-cccccccccccc");
  for (const cfg of PRIVACY_TABLES) assert.equal(result.deleted[cfg.label], 0);
  assert.equal(result.auditRowsWritten, 1, "an audit row is still written even for a no-op delete");
});

// ---------------------------------------------------------------------------
// Drift check: PRIVACY_TABLES stays in sync with the real SQL function.
// ---------------------------------------------------------------------------

test("PRIVACY_TABLES: every graph/bucket table appears as a delete statement in the migration this route's RPC lives in", () => {
  const migrationPath = join(__dirname, "..", "supabase", "migrations", "20260910040000_research_os_privacy_consent.sql");
  const sql = readFileSync(migrationPath, "utf8");
  for (const cfg of PRIVACY_TABLES) {
    const needle = `delete from ${cfg.schema}.${cfg.table}`;
    assert.ok(sql.includes(needle), `migration is missing "${needle}", PRIVACY_TABLES has drifted from graph.privacy_delete_learner`);
  }
});

test("PRIVACY_TABLES: every label is unique", () => {
  const labels = PRIVACY_TABLES.map((c) => c.label);
  assert.equal(new Set(labels).size, labels.length);
});
